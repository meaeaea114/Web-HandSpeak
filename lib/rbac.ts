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
  const config = RBAC_CONFIG[role];
  if (!config) return false;

  // Ensures strict route protection for the dashboard root and all nested pages
  return config.allowedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export { hasAccess as hasPermission };