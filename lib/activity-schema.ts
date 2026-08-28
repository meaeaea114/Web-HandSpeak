// ==========================================
// ACTIVITY & GESTURE-RECOGNITION DATA SCHEMA
// ==========================================
// This project (the web repo you're reading) is the TEACHER/ADMIN
// DASHBOARD ONLY. It reads student progress from Firestore but does
// not itself run gesture recognition or serve lessons to students —
// that happens in a separate student-facing client (a mobile/web app
// not included in this repository) which is the system that would
// actually record attempts using the shapes below.
//
// These two collections do not exist in Firestore yet. They are
// defined here so:
//   1. The recording API routes in app/api/activity/** know exactly
//      what to validate and write.
//   2. The read/aggregation path (lib/gesture-analytics-service.ts)
//      knows exactly what to query.
//   3. Whoever owns the student-facing app has an exact contract to
//      implement against — either by writing directly to Firestore
//      with a client SDK (if Firestore rules are opened up for it)
//      or, more simply and safely, by POSTing to the API routes in
//      app/api/activity/gesture-attempt and app/api/activity/lesson-attempt,
//      which validate the shape and write server-side via the Admin SDK.
//
// Until attempts are actually written by that system, every read path
// in this app treats an empty collection as "insufficient data" and
// says so explicitly — it never fabricates numbers.

export type LearningModuleId = 'alphabet' | 'numbers';

/**
 * Firestore collection: "gesture_attempts"
 * One document per individual gesture-recognition attempt a student makes
 * (e.g. each time the camera/model evaluates a single sign attempt).
 */
export interface GestureAttemptDoc {
  studentId: string; // Firestore uid of the student (matches users/{uid})
  sign: string; // The target sign/letter/number being attempted, e.g. "A", "5"
  module: LearningModuleId;
  isCorrect: boolean;
  confidence?: number; // Model confidence score 0-1, if the recognizer provides one
  lessonId?: string;
  attemptedAt: string; // ISO 8601 timestamp of the attempt
  createdAt?: unknown; // Firestore server timestamp, set on write
}

/**
 * Firestore collection: "activity_attempts"
 * One document per completed (or attempted) lesson/activity.
 */
export interface ActivityAttemptDoc {
  studentId: string;
  moduleId: LearningModuleId;
  lessonId: string;
  score?: number; // 0-100, if the activity is scored
  xpEarned?: number;
  completed: boolean;
  durationSeconds?: number;
  attemptedAt: string; // ISO 8601 timestamp
  createdAt?: unknown; // Firestore server timestamp, set on write
}

export function isValidGestureAttemptPayload(body: any): body is Omit<GestureAttemptDoc, 'createdAt'> {
  return (
    body &&
    typeof body.studentId === 'string' && body.studentId.trim().length > 0 &&
    typeof body.sign === 'string' && body.sign.trim().length > 0 &&
    (body.module === 'alphabet' || body.module === 'numbers') &&
    typeof body.isCorrect === 'boolean' &&
    (body.confidence === undefined || (typeof body.confidence === 'number' && body.confidence >= 0 && body.confidence <= 1)) &&
    typeof body.attemptedAt === 'string'
  );
}

export function isValidActivityAttemptPayload(body: any): body is Omit<ActivityAttemptDoc, 'createdAt'> {
  return (
    body &&
    typeof body.studentId === 'string' && body.studentId.trim().length > 0 &&
    (body.moduleId === 'alphabet' || body.moduleId === 'numbers') &&
    typeof body.lessonId === 'string' && body.lessonId.trim().length > 0 &&
    typeof body.completed === 'boolean' &&
    (body.score === undefined || typeof body.score === 'number') &&
    (body.xpEarned === undefined || typeof body.xpEarned === 'number') &&
    typeof body.attemptedAt === 'string'
  );
}
