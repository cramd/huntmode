import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { AIProvider, UsageEvent, UsageFeature } from "@/lib/types";

export type TrackUsageMetadata = {
  feature: UsageFeature;
  modelId?: string;
  applicationId?: string;
};

type ModelRates = { inputPer1M: number; outputPer1M: number };

/** Approximate USD per 1M tokens — update when provider pricing changes. */
const MODEL_RATES: Record<string, ModelRates> = {
  "gemini-3.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-3.1-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-flash-latest": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "claude-sonnet-4-6": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-sonnet-4-5-20250929": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "gpt-4o": { inputPer1M: 5.0, outputPer1M: 15.0 },
};

const PROVIDER_DEFAULT_RATES: Record<string, ModelRates> = {
  google: { inputPer1M: 0.075, outputPer1M: 0.3 },
  anthropic: { inputPer1M: 3.0, outputPer1M: 15.0 },
  openai: { inputPer1M: 5.0, outputPer1M: 15.0 },
};

function resolveRates(provider: string, modelId?: string): ModelRates {
  if (modelId && MODEL_RATES[modelId]) {
    return MODEL_RATES[modelId];
  }
  return PROVIDER_DEFAULT_RATES[provider] ?? PROVIDER_DEFAULT_RATES.openai;
}

export function calculateCost(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  modelId?: string
): number {
  const { inputPer1M, outputPer1M } = resolveRates(provider, modelId);
  return (
    (inputTokens / 1_000_000) * inputPer1M +
    (outputTokens / 1_000_000) * outputPer1M
  );
}

export async function trackTokenUsage(
  uid: string,
  provider: string,
  inputTokens: number,
  outputTokens: number,
  metadata: TrackUsageMetadata
): Promise<void> {
  if (!uid) return;

  const totalTokens = inputTokens + outputTokens;
  if (totalTokens <= 0) return;

  const costUsd = calculateCost(provider, inputTokens, outputTokens, metadata.modelId);
  const normalizedProvider = (provider || "openai") as AIProvider;
  const resolvedModelId = metadata.modelId || PROVIDER_DEFAULT_MODEL[normalizedProvider];

  const event: Omit<UsageEvent, "id"> = {
    createdAt: new Date().toISOString(),
    feature: metadata.feature,
    provider: normalizedProvider,
    modelId: resolvedModelId,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: costUsd,
    ...(metadata.applicationId ? { applicationId: metadata.applicationId } : {}),
  };

  try {
    const profileRef = adminDb.collection("users").doc(uid).collection("profile").doc("data");
    const eventsRef = adminDb.collection("users").doc(uid).collection("usageEvents");

    await Promise.all([
      profileRef.update({
        totalTokensUsed: FieldValue.increment(totalTokens),
        totalEstimatedCostUsd: FieldValue.increment(costUsd),
      }),
      eventsRef.add({
        ...event,
        createdAt: Timestamp.fromDate(new Date(event.createdAt)),
      }),
    ]);

    console.log(
      `[Cost Tracker] ${metadata.feature} ${totalTokens} tokens ($${costUsd.toFixed(5)}) model=${resolvedModelId} uid=${uid}`
    );
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 5) {
      try {
        const profileRef = adminDb.collection("users").doc(uid).collection("profile").doc("data");
        const eventsRef = adminDb.collection("users").doc(uid).collection("usageEvents");
        await Promise.all([
          profileRef.set(
            {
              totalTokensUsed: totalTokens,
              totalEstimatedCostUsd: costUsd,
            },
            { merge: true }
          ),
          eventsRef.add({
            ...event,
            createdAt: Timestamp.fromDate(new Date(event.createdAt)),
          }),
        ]);
        console.log(
          `[Cost Tracker] Initialized ${metadata.feature} ${totalTokens} tokens ($${costUsd.toFixed(5)}) for ${uid}`
        );
      } catch (initErr) {
        console.error(`[Cost Tracker] Failed to initialize usage for ${uid}:`, initErr);
      }
    } else {
      console.error(`[Cost Tracker] Failed to update usage for ${uid}:`, error);
    }
  }
}

const PROVIDER_DEFAULT_MODEL: Record<AIProvider, string> = {
  google: "gemini-3.5-flash",
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

