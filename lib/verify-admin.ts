import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/is-admin";

/**
 * Server-side admin gate for endpoints that expose other users' data.
 * Requires a valid Firebase ID token whose email matches ADMIN_EMAIL and is verified.
 */
export async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    return Boolean(decoded.email_verified && isAdminEmail(decoded.email));
  } catch {
    return false;
  }
}
