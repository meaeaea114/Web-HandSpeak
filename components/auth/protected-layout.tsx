'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  console.log("ProtectedLayout", {
  pathname,
  user,
  isLoading,
});
  // 1. Siguraduhin na client-side lang ito tumatakbo
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 2. Monitoring logic para sa redirect loop
  useEffect(() => {
    if (!isClient || isLoading) return; // Huwag gagalaw habang loading pa

    // Kung walang user at nasa loob ka ng dashboard, sipain sa login
    if (!user && pathname.startsWith('/dashboard')) {
      router.replace('/auth/login');
      return;
    }

    // Role-based protection:
    // Kung admin pero nasa teacher route, ibalik sa admin
    if (user && pathname.startsWith('/dashboard/teacher') && user.role === 'admin') {
      router.replace('/dashboard/admin');
    }
    
    // Kung teacher pero nasa admin route, ibalik sa teacher
    if (user && pathname.startsWith('/dashboard/admin') && (user.role === 'teacher' || user.role === 'faculty')) {
      router.replace('/dashboard/teacher');
    }
  }, [user, isLoading, router, pathname, isClient]);

  // 3. Loading screen (HandSpeak style) para hindi ma-flicker o ma-loop
  if (!isClient || isLoading) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center bg-[#F5E6C4] bg-cover bg-center" 
        style={{ backgroundImage: "url('/bg-parchment.jpg')" }}
      >
        <div className="flex flex-col items-center gap-3 bg-white/40 backdrop-blur-md p-8 rounded-[24px] border border-white/40 shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-[#F8B936] flex items-center justify-center text-[#521903] font-black text-2xl shadow-md animate-bounce border-b-4 border-[#DC8C18]">
            HS
          </div>
          <p className="font-black text-xs text-[#521903] uppercase tracking-widest animate-pulse mt-2">
            Loading Secure Engine...
          </p>
        </div>
      </div>
    );
  }

  // 4. Kung may user, ipakita na ang content
  return <>{children}</>;
}