import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuthToken } from "@/lib/verify-auth-token";
import type { AccessRequestStatus } from "@/lib/types";

function normalizeStatus(status: AccessRequestStatus | undefined): string {
  if (!status) return "none";
  if (status === "pending") return "approved";
  return status;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const decoded = await verifyAuthToken(req, uid);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("accessRequests").doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ status: "none" });
    }

    const data = docSnap.data();
    const rawStatus = data?.status as AccessRequestStatus | undefined;

    if (rawStatus === "pending") {
      await docRef.update({
        status: "approved",
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ status: normalizeStatus(rawStatus) });
  } catch (error) {
    console.error("Error in check-status API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
