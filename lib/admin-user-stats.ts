import { adminDb } from "@/lib/firebase-admin";
import type { AccessRequestStatus } from "@/lib/types";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

export type AdminUserRow = {
  uid: string;
  email: string;
  name: string;
  status: AccessRequestStatus;
  requestedAt: string;
  applicationCount: number;
  onboardingCompleted: boolean;
  lastActiveDate: string | null;
  totalTokensUsed: number;
  totalEstimatedCostUsd: number;
};

async function buildUserRow(doc: QueryDocumentSnapshot): Promise<AdminUserRow> {
  const uid = doc.id;
  const data = doc.data();
  const [appCountSnap, profileSnap] = await Promise.all([
    adminDb.collection(`users/${uid}/applications`).count().get(),
    adminDb.doc(`users/${uid}/profile/data`).get(),
  ]);
  const profile = profileSnap.exists ? profileSnap.data() : undefined;
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    name: typeof data.name === "string" ? data.name : "Unknown User",
    status: (typeof data.status === "string" ? data.status : "pending") as AccessRequestStatus,
    requestedAt: typeof data.requestedAt === "string" ? data.requestedAt : "",
    applicationCount: appCountSnap.data().count,
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    lastActiveDate:
      typeof profile?.lastActiveDate === "string" ? profile.lastActiveDate : null,
    totalTokensUsed: typeof profile?.totalTokensUsed === "number" ? profile.totalTokensUsed : 0,
    totalEstimatedCostUsd:
      typeof profile?.totalEstimatedCostUsd === "number" ? profile.totalEstimatedCostUsd : 0,
  };
}

export async function getAdminUserRows(
  accessRequestDocs: QueryDocumentSnapshot[]
): Promise<AdminUserRow[]> {
  const rows = await Promise.all(accessRequestDocs.map(buildUserRow));
  return rows.sort((a, b) => {
    const aTime = new Date(a.requestedAt || 0).getTime();
    const bTime = new Date(b.requestedAt || 0).getTime();
    return bTime - aTime;
  });
}
