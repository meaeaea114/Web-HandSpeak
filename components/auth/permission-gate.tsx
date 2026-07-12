'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface PermissionGateProps {
  children: React.ReactNode;
  role: 'admin' | 'teacher';
}

export function PermissionGate({
  children,
  role,
}: PermissionGateProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  console.log("PermissionGate", {
    user,
    isLoading,
    requiredRole: role,
});

  useEffect(() => {
  console.log("PermissionGate effect", {
    user,
    isLoading,
    role,
  });

  if (isLoading) return;

  if (!user) {
    console.log("Redirecting to login");
    router.replace("/auth/login");
    return;
  }

  if (user.role !== role) {
    console.log("Wrong role");
    router.replace(
      user.role === "admin"
        ? "/dashboard/admin"
        : "/dashboard/teacher"
    );
  }

  console.log("Access granted");
}, [user, isLoading, role, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (user.role !== role) return null;

  return <>{children}</>;
}