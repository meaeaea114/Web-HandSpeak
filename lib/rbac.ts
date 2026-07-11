export type Role = 'admin' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const RBAC_CONFIG = {
  admin: {
    allowedRoutes: ['/dashboard/admin'],
    defaultRedirect: '/dashboard/admin',
  },
  teacher: {
    allowedRoutes: ['/dashboard/teacher'],
    defaultRedirect: '/dashboard/teacher',
  },
} as const;

export function hasAccess(role: Role, pathname: string): boolean {
  // 1. Defend against an undefined or null pathname right away
  if (!pathname) return false;

  const config = RBAC_CONFIG[role];
  if (!config) return false;

  // 2. Safe check execution
  return config.allowedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export type Permission = string;

// 2. Add the mock users so the login system has data to check against
export const mockCurrentUser: User = {
  id: "1",
  name: "Mea Angel S. Magpantay",
  email: "mea@example.com",
  role: "admin",
};

export const mockFacultyUser: User = {
  id: "2",
  name: "Teacher Faculty",
  email: "teacher@example.com",
  role: "teacher",
};

export const Permission = {
  MANAGE_TEACHERS: 'admin',
  APPROVE_CONTENT: 'admin',
  VIEW_ANALYTICS: 'teacher',
  MANAGE_GESTURES: 'teacher'
} as const;

// 3. Keep the alias export for hasPermission
export { hasAccess as hasPermission };