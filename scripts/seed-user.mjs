#!/usr/bin/env node
/**
 * Seed a HuntMode user's Firestore data (resume + job applications).
 *
 * Usage:
 *   node scripts/seed-user.mjs --email rod@example.com --data scripts/seed-data/rod.json
 *   node scripts/seed-user.mjs --uid abc123 --data scripts/seed-data/rod.json --dry-run
 *
 * Requires FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY in .env.local
 * (or GOOGLE_APPLICATION_CREDENTIALS pointing at a service account JSON).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

function parseArgs(argv) {
  const out = { dryRun: false, resumeOnly: false, replaceExisting: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--resume-only") out.resumeOnly = true;
    else if (arg === "--replace-existing") out.replaceExisting = true;
    else if (arg === "--email") out.email = argv[++i];
    else if (arg === "--uid") out.uid = argv[++i];
    else if (arg === "--data") out.data = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

function usage() {
  console.log(`Usage:
  node scripts/seed-user.mjs --email <user@email.com> --data <path/to/seed.json>
  node scripts/seed-user.mjs --uid <firebase-uid> --data <path/to/seed.json> [--dry-run]
  node scripts/seed-user.mjs --email <user@email.com> --data <path/to/seed.json> --resume-only

See scripts/seed-data/example-user.json for the JSON shape.`);
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
        "Missing Firebase Admin credentials. Run ./setup-admin-creds.sh or set FIREBASE_ADMIN_* in .env.local"
      );
    }
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

async function resolveUid(auth, { email, uid }) {
  if (uid) return uid;
  if (!email) throw new Error("Provide --email or --uid");
  try {
    const user = await auth.getUserByEmail(email.trim().toLowerCase());
    return user.uid;
  } catch {
    throw new Error(`No Firebase Auth user found for email: ${email}`);
  }
}

function loadSeedFile(path) {
  const raw = readFileSync(resolve(process.cwd(), path), "utf8");
  const data = JSON.parse(raw);
  if (!data.resume?.sections) {
    throw new Error("Seed file must include resume.sections");
  }
  if (!Array.isArray(data.applications)) {
    data.applications = [];
  }
  return data;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.email && !args.uid) || !args.data) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const seed = loadSeedFile(args.data);
  if (!args.resumeOnly && seed.applications.length === 0) {
    throw new Error("Seed file must include at least one application (or pass --resume-only)");
  }
  const { auth, db } = initAdmin();
  const uid = await resolveUid(auth, args);
  const userRecord = await auth.getUser(uid);
  const now = new Date().toISOString();

  const accessRef = db.collection("accessRequests").doc(uid);
  const profileRef = db.doc(`users/${uid}/profile/data`);
  const existingResumes = await db.collection(`users/${uid}/masterResumes`).get();
  let resumeRef = db.collection(`users/${uid}/masterResumes`).doc();
  if (args.resumeOnly && args.replaceExisting && !existingResumes.empty) {
    resumeRef = existingResumes.docs[0].ref;
  }
  const appRefs = seed.applications.map(() =>
    db.collection(`users/${uid}/applications`).doc()
  );

  const accessSnap = await accessRef.get();
  const profileSnap = await profileRef.get();

  console.log("\nTarget user");
  console.log("  uid:   ", uid);
  console.log("  email: ", userRecord.email);
  console.log("  name:  ", userRecord.displayName || seed.profile?.name || "(none)");
  console.log("\nExisting data");
  console.log("  access status:", accessSnap.data()?.status ?? "(no accessRequests doc)");
  console.log("  profile:       ", profileSnap.exists ? "yes" : "no");
  const existingApps = await db.collection(`users/${uid}/applications`).get();
  console.log("  applications:  ", existingApps.size);
  console.log("  resumes:       ", existingResumes.size);
  console.log("\nWill write");
  console.log(
    args.resumeOnly && args.replaceExisting && !existingResumes.empty
      ? `  update master resume: ${seed.resume.name} (${resumeRef.id})`
      : `  1 master resume: ${seed.resume.name}`
  );
  if (!args.resumeOnly) {
    console.log("  ", seed.applications.length, "applications");
    console.log("  profile onboardingCompletedAt + target fields");
  } else if (seed.profile) {
    console.log("  profile target fields (no onboarding flag unless profile block present)");
  }

  if (args.dryRun) {
    console.log("\n(dry-run — no writes performed)");
    return;
  }

  const batch = db.batch();

  if (!args.resumeOnly) {
    batch.set(
      accessRef,
      {
        uid,
        email: userRecord.email || seed.profile?.email || "",
        name: userRecord.displayName || seed.profile?.name || "User",
        status: "approved",
        requestedAt: accessSnap.data()?.requestedAt || now,
        updatedAt: now,
        seededBy: "scripts/seed-user.mjs",
      },
      { merge: true }
    );
  }

  batch.set(
    profileRef,
    {
      uid,
      email: userRecord.email || "",
      name: userRecord.displayName || seed.profile?.name || "User",
      ...(seed.profile?.targetRoles ? { targetRoles: seed.profile.targetRoles } : {}),
      ...(seed.profile?.targetIndustry ? { targetIndustry: seed.profile.targetIndustry } : {}),
      ...(seed.profile?.targetRole || seed.profile?.targetRoles
        ? {
            targetRole:
              seed.profile?.targetRole || (seed.profile?.targetRoles || []).join(", "),
          }
        : {}),
      ...(!args.resumeOnly
        ? {
            onboardingCompletedAt: now,
          }
        : {}),
      createdAt: profileSnap.data()?.createdAt || now,
      weeklyGoal: profileSnap.data()?.weeklyGoal ?? 5,
      currentStreak: profileSnap.data()?.currentStreak ?? 0,
      longestStreak: profileSnap.data()?.longestStreak ?? 0,
      lastActiveDate: profileSnap.data()?.lastActiveDate ?? null,
    },
    { merge: true }
  );

  batch.set(resumeRef, {
    uid,
    name: seed.resume.name || "Master Resume",
    category: seed.resume.category || "general",
    sections: {
      summary: seed.resume.sections.summary || "",
      experience: seed.resume.sections.experience || "",
      skills: seed.resume.sections.skills || "",
      education: seed.resume.sections.education || "",
      certifications: seed.resume.sections.certifications || "",
      projects: Array.isArray(seed.resume.sections.projects) ? seed.resume.sections.projects : [],
    },
    createdAt: existingResumes.docs[0]?.data()?.createdAt || now,
    updatedAt: now,
  }, { merge: args.resumeOnly && args.replaceExisting && !existingResumes.empty });

  seed.applications.forEach((app, index) => {
    batch.set(appRefs[index], {
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
      resumeUsed: resumeRef.id,
      salaryRange: app.salaryRange,
      location: app.location,
      remote: app.remote,
      orgType: app.orgType,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();

  console.log("\nDone.");
  console.log("  resume id:", resumeRef.id);
  if (!args.resumeOnly && appRefs.length > 0) {
    console.log("  application ids:", appRefs.map((r) => r.id).join(", "));
  }
  console.log(`\n${userRecord.displayName || seed.profile?.name || "User"} should see the resume at /resume on next login`);
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
