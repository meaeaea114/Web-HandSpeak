'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RBAC_CONFIG } from '@/lib/rbac';

export default function RootPage() {
  // Destructures the correct context hook property interface name
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const destination = RBAC_CONFIG[user.role]?.defaultRedirect || '/auth/login';
        router.replace(destination);
      } else {
        router.replace('/auth/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}