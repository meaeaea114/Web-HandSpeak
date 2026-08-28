// ==========================================
// GESTURE & ACTIVITY ANALYTICS SERVICE (SERVER-ONLY)
// ==========================================
// Aggregates real documents from the "gesture_attempts" and
// "activity_attempts" Firestore collections (see lib/activity-schema.ts).
// These collections may currently be empty because the student-facing
// app that would populate them is not part of this repository — in
// that case every function here returns hasData: false rather than
// inventing a number.

import { getAdminDb } from './firebase-admin';
import { GestureAttemptDoc, ActivityAttemptDoc } from './activity-schema';

const FIRESTORE_IN_CHUNK = 30; // Firestore 'in' queries support at most 30 values

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface SignAccuracy {
  sign: string;
  module: string;
  attempts: number;
  correct: number;
  accuracy: number; // 0-100
  avgConfidence: number | null;
}

export interface GestureAccuracySummary {
  hasData: boolean;
  totalAttempts: number;
  overallAccuracy: number | null;
  perSign: SignAccuracy[];
  weakSigns: SignAccuracy[]; // lowest-accuracy signs with a meaningful sample size
  signsMastered: number; // signs at >= 85% accuracy with >= 5 attempts
}

const MIN_ATTEMPTS_FOR_SIGN_CONFIDENCE = 5;

export async function getGestureAccuracyForStudents(studentIds: string[]): Promise<GestureAccuracySummary> {
  const empty: GestureAccuracySummary = {
    hasData: false,
    totalAttempts: 0,
    overallAccuracy: null,
    perSign: [],
    weakSigns: [],
    signsMastered: 0,
  };

  if (studentIds.length === 0) return empty;

  try {
    const db = getAdminDb();
    const docs: GestureAttemptDoc[] = [];

    for (const batch of chunk(studentIds, FIRESTORE_IN_CHUNK)) {
      const snap = await db.collection('gesture_attempts').where('studentId', 'in', batch).get();
      snap.forEach((d) => docs.push(d.data() as GestureAttemptDoc));
    }

    if (docs.length === 0) return empty;

    const bySign = new Map<string, { module: string; attempts: number; correct: number; confidenceSum: number; confidenceCount: number }>();

    for (const d of docs) {
      const key = `${d.module}:${d.sign}`;
      const entry = bySign.get(key) || { module: d.module, attempts: 0, correct: 0, confidenceSum: 0, confidenceCount: 0 };
      entry.attempts += 1;
      if (d.isCorrect) entry.correct += 1;
      if (typeof d.confidence === 'number') {
        entry.confidenceSum += d.confidence;
        entry.confidenceCount += 1;
      }
      bySign.set(key, entry);
    }

    const perSign: SignAccuracy[] = Array.from(bySign.entries()).map(([key, v]) => {
      const sign = key.split(':')[1];
      return {
        sign,
        module: v.module,
        attempts: v.attempts,
        correct: v.correct,
        accuracy: Math.round((v.correct / v.attempts) * 1000) / 10,
        avgConfidence: v.confidenceCount > 0 ? Math.round((v.confidenceSum / v.confidenceCount) * 1000) / 10 : null,
      };
    });

    perSign.sort((a, b) => b.attempts - a.attempts);

    const weakSigns = [...perSign]
      .filter((s) => s.attempts >= MIN_ATTEMPTS_FOR_SIGN_CONFIDENCE)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8);

    const totalAttempts = docs.length;
    const totalCorrect = docs.filter((d) => d.isCorrect).length;
    const signsMastered = perSign.filter((s) => s.attempts >= MIN_ATTEMPTS_FOR_SIGN_CONFIDENCE && s.accuracy >= 85).length;

    return {
      hasData: true,
      totalAttempts,
      overallAccuracy: Math.round((totalCorrect / totalAttempts) * 1000) / 10,
      perSign,
      weakSigns,
      signsMastered,
    };
  } catch (err) {
    console.error('Gesture accuracy aggregation failed:', err);
    return empty;
  }
}

export interface ActivityAttemptSummary {
  hasData: boolean;
  totalAttempts: number;
  totalCompleted: number;
  avgScore: number | null;
}

export async function getActivityAttemptSummaryForStudents(studentIds: string[]): Promise<ActivityAttemptSummary> {
  const empty: ActivityAttemptSummary = { hasData: false, totalAttempts: 0, totalCompleted: 0, avgScore: null };
  if (studentIds.length === 0) return empty;

  try {
    const db = getAdminDb();
    const docs: ActivityAttemptDoc[] = [];

    for (const batch of chunk(studentIds, FIRESTORE_IN_CHUNK)) {
      const snap = await db.collection('activity_attempts').where('studentId', 'in', batch).get();
      snap.forEach((d) => docs.push(d.data() as ActivityAttemptDoc));
    }

    if (docs.length === 0) return empty;

    const scored = docs.filter((d) => typeof d.score === 'number');
    const avgScore = scored.length > 0 ? Math.round((scored.reduce((sum, d) => sum + (d.score || 0), 0) / scored.length) * 10) / 10 : null;

    return {
      hasData: true,
      totalAttempts: docs.length,
      totalCompleted: docs.filter((d) => d.completed).length,
      avgScore,
    };
  } catch (err) {
    console.error('Activity attempt aggregation failed:', err);
    return empty;
  }
}
