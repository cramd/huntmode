import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = initializeApp({
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else if (process.env.NODE_ENV !== "production") {
    adminApp = initializeApp({
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error(
      "[firebase-admin] Missing FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY in production. " +
        "Download a service account JSON from Firebase Console and run ./setup-admin-creds.sh <path-to-json>."
    );
    adminApp = initializeApp({
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  return adminApp;
}

export function formatAdminError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/default credentials/i.test(raw)) {
    return "Server Firebase Admin credentials are missing. Ask the admin to run ./setup-admin-creds.sh with a service account JSON.";
  }
  return raw;
}

export const adminDb = getFirestore(getAdminApp());
export const adminStorage = getStorage(getAdminApp());
export const adminAuth = getAuth(getAdminApp());
