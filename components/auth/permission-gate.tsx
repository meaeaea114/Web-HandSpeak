'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasAccess, RBAC_CONFIG } from '@/lib/rbac';

interface PermissionGateProps {
  children: React.ReactNode;
  role: 'admin' | 'teacher'; 
}

export function PermissionGate({ children, role }: PermissionGateProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/auth/login'); // Changed from /login
      } else if (user.role !== role || !hasAccess(user.role, pathname)) {
        const fallback = RBAC_CONFIG[user.role]?.defaultRedirect || '/auth/login'; // Changed from /login
        router.replace(fallback);
      }
    }
  }, [user, isLoading, pathname, router, role]);

  if (isLoading || !user || user.role !== role) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm font-medium text-muted-foreground">
          Verifying security permissions...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}