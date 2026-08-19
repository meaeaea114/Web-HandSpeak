export type Role = "admin" | "teacher" | "student";

export type Permission =
  | "view:admin_dashboard"
  | "view:teacher_dashboard"
  | "view:student_dashboard"
  | "manage:teachers"
  | "manage:students"
  | "manage:curriculum"
  | "approve:content"
  | "approve:accounts"
  | "view:analytics"
  | "export:reports"
  | "manage:announcements"
  | "manage:settings"
  | "evaluate:gestures"
  | "view:leaderboard"
  | "submit:feedback";

export type UserStatus = "active" | "pending" | "rejected" | "inactive";

export interface User {
  id: string; // Firebase Auth UID
  name: string; // Stored Full Name
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  email: string;
  role: Role;
  status: UserStatus;
  department: string;
  employeeId: string;
  facultyPosition?: string;
  assignedGrade: string;
  assignedSections: string[];
  avatar?: string;
  createdAt: string;
  lastActive: string;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AccountRequest {
  id: string; // Document ID (matches Firebase UID)
  requestId: string; // Tracking ID (e.g. REQ-2026-XXXX)
  uid: string; // Firebase Auth UID
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string;
  employeeId: string;
  role: Role;
  facultyPosition: string;
  department: string;
  assignedGrade: string;
  assignedSections: string[];
  idDocumentUrl: string;
  idDocumentPath: string;
  idDocumentName: string;
  proofDocumentUrl?: string;
  proofDocumentPath?: string;
  proofDocumentName?: string;
  status: UserStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  approvedAt?: string;
}

export interface RoleConfig {
  name: string;
  description: string;
  permissions: Permission[];
  defaultRoute: string;
}

export const RBAC_CONFIG: Record<Role, RoleConfig> = {
  admin: {
    name: "System Administrator",
    description: "Full control over accounts, teachers, curriculum, and settings",
    permissions: [
      "view:admin_dashboard",
      "manage:teachers",
      "manage:students",
      "manage:curriculum",
      "approve:content",
      "approve:accounts",
      "view:analytics",
      "export:reports",
      "manage:announcements",
      "manage:settings",
      "evaluate:gestures",
      "view:leaderboard",
      "submit:feedback",
    ],
    defaultRoute: "/dashboard/admin",
  },
  teacher: {
    name: "Teacher / Faculty",
    description: "Manage classes, student evaluations, gestures, and reports",
    permissions: [
      "view:teacher_dashboard",
      "manage:students",
      "manage:curriculum",
      "view:analytics",
      "export:reports",
      "evaluate:gestures",
      "view:leaderboard",
      "submit:feedback",
    ],
    defaultRoute: "/dashboard/teacher",
  },
  student: {
    name: "Student",
    description: "Access FSL lessons, practice sign language, and view feedback",
    permissions: [
      "view:student_dashboard",
      "evaluate:gestures",
      "view:leaderboard",
      "submit:feedback",
    ],
    defaultRoute: "/dashboard/teacher",
  },
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const config = RBAC_CONFIG[userRole];
  if (!config) return false;
  return config.permissions.includes(permission);
}