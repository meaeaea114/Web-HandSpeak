export type Role = "admin" | "teacher" | "principal" | "department" | "student";
export type UserRole = Role;
export type UserStatus = "active" | "pending" | "rejected" | "archived" | "deactivated" | "suspended";

export type DepartmentType =
  | "Special Needs Education (SNED)"
  | "Elementary Education"
  | "Junior High School"
  | "Senior High School"
  | "System Administration";

export type GradeLevel =
  | "Kindergarten"
  | "Grade 1"
  | "Grade 2"
  | "Grade 3"
  | "Grade 4"
  | "Grade 5"
  | "Grade 6"
  | "Grade 7"
  | "Grade 8"
  | "Grade 9"
  | "Grade 10"
  | "Grade 11"
  | "Grade 12"
  | "All";

export type Permission =
  | "manage_users"
  | "manage_accounts"
  | "manage_content"
  | "manage_announcements"
  | "view_analytics"
  | "manage_students"
  | "manage_classes"
  | "give_feedback"
  | "view_feedback"
  | "access_dictionary"
  | "access_practice"
  | "view_leaderboard";

export interface User {
  id: string;
  name: string;
  fullName?: string;
  firstName?: string;
  middleInitial?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  gender?: string;
  loginEmail?: string;
  email: string;
  contactNumber?: string;
  role: Role;
  status: UserStatus;
  phone?: string;
  department?: string;
  employeeId?: string;
  facultyPosition?: string;
  assignedGrade?: string;
  assignedSections?: string[];
  avatar?: string;
  createdAt?: string;
  lastActive?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  archivedAt?: string;
  archivedBy?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  /** Whether email-based Two-Factor Authentication is enabled for this account. */
  twoFactorEnabled?: boolean;
}

export interface AccountRequest {
  id: string;
  requestId: string;
  uid: string;
  fullName: string;
  firstName: string;
  middleInitial?: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender?: string;
  loginEmail?: string;
  email: string;
  contactNumber?: string;
  employeeId: string;
  role: string;
  facultyPosition: string;
  department: string;
  assignedGrade: string;
  assignedSections: string[];
  idDocumentUrl?: string;
  idDocumentPath?: string;
  idDocumentName?: string;
  proofDocumentUrl?: string;
  proofDocumentPath?: string;
  proofDocumentName?: string;
  status: UserStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  archivedAt?: string;
  archivedBy?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
}

export const RBAC_CONFIG: Record<Role, { permissions: Permission[] }> = {
  admin: {
    permissions: [
      "manage_users",
      "manage_accounts",
      "manage_content",
      "manage_announcements",
      "view_analytics",
      "manage_students",
      "manage_classes",
      "view_feedback",
      "access_dictionary",
      "access_practice",
      "view_leaderboard",
    ],
  },
  principal: {
    permissions: [
      "view_analytics",
      "manage_students",
      "manage_classes",
      "view_feedback",
      "access_dictionary",
      "access_practice",
      "view_leaderboard",
    ],
  },
  department: {
    permissions: [
      "manage_students",
      "manage_classes",
      "view_analytics",
      "give_feedback",
      "access_dictionary",
      "access_practice",
      "view_leaderboard",
    ],
  },
  teacher: {
    permissions: [
      "manage_students",
      "manage_classes",
      "manage_content",
      "view_analytics",
      "give_feedback",
      "access_dictionary",
      "access_practice",
      "view_leaderboard",
    ],
  },
  student: {
    permissions: [
      "access_dictionary",
      "access_practice",
      "give_feedback",
      "view_leaderboard",
    ],
  },
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return RBAC_CONFIG[role]?.permissions.includes(permission) ?? false;
}

export function resolveSystemRole(facultyPosition?: string, requestedRole?: string): Role {
  const pos = (facultyPosition || requestedRole || "").toLowerCase().trim();
  if (pos.includes("admin") || pos === "school administrator") return "admin";
  if (pos.includes("principal") || pos.includes("school head")) return "principal";
  if (pos.includes("department") || pos.includes("guidance")) return "department";
  return "teacher";
}