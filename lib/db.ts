import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Application,
  MasterResume,
  Goal,
  UserProfile,
  ActivityLog,
  ApplicationStatus,
  AccessRequest,
  AccessRequestStatus,
} from "./types";

// --- Applications ---

export async function getApplications(uid: string): Promise<Application[]> {
  const q = query(
    collection(db, "users", uid, "applications"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application));
}

export async function getApplication(
  uid: string,
  id: string
): Promise<Application | null> {
  const snap = await getDoc(doc(db, "users", uid, "applications", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Application;
}

export async function createApplication(
  uid: string,
  data: Omit<Application, "id" | "uid" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "applications"), {
    ...data,
    uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateApplication(
  uid: string,
  id: string,
  data: Partial<Application>
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "applications", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteApplication(
  uid: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "applications", id));
}

// --- Master Resumes ---

export async function getMasterResumes(uid: string): Promise<MasterResume[]> {
  const q = query(
    collection(db, "users", uid, "masterResumes"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MasterResume));
}

export async function getMasterResume(
  uid: string,
  id: string
): Promise<MasterResume | null> {
  const snap = await getDoc(doc(db, "users", uid, "masterResumes", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as MasterResume;
}

// Strip undefined values recursively — Firestore rejects them
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return undefined as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined) as any;
  }
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([k, v]) => [k, stripUndefined(v)])
        .filter(([, v]) => v !== undefined)
    ) as any;
  }
  return obj;
}

export async function saveMasterResume(
  uid: string,
  data: Omit<MasterResume, "id" | "uid" | "createdAt" | "updatedAt">,
  id?: string
): Promise<string> {
  const clean = stripUndefined(data);
  if (id) {
    await setDoc(
      doc(db, "users", uid, "masterResumes", id),
      {
        ...clean,
        uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return id;
  }
  const ref = await addDoc(collection(db, "users", uid, "masterResumes"), {
    ...clean,
    uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function deleteMasterResume(
  uid: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "masterResumes", id));
}

// --- Goals ---

export async function getGoals(uid: string): Promise<Goal[]> {
  const q = query(
    collection(db, "users", uid, "goals"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
}

export async function saveGoal(
  uid: string,
  data: Omit<Goal, "id" | "uid" | "createdAt">,
  id?: string
): Promise<string> {
  if (id) {
    await updateDoc(doc(db, "users", uid, "goals", id), { ...data, uid });
    return id;
  }
  const ref = await addDoc(collection(db, "users", uid, "goals"), {
    ...data,
    uid,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateGoalCompletion(
  uid: string,
  goalId: string,
  completedDates: string[]
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "goals", goalId), { completedDates });
}

export async function deleteGoal(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "goals", id));
}

// --- User Profile ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid, "profile", "data"));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function saveUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await setDoc(doc(db, "users", uid, "profile", "data"), data, { merge: true });
}

// --- Activity Log ---

export async function getActivityLogs(
  uid: string,
  days = 90
): Promise<ActivityLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, "users", uid, "activity"),
    where("date", ">=", since.toISOString().split("T")[0]),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data() } as ActivityLog));
}

export async function logActivity(
  uid: string,
  date: string,
  data: Partial<ActivityLog>
): Promise<void> {
  await setDoc(
    doc(db, "users", uid, "activity", date),
    { ...data, uid, date },
    { merge: true }
  );
}

// --- Access Requests (admin) ---

export async function getAccessRequests(): Promise<AccessRequest[]> {
  const snap = await getDocs(collection(db, "accessRequests"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: data.email || "",
        name: data.name || "Unknown User",
        status: (data.status || "pending") as AccessRequestStatus,
        requestedAt: data.requestedAt || "",
        updatedAt: data.updatedAt,
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.requestedAt || 0).getTime();
      const bTime = new Date(b.requestedAt || 0).getTime();
      return bTime - aTime;
    });
}

export async function updateAccessRequestStatus(
  uid: string,
  status: AccessRequestStatus
): Promise<void> {
  await updateDoc(doc(db, "accessRequests", uid), {
    status,
    updatedAt: new Date().toISOString(),
  });
}
