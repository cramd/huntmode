import { adminDb } from "@/lib/firebase-admin";

const RATE_LIMIT_DOC = "system/signupRateLimit";

export const SIGNUP_LIMIT_PER_HOUR = Number(process.env.SIGNUP_LIMIT_PER_HOUR || 10);

function getHourWindowKey(date = new Date()): string {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

export type SignupRateLimitResult =
  | { allowed: true; count: number; limit: number }
  | { allowed: false; count: number; limit: number; retryAfterSeconds: number };

export async function checkSignupRateLimit(): Promise<SignupRateLimitResult> {
  const windowKey = getHourWindowKey();
  const docRef = adminDb.doc(RATE_LIMIT_DOC);
  const limit = SIGNUP_LIMIT_PER_HOUR;

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.data();
    const currentWindow = typeof data?.windowKey === "string" ? data.windowKey : "";
    const currentCount = typeof data?.count === "number" ? data.count : 0;

    const count = currentWindow === windowKey ? currentCount : 0;

    if (count >= limit) {
      const windowEnd = new Date(windowKey);
      windowEnd.setUTCHours(windowEnd.getUTCHours() + 1);
      const retryAfterSeconds = Math.max(
        60,
        Math.ceil((windowEnd.getTime() - Date.now()) / 1000)
      );
      return { allowed: false, count, limit, retryAfterSeconds };
    }

    tx.set(
      docRef,
      {
        windowKey,
        count: count + 1,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { allowed: true, count: count + 1, limit };
  });
}

export async function getSignupRateLimitStatus() {
  const windowKey = getHourWindowKey();
  const limit = SIGNUP_LIMIT_PER_HOUR;
  const snap = await adminDb.doc(RATE_LIMIT_DOC).get();
  const data = snap.data();
  const currentWindow = typeof data?.windowKey === "string" ? data.windowKey : "";
  const count = currentWindow === windowKey ? (typeof data?.count === "number" ? data.count : 0) : 0;
  const windowEnd = new Date(windowKey);
  windowEnd.setUTCHours(windowEnd.getUTCHours() + 1);

  return {
    signupsThisHour: count,
    signupLimit: limit,
    slotsRemaining: Math.max(0, limit - count),
    windowResetsAt: windowEnd.toISOString(),
  };
}
