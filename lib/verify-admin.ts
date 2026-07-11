import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "marcsherwood@gmail.com";

export async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    return decoded.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}
