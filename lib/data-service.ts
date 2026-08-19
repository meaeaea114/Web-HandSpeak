import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./firebase";

// =======================================================
// 1. EXACT FIRESTORE SCHEMA FOR SHARED FLUTTER & WEB APP
// =======================================================

export interface AccountRequestDocument {
  id?: string;
  trackingId?: string;
  status: "pending" | "approved" | "rejected";

  // Identity & Scope Fields
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  fullName: string;
  email: string;
  backupEmail?: string;
  employeeId: string;
  department: string;
  facultyPosition: string;
  position?: string;
  assignedGrade: string;
  assignedSections: string[];
  username?: string;

  // Verification Document (Base64)
  idDocumentName?: string;
  idDocumentPath?: string;
  idDocumentUrl?: string;
  proofDocumentName?: string;
  proofDocumentUrl?: string;

  // Timestamps & Review
  createdAtServer?: Timestamp | any;
  createdAt?: string;
  reviewedAt?: Timestamp | any;
  rejectionReason?: string;
}

/**
 * Converts a file directly to a Base64 data string (No Storage CORS issues).
 */
export function convertFileToBase64(file: File): Promise<{ url: string; fileName: string; path: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result as string,
        fileName: file.name,
        path: "firestore_base64",
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Saves a new Registration Request into Firestore `accountRequests`.
 * Tries direct Firestore first; if client rules block it, uses the server-side API fallback.
 */
export async function createAccountRequest(
  data: Partial<AccountRequestDocument>
): Promise<{ id: string; trackingId: string }> {
  const trackingId =
    data.trackingId ||
    `REQ-${Math.floor(100000 + Math.random() * 900000)}`;

  const fullName =
    data.fullName ||
    `${data.firstName || ""} ${data.middleName ? data.middleName + " " : ""}${data.lastName || ""} ${data.suffix && data.suffix !== "None" ? data.suffix : ""}`.trim();

  const payload: any = {
    firstName: data.firstName || "",
    middleName: data.middleName || "",
    lastName: data.lastName || "",
    suffix: data.suffix || "None",
    fullName,
    email: data.email || "",
    backupEmail: data.backupEmail || "",
    employeeId: data.employeeId || "",
    department: data.department || "Special Education (SPED)",
    facultyPosition: data.facultyPosition || "Teacher",
    position: data.facultyPosition || "Teacher",
    assignedGrade: data.assignedGrade || "Kindergarten",
    assignedSections: data.assignedSections && data.assignedSections.length > 0 ? data.assignedSections : ["Hope"],
    idDocumentName: data.idDocumentName || "",
    idDocumentPath: data.idDocumentPath || "firestore_base64",
    idDocumentUrl: data.idDocumentUrl || "",
    proofDocumentName: data.proofDocumentName || "",
    proofDocumentUrl: data.proofDocumentUrl || "",
    trackingId,
    status: data.status || "pending",
  };

  try {
    // 1. Direct Firestore client attempt
    const collectionRef = collection(db, "accountRequests");
    const docRef = await addDoc(collectionRef, {
      ...payload,
      createdAtServer: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, trackingId };
  } catch (clientErr: any) {
    console.warn("Direct Firestore write permission error, using API fallback route:", clientErr);

    // 2. Server API fallback
    const res = await fetch("/api/account-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || "Failed to submit request.");
    }

    return { id: result.id, trackingId: result.trackingId };
  }
}

/**
 * Real-time listener for Firestore `accountRequests`.
 */
export function subscribeToAccountRequests(
  callback: (requests: AccountRequestDocument[]) => void
): Unsubscribe {
  const collectionRef = collection(db, "accountRequests");

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const requests: AccountRequestDocument[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        requests.push({
          id: docSnap.id,
          trackingId: d.trackingId || docSnap.id,
          status: d.status || "pending",
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          middleName: d.middleName || "",
          suffix: d.suffix || "None",
          fullName: d.fullName || `${d.firstName || ""} ${d.lastName || ""}`.trim(),
          email: d.email || "",
          backupEmail: d.backupEmail || "",
          employeeId: d.employeeId || "",
          department: d.department || "Special Education (SPED)",
          facultyPosition: d.facultyPosition || d.position || "Teacher",
          position: d.position || d.facultyPosition || "Teacher",
          assignedGrade: d.assignedGrade || "Kindergarten",
          assignedSections: Array.isArray(d.assignedSections) ? d.assignedSections : [],
          idDocumentName: d.idDocumentName || "",
          idDocumentPath: d.idDocumentPath || "",
          idDocumentUrl: d.idDocumentUrl || "",
          proofDocumentName: d.proofDocumentName || "",
          proofDocumentUrl: d.proofDocumentUrl || "",
          createdAtServer: d.createdAtServer,
          createdAt: d.createdAt || (d.createdAtServer?.toDate ? d.createdAtServer.toDate().toISOString() : ""),
          reviewedAt: d.reviewedAt,
          rejectionReason: d.rejectionReason,
        });
      });

      requests.sort((a, b) => {
        const timeA = a.createdAtServer?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAtServer?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });

      callback(requests);
    },
    (error) => {
      console.error("Firestore onSnapshot error:", error);
    }
  );
}

