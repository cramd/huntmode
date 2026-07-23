import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { checkSignupRateLimit } from "@/lib/signup-rate-limit";
import { accessGateEnabled } from "@/lib/edition";
import type { AccessRequestStatus } from "@/lib/types";

export type RegisterAccessInput = {
  uid: string;
  email: string;
  name?: string;
};

export type RegisterAccessResult =
  | { ok: true; status: Extract<AccessRequestStatus, "approved" | "denied">; created: boolean }
  | { ok: false; status: "rate_limited"; retryAfterSeconds: number; limit: number };

export async function registerAccessUser(
  input: RegisterAccessInput
): Promise<RegisterAccessResult> {
  const { uid, email, name } = input;
  const docRef = adminDb.collection("accessRequests").doc(uid);
  const existing = await docRef.get();

  if (existing.exists) {
    const status = existing.data()?.status as AccessRequestStatus | undefined;
    if (status === "denied") {
      return { ok: true, status: "denied", created: false };
    }
    if (status === "approved" || status === "pending") {
      if (status === "pending") {
        await docRef.update({
          status: "approved",
          updatedAt: new Date().toISOString(),
        });
      }
      return { ok: true, status: "approved", created: false };
    }
  }

  const rateLimit = accessGateEnabled() ? await checkSignupRateLimit() : { allowed: true as const, count: 0, limit: 0 };
  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: "rate_limited",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      limit: rateLimit.limit,
    };
  }

  const now = new Date().toISOString();
  await docRef.set({
    uid,
    email,
    name: name || "Unknown User",
    status: "approved",
    token: crypto.randomUUID(),
    requestedAt: now,
    updatedAt: now,
    registeredVia: "open_signup",
  });

  console.log(`[register] New user approved: ${email} (${uid})`);
  return { ok: true, status: "approved", created: true };
}
