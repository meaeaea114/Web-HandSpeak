'use client';

import { useEffect, useRef } from 'react';

// Keep this in sync with the `handspeak-progress` keyframe duration in
// app/globals.css so the progress bar animation and the auto-advance
// timer finish at (approximately) the same moment.
export const HANDSPEAK_LANDING_DURATION_MS = 5000;

interface HandSpeakLandingProps {
  onComplete: () => void;
}

/**
 * The very first screen shown when the HandSpeak web app is opened.
 *
 * Purely presentational + a single timer — it does not touch auth state,
 * Firebase initialization, or routing itself. The parent (`app/page.tsx`)
 * decides what happens once `onComplete` fires, so this component can't
 * cause redirect loops or interfere with the existing auth flow.
 *
 * Visually it reuses the same HandSpeak parchment texture, logo, and
 * color palette as the existing loading states (see
 * components/auth/protected-layout.tsx) so it feels like part of the
 * same product rather than a bolted-on splash screen.
 */
export default function HandSpeakLanding({ onComplete }: HandSpeakLandingProps) {
  // Store the latest onComplete in a ref so the timer effect below only
  // ever needs to run once on mount, regardless of whether the parent
  // passes a new function reference on re-render.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, HANDSPEAK_LANDING_DURATION_MS);

    // Always clean up on unmount to avoid calling onComplete after the
    // screen has already been dismissed, and to prevent memory leaks.
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="handspeak-landing fixed inset-0 z-50 h-screen w-screen flex items-center justify-center bg-[#F5E6C4] bg-repeat p-4"
      style={{ backgroundImage: "url('/bg-parchment.jpg')" }}
      role="status"
      aria-live="polite"
      aria-label="Preparing HandSpeak, please wait"
    >
      <div className="flex flex-col items-center gap-5 bg-white/40 backdrop-blur-md px-10 py-10 sm:px-14 sm:py-12 rounded-[28px] border border-white/40 shadow-xl max-w-sm w-full text-center">
        <img
          src="/logo.png"
          alt="HandSpeak Logo"
          className="h-20 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
          style={{ animation: 'handspeak-pop 0.6s ease-out' }}
        />

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#521903] uppercase">
            Hand Speak
          </h1>
          <p className="text-[11px] sm:text-xs font-bold text-[#7a4a1a] uppercase tracking-widest leading-relaxed">
            Filipino Sign Language Learning System
          </p>
        </div>

        {/* Progress indicator */}
        <div className="w-full pt-2">
          <div className="h-1.5 w-full rounded-full bg-[#521903]/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F8B936]"
              style={{ animation: `handspeak-progress ${HANDSPEAK_LANDING_DURATION_MS}ms linear forwards` }}
            />
          </div>
          <p className="mt-3 text-[10px] font-black text-[#521903]/70 uppercase tracking-widest animate-pulse">
            Preparing HandSpeak...
          </p>
        </div>
      </div>
    </div>
  );
}