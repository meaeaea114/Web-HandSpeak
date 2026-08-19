import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Role } from "./rbac";

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  section: string;
  progress: number;
  accuracy: number;
  lastActive: string;
  status: "active" | "inactive" | "needs-attention";
  avatar: string;
  enrolledDate: string;
  completedLessons: number;
  totalLessons: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  target: string;
  timestamp: string;
  type: "auth" | "content" | "student" | "system";
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: Role;
  date: string;
  priority: "low" | "medium" | "high";
  targetAudience: "all" | "teachers" | "students" | "admins";
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedGrade: string;
  assignedSections?: string[];
  totalStudents: number;
  status: "active" | "on-leave" | "inactive";
  joinedDate: string;
  avatar: string;
}

/**
 * Access Control Enforcement for Student Records:
 * Administrators receive full institutional student records.
 * Approved teachers only query students enrolled in their assigned grade level.
 */
export async function getStudents(userRole?: Role, assignedGrade?: string): Promise<Student[]> {
  try {
    let q = query(collection(db, "students"), orderBy("name", "asc"));

    if (userRole === "teacher" && assignedGrade && assignedGrade !== "All") {
      q = query(
        collection(db, "students"),
        where("grade", "==", assignedGrade),
        orderBy("name", "asc")
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Student[];
  } catch (error) {
    console.error("Error fetching student records under RBAC constraints:", error);
    return [];
  }
}

export async function getTeachers(): Promise<TeacherProfile[]> {
  try {
    const q = query(collection(db, "users"), where("role", "==", "teacher"), where("status", "==", "active"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: d.fullName || d.name || "Faculty Member",
        email: d.email || "",
        department: d.department || "Special Education",
        assignedGrade: d.assignedGrade || "Elementary",
        assignedSections: d.assignedSections || [],
        totalStudents: 0,
        status: d.status === "active" ? "active" : "inactive",
        joinedDate: d.createdAt || new Date().toISOString().split("T")[0],
        avatar: d.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name || "Teacher")}`,
      };
    }) as TeacherProfile[];
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const q = query(collection(db, "announcements"), orderBy("date", "desc"), limit(5));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Announcement[];
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
}

export async function getActivityLogs(limitCount = 8): Promise<ActivityLog[]> {
  try {
    const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as ActivityLog[];
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return [];
  }
}
export interface GesturePerformance {
  id: string;
  studentId: string;
  studentName: string;
  sign: string;
  category: string;
  recognitionRate: number;
  attempts: number;
  avgConfidence: number;
  teacherId?: string;
  grade?: string;
  section?: string;
  updatedAt?: string;
}

export async function getGesturePerformance(
  teacherId?: string
): Promise<GesturePerformance[]> {
  try {
    const performanceRef = collection(db, "gesturePerformance");

    const q = teacherId
      ? query(
          performanceRef,
          where("teacherId", "==", teacherId),
          orderBy("recognitionRate", "desc")
        )
      : query(
          performanceRef,
          orderBy("recognitionRate", "desc")
        );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        studentId: data.studentId || "",
        studentName: data.studentName || "Unknown Student",
        sign: data.sign || "",
        category: data.category || "",
        recognitionRate: Number(data.recognitionRate || 0),
        attempts: Number(data.attempts || 0),
        avgConfidence: Number(data.avgConfidence || 0),
        teacherId: data.teacherId || "",
        grade: data.grade || "",
        section: data.section || "",
        updatedAt: data.updatedAt || "",
      };
    });
  } catch (error) {
    console.error("Error fetching gesture performance:", error);
    return [];
  }
}