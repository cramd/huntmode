/**
 * Single source of truth for who can see admin-only user data.
 * Keep in sync with firestore.rules `isAdmin()` — see docs/firestore-rules-core.md.
 */
export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim() ||
    "marcsherwood@gmail.com"
  ).toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = getAdminEmail();
  return Boolean(email && email.toLowerCase() === admin);
}

/** @deprecated Use getAdminEmail() — kept for existing imports during migration. */
export const ADMIN_EMAIL = getAdminEmail();
