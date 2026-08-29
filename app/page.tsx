'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import HandSpeakLanding from '@/components/landing/handspeak-landing';

// Session-scoped flag: the 5-second landing experience should only play
// once per browser tab/session when the app is first opened — not every
// time the root route happens to be reloaded, and never when navigating
// between dashboard pages (those never render this route at all).
const LANDING_SESSION_KEY = 'handspeak-landing-shown';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Default to true so the server-rendered markup and the very first
  // client render match exactly (avoids a hydration mismatch). The real
  // decision — whether to actually show it — is made client-side below,
  // once we can safely check sessionStorage.
  const [showLanding, setShowLanding] = useState(true);

  // 1. Ensure the component is fully mounted to the browser DOM first,
  //    then decide (client-only) whether the landing screen has already
  //    played this session.
  useEffect(() => {
    setMounted(true);

    try {
      if (window.sessionStorage.getItem(LANDING_SESSION_KEY)) {
        setShowLanding(false);
      }
    } catch {
      // sessionStorage unavailable (e.g. private browsing) — landing will
      // simply show once for this page load, which is a safe fallback.
    }
  }, []);

  const handleLandingComplete = useCallback(() => {
    try {
      window.sessionStorage.setItem(LANDING_SESSION_KEY, '1');
    } catch {
      // Non-fatal — worst case the landing screen plays again next time.
    }
    setShowLanding(false);
  }, []);

  // 2. Only execute routing actions once mounting is stable, the landing
  //    screen (if any) has finished, and auth initialization finishes.
  useEffect(() => {
    if (!mounted || showLanding || isLoading) return;

    if (!user) {
      // Safely redirects to login without throwing the initialization error
      router.push('/auth/login');
      return;
    }

    // Cast user.role as string to safely bypass strict TypeScript type narrowing
    const role = user.role as string;

    if (role === 'admin') {
      router.push('/dashboard/admin');
    } else if (role === 'teacher' || role === 'faculty') {
      router.push('/dashboard/teacher');
    } else {
      router.push('/dashboard/student');
    }
  }, [user, isLoading, router, mounted, showLanding]);

  // Show the 5-second HandSpeak landing screen first (once per session),
  // then fall through to the existing auth-routing behavior above.
  if (mounted && showLanding) {
    return <HandSpeakLanding onComplete={handleLandingComplete} />;
  }

  // Clean, custom HandSpeak parchment loading screen while stabilizing
  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-[#F5E6C4] bg-repeat"
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