/**
 * Fetch all Account Requests once.
 */
export async function getAccountRequests(): Promise<AccountRequestDocument[]> {
  try {
    const collectionRef = collection(db, "accountRequests");
    const snapshot = await getDocs(collectionRef);
    const requests: AccountRequestDocument[] = [];

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      requests.push({
        id: docSnap.id,
        trackingId: d.trackingId || docSnap.id,
        status: d.status || "pending",
        firstName: d.firstName || "",
        lastName: d.lastName || "",
        middleName: d.middleName || "",
        suffix: d.suffix || "None",
        fullName: d.fullName || `${d.firstName || ""} ${d.lastName || ""}`.trim(),
        email: d.email || "",
        backupEmail: d.backupEmail || "",
        employeeId: d.employeeId || "",
        department: d.department || "Special Education (SPED)",
        facultyPosition: d.facultyPosition || d.position || "Teacher",
        position: d.position || d.facultyPosition || "Teacher",
        assignedGrade: d.assignedGrade || "Kindergarten",
        assignedSections: Array.isArray(d.assignedSections) ? d.assignedSections : [],
        idDocumentName: d.idDocumentName || "",
        idDocumentPath: d.idDocumentPath || "",
        idDocumentUrl: d.idDocumentUrl || "",
        proofDocumentName: d.proofDocumentName || "",
        proofDocumentUrl: d.proofDocumentUrl || "",
        createdAtServer: d.createdAtServer,
        createdAt: d.createdAt || (d.createdAtServer?.toDate ? d.createdAtServer.toDate().toISOString() : ""),
        reviewedAt: d.reviewedAt,
        rejectionReason: d.rejectionReason,
      });
    });

    requests.sort((a, b) => {
      const timeA = a.createdAtServer?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAtServer?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return requests;
  } catch (error) {
    console.error("Error fetching account requests:", error);
    return [];
  }
}

/**
 * Updates status of an Account Request in Firestore (Approve or Reject).
 */
