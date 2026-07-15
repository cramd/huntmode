#!/usr/bin/env node
/**
 * Force the post-signup setup wizard for an existing user on next login.
 * Keeps applications and master resumes; clears completed/dismissed markers.
 *
 * Usage:
 *   node scripts/force-onboarding.mjs --email famallen8@gmail.com
 *   node scripts/force-onboarding.mjs --uid <firebase-uid> --dry-run
 */

import { resolve } from "node:path";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--email") out.email = argv[++i];
    else if (arg === "--uid") out.uid = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

function initAdmin() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!getApps().length) {
    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({ projectId });
    } else {
      throw new Error(
        "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_* in .env.local"
      );
    }
  }

  return { auth: getAuth(), db: getFirestore() };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.email && !args.uid)) {
    console.log(`Usage:
  node scripts/force-onboarding.mjs --email <user@email.com>
  node scripts/force-onboarding.mjs --uid <firebase-uid> [--dry-run]`);
    process.exit(args.help ? 0 : 1);
  }

  const { auth, db } = initAdmin();
  let uid = args.uid;
  if (!uid) {
    const user = await auth.getUserByEmail(String(args.email).trim().toLowerCase());
    uid = user.uid;
  }

  const profileRef = db.doc(`users/${uid}/profile/data`);
  const [profileSnap, appsSnap, resumesSnap] = await Promise.all([
    profileRef.get(),
    db.collection(`users/${uid}/applications`).get(),
    db.collection(`users/${uid}/masterResumes`).get(),
  ]);

  console.log("uid:", uid);
  console.log("email:", args.email || "(from uid)");
  console.log("applications:", appsSnap.size);
  console.log("masterResumes:", resumesSnap.size);
  console.log("profile.exists:", profileSnap.exists);
  console.log("before:", {
    onboardingCompletedAt: profileSnap.data()?.onboardingCompletedAt || null,
    onboardingDismissedAt: profileSnap.data()?.onboardingDismissedAt || null,
    forceOnboarding: profileSnap.data()?.forceOnboarding || false,
  });

  if (args.dryRun) {
    console.log("Dry run — no writes.");
    return;
  }

  await profileRef.set(
    {
      forceOnboarding: true,
      onboardingCompletedAt: FieldValue.delete(),
      onboardingDismissedAt: FieldValue.delete(),
    },
    { merge: true }
  );

  const after = (await profileRef.get()).data() || {};
  console.log("after:", {
    forceOnboarding: after.forceOnboarding === true,
    onboardingCompletedAt: after.onboardingCompletedAt || null,
    onboardingDismissedAt: after.onboardingDismissedAt || null,
  });
  console.log("Done. User will see /onboarding on next approved login.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
