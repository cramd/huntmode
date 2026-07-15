import { adminAuth } from "@/lib/firebase-admin";

export async function verifyOnboardingAuth(
  authHeader: string | null
): Promise<{ uid: string; email: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    if (!decoded.uid) return null;
    return { uid: decoded.uid, email: decoded.email || "" };
  } catch {
    return null;
  }
}
