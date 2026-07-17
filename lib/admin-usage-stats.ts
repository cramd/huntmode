import { adminDb } from "@/lib/firebase-admin";
import type { UsageFeature } from "@/lib/types";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";

export type UsageRollupRow = {
  feature: UsageFeature;
  provider: string;
  eventCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AdminUsageSummary = {
  days: number;
  since: string;
  totalEvents: number;
  totalTokens: number;
  estimatedCostUsd: number;
  byFeature: UsageRollupRow[];
  byProvider: { provider: string; eventCount: number; totalTokens: number; estimatedCostUsd: number }[];
};

const DEFAULT_ROLLUP_DAYS = 30;

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
}

export async function getAdminUsageSummary(days = DEFAULT_ROLLUP_DAYS): Promise<AdminUsageSummary> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceTs = Timestamp.fromDate(sinceDate);

  const snapshot = await adminDb
    .collectionGroup("usageEvents")
    .where("createdAt", ">=", sinceTs)
    .get();

  const featureMap = new Map<string, UsageRollupRow>();
  const providerMap = new Map<string, { provider: string; eventCount: number; totalTokens: number; estimatedCostUsd: number }>();

  let totalTokens = 0;
  let estimatedCostUsd = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const feature = (typeof data.feature === "string" ? data.feature : "unknown") as UsageFeature;
    const provider = typeof data.provider === "string" ? data.provider : "unknown";
    const tokens = typeof data.totalTokens === "number" ? data.totalTokens : 0;
    const cost = typeof data.estimatedCostUsd === "number" ? data.estimatedCostUsd : 0;

    totalTokens += tokens;
    estimatedCostUsd += cost;

    const featureKey = `${feature}::${provider}`;
    const featureRow = featureMap.get(featureKey) ?? {
      feature,
      provider,
      eventCount: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
    featureRow.eventCount += 1;
    featureRow.totalTokens += tokens;
    featureRow.estimatedCostUsd += cost;
    featureMap.set(featureKey, featureRow);

    const providerRow = providerMap.get(provider) ?? {
      provider,
      eventCount: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
    providerRow.eventCount += 1;
    providerRow.totalTokens += tokens;
    providerRow.estimatedCostUsd += cost;
    providerMap.set(provider, providerRow);
  }

  const byFeature = Array.from(featureMap.values()).sort(
    (a, b) => b.estimatedCostUsd - a.estimatedCostUsd
  );
  const byProvider = Array.from(providerMap.values()).sort(
    (a, b) => b.estimatedCostUsd - a.estimatedCostUsd
  );

  return {
    days,
    since: sinceDate.toISOString(),
    totalEvents: snapshot.size,
    totalTokens,
    estimatedCostUsd,
    byFeature,
    byProvider,
  };
}

export function serializeUsageEventDoc(id: string, data: DocumentData) {
  return {
    id,
    createdAt: toIsoDate(data.createdAt),
    feature: data.feature as UsageFeature,
    provider: data.provider as string,
    modelId: data.modelId as string,
    inputTokens: data.inputTokens as number,
    outputTokens: data.outputTokens as number,
    totalTokens: data.totalTokens as number,
    estimatedCostUsd: data.estimatedCostUsd as number,
    applicationId: typeof data.applicationId === "string" ? data.applicationId : undefined,
  };
}
