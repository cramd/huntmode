#!/usr/bin/env node
/**
 * Seed draft applications for an existing user (resume must already exist).
 *
 * Usage:
 *   node scripts/seed-applications.mjs --email user@example.com --data scripts/seed-data/rod-allen-jobs.json
 *   node scripts/seed-applications.mjs --email user@example.com --data jobs.json --resume-id abc123 [--dry-run]
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--email") out.email = argv[++i];
    else if (arg === "--uid") out.uid = argv[++i];
    else if (arg === "--data") out.data = argv[++i];
    else if (arg === "--resume-id") out.resumeId = argv[++i];
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
      throw new Error("Missing Firebase Admin credentials in .env.local");
    }
  }

  return { auth: getAuth(), db: getFirestore() };
}

async function resolveUid(auth, { email, uid }) {
  if (uid) return uid;
  if (!email) throw new Error("Provide --email or --uid");
  const user = await auth.getUserByEmail(email.trim().toLowerCase());
  return user.uid;
}

async function resolveResumeId(db, uid, resumeId) {
  if (resumeId) return resumeId;
  const snap = await db.collection(`users/${uid}/masterResumes`).get();
  if (snap.empty) throw new Error("No master resume found — seed resume first");
  const preferred =
    snap.docs.find((d) => d.data().name === "Master Resume") || snap.docs[0];
  return preferred.id;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.email && !args.uid) || !args.data) {
    console.log(`Usage:
  node scripts/seed-applications.mjs --email <user@email.com> --data <jobs.json> [--resume-id <id>] [--dry-run]`);
    process.exit(args.help ? 0 : 1);
  }

  const payload = JSON.parse(readFileSync(resolve(process.cwd(), args.data), "utf8"));
  if (!Array.isArray(payload.applications) || payload.applications.length === 0) {
    throw new Error("Data file must include a non-empty applications array");
  }

  const { auth, db } = initAdmin();
  const uid = await resolveUid(auth, args);
  const userRecord = await auth.getUser(uid);
  const resumeId = await resolveResumeId(db, uid, args.resumeId);
  const now = new Date().toISOString();

  const existingApps = await db.collection(`users/${uid}/applications`).get();
  console.log("\nTarget user");
  console.log("  uid:      ", uid);
  console.log("  email:    ", userRecord.email);
  console.log("  resume id:", resumeId);
  console.log("  existing applications:", existingApps.size);
  console.log("\nWill add", payload.applications.length, "draft applications:");
  payload.applications.forEach((app, i) => {
    console.log(`  ${i + 1}. ${app.role} @ ${app.company}`);
  });

  if (args.dryRun) {
    console.log("\n(dry-run — no writes performed)");
    return;
  }

  const batch = db.batch();
  const profileRef = db.doc(`users/${uid}/profile/data`);

  if (payload.profile) {
    batch.set(
      profileRef,
      {
        ...(payload.profile.targetRoles ? { targetRoles: payload.profile.targetRoles } : {}),
        ...(payload.profile.targetIndustry ? { targetIndustry: payload.profile.targetIndustry } : {}),
        ...(payload.profile.targetRole || payload.profile.targetRoles
          ? {
              targetRole:
                payload.profile.targetRole ||
                (payload.profile.targetRoles || []).join(", "),
            }
          : {}),
        onboardingCompletedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  const appIds = [];
  for (const app of payload.applications) {
    const appRef = db.collection(`users/${uid}/applications`).doc();
    appIds.push(appRef.id);
    const record = {
      uid,
      company: app.company,
      role: app.role,
      jobUrl: app.jobUrl || "",
      jobDescription: app.jobDescription || "",
      status: app.status || "draft",
      appliedAt: app.appliedAt ?? null,
      notes: app.notes || "",
      generatedCV: "",
      generatedCoverLetter: "",
      resumeUsed: resumeId,
      createdAt: now,
      updatedAt: now,
    };
    if (app.salaryRange !== undefined) record.salaryRange = app.salaryRange;
    if (app.location !== undefined) record.location = app.location;
    if (app.remote !== undefined) record.remote = app.remote;
    if (app.orgType !== undefined) record.orgType = app.orgType;
    batch.set(appRef, record);
  }

  await batch.commit();

  console.log("\nDone.");
  console.log("  application ids:", appIds.join(", "));
  console.log(`\n${userRecord.displayName || "User"} should see drafts at /applications`);
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
