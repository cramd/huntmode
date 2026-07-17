import { adminDb } from "@/lib/firebase-admin";
import { getAdminUserRows, type AdminUserRow } from "@/lib/admin-user-stats";
import { getAdminUsageSummary, type AdminUsageSummary } from "@/lib/admin-usage-stats";
import { getSignupRateLimitStatus } from "@/lib/signup-rate-limit";

export type { AdminUserRow, AdminUsageSummary };

export type SignupStats = {
  totalUsers: number;
  approved: number;
  denied: number;
  pending: number;
  signupsThisHour: number;
  signupLimit: number;
  slotsRemaining: number;
  windowResetsAt: string;
  users: AdminUserRow[];
  usageSummary: AdminUsageSummary;
};

export async function getSignupStats(): Promise<SignupStats> {
  const snapshot = await adminDb.collection("accessRequests").get();
  let approved = 0;
  let denied = 0;
  let pending = 0;

  for (const doc of snapshot.docs) {
    const status = doc.data().status;
    if (status === "approved") approved += 1;
    else if (status === "denied") denied += 1;
    else if (status === "pending") pending += 1;
  }

  const [rate, users, usageSummary] = await Promise.all([
    getSignupRateLimitStatus(),
    getAdminUserRows(snapshot.docs),
    getAdminUsageSummary(),
  ]);

  return {
    totalUsers: snapshot.size,
    approved,
    denied,
    pending,
    ...rate,
    users,
    usageSummary,
  };
}
