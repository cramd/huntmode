import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export function calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
  let inputPricePer1M = 0;
  let outputPricePer1M = 0;

  if (provider === "google") {
    // Gemini Flash pricing
    inputPricePer1M = 0.075;
    outputPricePer1M = 0.30;
  } else if (provider === "anthropic") {
    // Claude 3.5 Sonnet pricing
    inputPricePer1M = 3.00;
    outputPricePer1M = 15.00;
  } else {
    // Default to OpenAI GPT-4o pricing
    inputPricePer1M = 5.00;
    outputPricePer1M = 15.00;
  }

  const cost = (inputTokens / 1000000) * inputPricePer1M + (outputTokens / 1000000) * outputPricePer1M;
  return cost;
}

export async function trackTokenUsage(uid: string, provider: string, inputTokens: number, outputTokens: number) {
  if (!uid) return;
  
  const totalTokens = inputTokens + outputTokens;
  const costUsd = calculateCost(provider, inputTokens, outputTokens);

  try {
    const userRef = adminDb.collection("users").doc(uid).collection("profile").doc("data");
    // Use FieldValue.increment to atomically update the stats
    await userRef.update({
      totalTokensUsed: FieldValue.increment(totalTokens),
      totalEstimatedCostUsd: FieldValue.increment(costUsd)
    });
    console.log(`[Cost Tracker] Logged ${totalTokens} tokens ($${costUsd.toFixed(5)}) for ${uid}`);
  } catch (error: any) {
    // If the fields don't exist yet, we can fall back to set with merge
    if (error.code === 5) { // NOT_FOUND
      try {
        const userRef = adminDb.collection("users").doc(uid).collection("profile").doc("data");
        await userRef.set({
          totalTokensUsed: totalTokens,
          totalEstimatedCostUsd: costUsd
        }, { merge: true });
        console.log(`[Cost Tracker] Initialized ${totalTokens} tokens ($${costUsd.toFixed(5)}) for ${uid}`);
      } catch (err) {
        console.error(`[Cost Tracker] Failed to initialize usage for ${uid}:`, err);
      }
    } else {
      console.error(`[Cost Tracker] Failed to update usage for ${uid}:`, error);
    }
  }
}
