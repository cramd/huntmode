/**
 * Single source of truth for who can see admin-only user data.
 * Keep in sync with firestore.rules `isAdmin()`.
 */
export const ADMIN_EMAIL = "marcsherwood@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && email === ADMIN_EMAIL);
}
