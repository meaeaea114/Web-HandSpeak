// Role-Based Access Control (RBAC) System for HandSpeak

export enum Role {
  ADMIN = 'admin',
  FACULTY = 'faculty',
}

export enum Permission {
  // Dashboard
  VIEW_DASHBOARD = 'view_dashboard',
  
  // Student Management (Teacher only)
  VIEW_STUDENTS = 'view_students',
  
  // Analytics & Reports (Teacher only)
  VIEW_ANALYTICS = 'view_analytics',
  VIEW_REPORTS = 'view_reports',
  
  // Content Management
  VIEW_CONTENT = 'view_content',
  MANAGE_CONTENT = 'manage_content',
  APPROVE_CONTENT = 'approve_content',
  
  // Leaderboard (Teacher only)
  VIEW_LEADERBOARD = 'view_leaderboard',
  
  // Account & Profile (Both roles)
  MANAGE_ACCOUNT = 'manage_account',
  MANAGE_PROFILE = 'manage_profile',
  
  // Notifications (Both roles)
  VIEW_NOTIFICATIONS = 'view_notifications',
  
  // Admin Features
  MANAGE_TEACHERS = 'manage_teachers',
  MANAGE_ANNOUNCEMENTS = 'manage_announcements',
  MANAGE_FEEDBACK = 'manage_feedback',
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Admin Dashboard & Core
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_ACCOUNT,
    Permission.MANAGE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    
    // Admin-only features
    Permission.MANAGE_TEACHERS,
    Permission.MANAGE_ANNOUNCEMENTS,
    Permission.MANAGE_FEEDBACK,
    Permission.APPROVE_CONTENT,
  ],
  [Role.FACULTY]: [
    // Teacher Dashboard & Core
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_ACCOUNT,
    Permission.MANAGE_PROFILE,
    Permission.VIEW_NOTIFICATIONS,
    
    // Teacher-specific features
    Permission.VIEW_STUDENTS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_LEADERBOARD,
    Permission.VIEW_CONTENT,
    Permission.MANAGE_CONTENT,
  ],
}

export type User = {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  department?: string
  assignedSections?: string[]
  lastLogin?: Date
}

// Helper functions
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

// Mock user - in production this would come from auth
export const mockCurrentUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@handspeak.edu',
  role: Role.ADMIN,
  avatar: 'JD',
  department: 'Language Arts',
  assignedSections: ['Grade 1-A', 'Grade 2-B', 'Grade 3-A'],
  lastLogin: new Date(),
}

// Alternative mock user for testing Faculty role
export const mockFacultyUser: User = {
  id: '2',
  name: 'Jane Smith',
  email: 'jane@handspeak.edu',
  role: Role.FACULTY,
  avatar: 'JS',
  department: 'Special Education',
  assignedSections: ['Grade 1-A', 'Grade 1-B'],
  lastLogin: new Date(),
}
