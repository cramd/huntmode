# Firestore rules for self-hosters

Firestore security rules cannot read environment variables at runtime. Admin identity must be
**hardcoded in `firestore.rules`** and kept in sync with `ADMIN_EMAIL` in your server `.env.local`.

## Setup

1. Copy the template:
   ```bash
   cp firestore.rules.core.example firestore.rules
   ```
2. Replace every `YOUR_ADMIN_EMAIL` with the Google account you use to sign in (same as `ADMIN_EMAIL`).
3. Deploy:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

## What the rules enforce

- **`isAdmin()`** — only your admin email can read/write `accessRequests` (signup directory).
- **`isApproved()`** — admin is always approved when email-verified; other users need an
  `accessRequests/{uid}` doc with `status: approved`.

On the **`core`** edition, sign-up is open and the app auto-registers approved users, so most
self-hosters only need the admin bypass for their own account.

## Hosted production note

The `main` branch keeps `marcsherwood@gmail.com` in `firestore.rules` for huntmode.ca. When you
merge `core` → `main`, resolve any rule conflicts manually — do not overwrite production admin
email without intent.
