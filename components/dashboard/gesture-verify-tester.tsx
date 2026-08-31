'use client';

// ==========================================================================
// GESTURE VERIFY TESTER
// ==========================================================================
// Lets an admin actually perform a submitted sign on camera, live, and see
// how well it matches the trainer's captured samples — BEFORE approving.
// Previously the approval screen only showed the requested tolerance
// percentages (rotate/tilt/distance/switch-hands), which describe how the
// take was framed, not whether the recorded gesture is actually the right
// sign or good enough quality to teach a model from. This runs the same
// camera -> landmark -> feature-vector pipeline used in Train mode
// (app/dashboard/teacher/content/page.tsx) and compares the admin's live
// sequence against the pending submission's own trainingSequences using the
// same DTW template match already used for live Practice feedback
// (lib/gesture-template-match.ts) — so "is this accurate" gets a real,
// camera-measured answer instead of a guess.
// ==========================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getHandLandmarker, detectHandsInFrame, type Landmark } from '@/lib/hand-landmarker';
import { landmarksToFeatureVector } from '@/lib/posture-metrics';
import { FrameSequenceBuffer } from '@/lib/gesture-sequence-model';
import { matchGestureTemplate, type TemplateMatchResult } from '@/lib/gesture-template-match';

const DETECTION_INTERVAL_MS = 120;

interface GestureVerifyTesterProps {
  gestureLabel: string;
  referenceSequences: number[][][];
}

export function GestureVerifyTester({ gestureLabel, referenceSequences }: GestureVerifyTesterProps) {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [match, setMatch] = useState<TemplateMatchResult | null>(null);
  const [attempts, setAttempts] = useState<TemplateMatchResult[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<FrameSequenceBuffer>(new FrameSequenceBuffer());

  const hasReference = referenceSequences.length > 0;

  useEffect(() => {
    if (!cameraOn) return;
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 360, height: 360, facingMode: 'user' } })
      .then((stream) => {
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        interval = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const landmarker = await getHandLandmarker();
            const result = detectHandsInFrame(landmarker, videoRef.current, performance.now());
            const landmarksPerHand: Landmark[][] = result
              ? result.landmarks.map((hand) => hand.map((p) => ({ x: p.x, y: p.y, z: p.z })))
              : [];

            setHandDetected(landmarksPerHand.length > 0);
            if (landmarksPerHand.length === 0) return;

            const featureVector = landmarksToFeatureVector(landmarksPerHand);
            bufferRef.current.push(featureVector);

            if (bufferRef.current.isFull() && hasReference) {
              const matchResult = matchGestureTemplate(bufferRef.current.snapshot(), referenceSequences);
              setMatch(matchResult);
            }
          } catch (err) {
            console.error('Verify-tester detection frame error:', err);
          }
        }, DETECTION_INTERVAL_MS);
      })
      .catch((err) => {
        console.warn('Camera access unavailable:', err);
        setCameraError('Could not access the camera — check browser permissions.');
        setCameraOn(false);
      });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      bufferRef.current.clear();
      setHandDetected(false);
    };
  }, [cameraOn, hasReference, referenceSequences]);

  const recordAttempt = () => {
    if (match) setAttempts((prev) => [match, ...prev].slice(0, 5));
  };

  if (!hasReference) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800">
        No captured sequences on this submission yet — nothing to test against.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Test This Sign Yourself — "{gestureLabel}"
        </span>
        <button
          onClick={() => {
            setCameraError(null);
            setMatch(null);
            setAttempts([]);
            setCameraOn((v) => !v);
          }}
          className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border cursor-pointer ${
            cameraOn
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
          }`}
        >
          {cameraOn ? <CameraOff className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
          {cameraOn ? 'Stop Camera' : 'Try It Myself'}
        </button>
      </div>

      {cameraError && <p className="text-[11px] font-bold text-rose-600">{cameraError}</p>}

      {cameraOn && (
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-black shrink-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            <div
              className={`absolute bottom-1 left-1 right-1 text-center text-[8px] font-black uppercase py-0.5 rounded ${
                handDetected ? 'bg-emerald-600/80 text-white' : 'bg-black/60 text-slate-300'
              }`}
            >
              {handDetected ? 'Hand Detected' : 'No Hand'}
            </div>
          </div>

          <div className="flex-1 space-y-2 w-full">
            <p className="text-[11px] font-bold text-slate-500">
              Perform the sign in view of your camera, then tap "Log This Try" to keep a record of how close it
              matched.
            </p>

            {match ? (
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  match.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {match.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span className={`text-xs font-black ${match.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {match.isCorrect ? 'Matches the submitted sample' : "Doesn't match closely"}
                  </span>
                </div>
                <span className="font-mono text-xs font-black text-slate-700">
                  {Math.round(match.confidence * 100)}%
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400 font-bold text-center">
                Sign into the camera — a live confidence score appears here once a full take is buffered.
              </div>
            )}

            <button
              onClick={recordAttempt}
              disabled={!match}
              className="text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              Log This Try
            </button>

            {attempts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {attempts.map((a, i) => (
                  <span
                    key={i}
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      a.isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {Math.round(a.confidence * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-400 font-bold pt-1 border-t border-slate-100">
        This compares your live signing against the {referenceSequences.length} sample
        {referenceSequences.length === 1 ? '' : 's'} in this submission using dynamic time-warping — the same check
        Practice mode uses. Use it as a sanity check alongside your own judgment, not the sole reason to approve or
        reject.
      </p>
    </div>
  );
}