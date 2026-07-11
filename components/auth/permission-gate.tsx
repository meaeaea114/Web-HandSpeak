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
    if (isLoading) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    if (user.role !== role || !hasAccess(user.role, pathname)) {
      const fallback = RBAC_CONFIG[user.role]?.defaultRedirect || '/auth/login';
      router.replace(fallback);
    }
  }, [user, isLoading, pathname, router, role]);

  if (isLoading || !user || user.role !== role || !hasAccess(user.role, pathname)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5E6C4]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#521903] border-t-transparent"></div>
          <p className="text-xs font-bold text-[#521903] uppercase tracking-widest">
            Validating HandSpeak System Access Permissions...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}