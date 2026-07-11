'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 1. Ensure the component is fully mounted to the browser DOM first
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Only execute routing actions once mounting is stable and initialization finishes
  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!user) {
      // Safely redirects to login without throwing the initialization error
      router.push('/auth/login');
    } else if (user.role === 'admin') {
      router.push('/dashboard/admin');
    } else if (user.role === 'teacher' || user.role === 'faculty') {
      router.push('/dashboard/teacher');
    }
  }, [user, isLoading, router, mounted]);

  // Clean, custom HandSpeak parchment loading screen while stabilizing
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
          Initializing HandSpeak Engine Terminal...
        </p>
      </div>
    </div>
  );
}