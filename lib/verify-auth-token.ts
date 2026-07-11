import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function verifyAuthToken(
  req: NextRequest,
  expectedUid?: string
): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    if (expectedUid && decoded.uid !== expectedUid) return null;
    return decoded;
  } catch {
    return null;
  }
}