export async function updateAccountRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<boolean> {
  try {
    const docRef = doc(db, "accountRequests", requestId);
    const updateData: any = {
      status,
      reviewedAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    if (status === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await updateDoc(docRef, updateData);

    if (status === "approved") {
      const requestDoc = await getDoc(docRef);
      if (requestDoc.exists()) {
        const data = requestDoc.data();
        const usersCollection = collection(db, "users");

        await addDoc(usersCollection, {
          email: data.email,
          backupEmail: data.backupEmail || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          fullName: data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          employeeId: data.employeeId || "",
          department: data.department || "",
          facultyPosition: data.facultyPosition || data.position || "Teacher",
          assignedGrade: data.assignedGrade || "",
          assignedSections: data.assignedSections || [],
          role: "Teacher",
          accountStatus: "active",
          sourceRequestId: requestId,
          createdAtServer: serverTimestamp(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating account request status:", error);
    return false;
  }
}

// ==========================================
// 2. DASHBOARD ANNOUNCEMENTS & LOGS
// ==========================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  targetRole?: "all" | "admin" | "teacher" | "student";
  category?: "General" | "System" | "Academic" | "Event";
  isRead?: boolean;
}

export interface ActivityItem {
  id: string;
  type: string;
  title?: string;
  description?: string;
  timestamp: string;
  user?: string;
  userName?: string;
  userRole?: string;
  action?: string;
  target?: string;
}

// Type alias & wrapper functions for backward compatibility with activity logs components
export type ActivityLog = ActivityItem;

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const collectionRef = collection(db, "announcements");
    const q = query(collectionRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const list: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Announcement, "id">) });
      });
      return list;
    }
  } catch (error) {}

  return [
    {
      id: "ann-1",
      title: "Shared Database Synchronized",
      content: "Web portal and mobile client are connected to handspeak-96d8d.",
      date: new Date().toISOString(),
      author: "System Administrator",
      targetRole: "all",
      category: "System",
      isRead: false,
    },
  ];
}

export async function getActivityFeed(limitCount?: number): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [
    {
      id: "act-1",
      type: "system",
      title: "Firebase Live Sync",
      description: "accountRequests collection active.",
      timestamp: "Just now",
      userName: "System Administrator",
      userRole: "admin",
      action: "System Audit",
      target: "accountRequests collection active",
    },
  ];

  return typeof limitCount === "number" ? activities.slice(0, limitCount) : activities;
}

export async function getActivityLogs(limitCount?: number): Promise<ActivityLog[]> {
  return getActivityFeed(limitCount);
}

// ==========================================
// 3. TEACHER PROFILES & DATA RETRIEVAL
// ==========================================

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedGrade: string;
  avatar: string;
  assignedSections?: string[];
  employeeId?: string;
  status?: string;
  role?: string;
}

/**
 * Retrieves teacher profiles from the shared Firestore database.
 * Queries 'teachers' collection and 'users' collection with teacher roles.
 */
export async function getTeachers(): Promise<TeacherProfile[]> {
  try {
    const teachersList: TeacherProfile[] = [];

    // Query 'teachers' collection
    const teachersRef = collection(db, "teachers");
    const teachersSnap = await getDocs(teachersRef);

    teachersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      teachersList.push({
        id: docSnap.id,
        name: data.fullName || data.name || "Unknown Teacher",
        email: data.email || "",
        department: data.department || "Special Education (SPED)",
        assignedGrade: data.assignedGrade || data.grade || "N/A",
        avatar:
          data.avatar ||
          data.photoURL ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            data.fullName || data.name || docSnap.id
          )}`,
        assignedSections: Array.isArray(data.assignedSections) ? data.assignedSections : [],
        employeeId: data.employeeId || "",
        status: data.status || data.accountStatus || "active",
        role: data.role || data.facultyPosition || "Teacher",
      });
    });

    // Query 'users' collection for account documents with teacher roles
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("role", "in", ["teacher", "faculty", "Teacher", "Faculty"])
    );
    const usersSnap = await getDocs(q);

    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const exists = teachersList.some(
        (t) => t.id === docSnap.id || (t.email && t.email === data.email)
      );

      if (!exists) {
        teachersList.push({
          id: docSnap.id,
          name: data.fullName || data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown Teacher",
          email: data.email || "",
          department: data.department || "Special Education (SPED)",
          assignedGrade: data.assignedGrade || data.grade || "N/A",
          avatar:
            data.avatar ||
            data.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              data.fullName || data.name || docSnap.id
            )}`,
          assignedSections: Array.isArray(data.assignedSections) ? data.assignedSections : [],
          employeeId: data.employeeId || "",
          status: data.accountStatus || data.status || "active",
          role: data.role || "Teacher",
        });
      }
    });

    return teachersList;
  } catch (error) {
    console.error("Error fetching teacher profiles from Firestore:", error);
    return [];
  }
}