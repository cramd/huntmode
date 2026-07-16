import { NextRequest, NextResponse } from "next/server";
import { adminDb, formatAdminError } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/verify-admin";
import type { AccessRequest, AccessRequestStatus } from "@/lib/types";

function mapDoc(id: string, data: Record<string, unknown>): AccessRequest {
  return {
    uid: id,
    email: typeof data.email === "string" ? data.email : "",
    name: typeof data.name === "string" ? data.name : "Unknown User",
    status: (typeof data.status === "string" ? data.status : "pending") as AccessRequestStatus,
    requestedAt: typeof data.requestedAt === "string" ? data.requestedAt : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const snapshot = await adminDb.collection("accessRequests").get();
    const requests = snapshot.docs
      .map((doc) => mapDoc(doc.id, doc.data()))
      .sort((a, b) => {
        const aTime = new Date(a.requestedAt || 0).getTime();
        const bTime = new Date(b.requestedAt || 0).getTime();
        return bTime - aTime;
      });

    const pendingCount = requests.filter((r) => r.status === "pending").length;

    return NextResponse.json({ requests, pendingCount });
  } catch (error) {
    console.error("[access-requests] GET error:", error);
    return NextResponse.json({ error: formatAdminError(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { uid?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { uid, action } = body;
  if (!uid || (action !== "approve" && action !== "deny")) {
    return NextResponse.json(
      { error: "uid and action (approve|deny) are required" },
      { status: 400 }
    );
  }

  try {
    const docRef = adminDb.collection("accessRequests").doc(uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }

    const newStatus: AccessRequestStatus = action === "approve" ? "approved" : "denied";
    await docRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    const data = docSnap.data()!;
    return NextResponse.json({
      success: true,
      request: mapDoc(uid, {
        ...data,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[access-requests] POST error:", error);
    return NextResponse.json({ error: formatAdminError(error) }, { status: 500 });
  }
}
