export type Role = 'admin' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// Binalangkas ang lahat ng routes para sa parehong roles upang walang maging restriction loop
export const RBAC_CONFIG = {
  admin: {
    allowedRoutes: ['/dashboard/admin'],
    defaultRedirect: '/dashboard/admin',
  },
  teacher: {
    allowedRoutes: [
      '/dashboard/teacher',
      '/dashboard/teacher/overview',
      '/dashboard/teacher/leaderboard',
      '/dashboard/teacher/analytics',
      '/dashboard/teacher/reports',
      '/dashboard/teacher/students',
      '/dashboard/teacher/content',
      '/dashboard/teacher/account'
    ],
    defaultRedirect: '/dashboard/teacher',
  },
} as const;

export function hasAccess(role: Role, pathname: string): boolean {
  if (!pathname) return false;

  const config = RBAC_CONFIG[role];
  if (!config) return false;

  // Pinapahintulutan ang eksaktong tugma o anumang sub-routes sa ilalim nito
  return config.allowedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export type Permission = string;

export const mockCurrentUser: User = {
  id: "1",
  name: "Mea Angel S. Magpantay",
  email: "mea@handspeak.edu",
  role: "admin",
};

export const mockFacultyUser: User = {
  id: "2",
  name: "Teacher Faculty",
  email: "teacher@handspeak.edu",
  role: "teacher",
};

export const Permission = {
  MANAGE_TEACHERS: 'admin',
  APPROVE_CONTENT: 'admin',
  VIEW_ANALYTICS: 'teacher',
  MANAGE_GESTURES: 'teacher'
} as const;

export { hasAccess as hasPermission };