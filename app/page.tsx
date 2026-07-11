'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Automatically boots the app directly into your login portal screen
        router.push('/auth/login');
      } else if (user.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        // Safe root path fallback matching your 225-line workspace view position
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F5E6C4] bg-cover" style={{ backgroundImage: "url('/bg-parchment.jpg')" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-[#F8B936] flex items-center justify-center text-[#521903] font-black text-xl shadow-md animate-bounce">
          HS
        </div>
        <p className="font-black text-xs text-[#521903] uppercase tracking-widest animate-pulse">
          Initializing HandSpeak Pipeline Terminal...
        </p>
      </div>
    </div>
  );
}