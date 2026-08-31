import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// AUTOMATIC LEVEL ASSIGNMENT (admin-approval time)
// ---------------------------------------------------------------------------
// Determines which level a newly-approved Activity Question belongs to,
// based on Category + Difficulty + "Required Activities Per Level", and
// reserves that slot atomically so concurrent admin approvals can never
// collide. Called from `approveContentSubmission` in content-service.ts.
//
// Existing activity_questions documents already encode
// `${category}_${difficulty}_${levelNumber}` in their `level` field (see
// `normalizeActivityPayload` in content-service.ts) — that convention is
// reused as-is here, nothing about it changes.

const ACTIVITY_QUESTIONS_COLLECTION = 'activity_questions';

// A "level_counters" collection did not exist before this change, and
// neither did any "Required Activities Per Level" setting anywhere in the
// project (checked activity-schema.ts, content-service.ts, the admin
// settings page, and mock-data.ts). Firestore transactions can only read/
// write specific documents, not run aggregation queries, so a small
// supporting document per category+difficulty is the minimal
// backward-compatible addition needed to make level assignment safe under
// concurrent approvals (see REQUIREMENT #11 in the task). It is lazily
// bootstrapped from the real, existing activity_questions the first time a
// given category+difficulty pair is approved through this code path (see
// seedFromExistingActivities below), and is the sole source of truth for
// that pair afterwards. It never renumbers, moves, or rewrites any existing
// activity_questions document.
const LEVEL_COUNTERS_COLLECTION = 'level_counters';

// No existing "Required Activities Per Level" configuration was found
// anywhere in the project, so this is the smallest possible place to put
// the number — a single named constant, not hardcoded inline, and easy to
// change later without touching the assignment algorithm itself.
export const REQUIRED_ACTIVITIES_PER_LEVEL = 4;

function counterDocId(category: string, difficulty: string): string {
  return `${category}_${difficulty}`;
}

export function buildLevelId(category: string, difficulty: string, levelNumber: number): string {
  return `${category}_${difficulty}_${levelNumber}`;
}

/**
 * Extracts the trailing level number from an existing `level` string, but
 * only when it actually belongs to the given category+difficulty. The
 * `level` string prefix (not a separate `difficulty` field, which some
 * legacy docs may be missing) is treated as the source of truth here — the
 * same inference already used elsewhere in this codebase (see
 * `requestActivityDeletion` and the teacher content page).
 */
function parseLevelNumber(levelId: string | undefined, category: string, difficulty: string): number | null {
  if (!levelId) return null;
  const prefix = `${category}_${difficulty}_`;
  if (!levelId.startsWith(prefix)) return null;
  const n = parseInt(levelId.slice(prefix.length), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface LevelSeed {
  currentLevel: number;
  currentCount: number;
}

export interface LevelReservation {
  /** Full level id, e.g. "alphabet_medium_5" — unchanged from before. */
  level: string;
  /** Just the numeric part, e.g. 5 — needed by callers building the
   *  deterministic activity_questions document ID (see
   *  buildActivityQuestionId in content-service.ts), which embeds the level
   *  number on its own rather than the full level id. */
  levelNumber: number;
}

/**
 * Scans existing activity_questions for this category+difficulty and finds
 * the "latest" level — the HIGHEST existing level number, gaps and all
 * (per REQUIREMENTS #7-9, existing gaps/partial levels are preserved, never
 * renumbered) — plus how many activities currently occupy it. Used only to
 * bootstrap the level_counters document the first time this category+
 * difficulty pair is approved through this path; every approval after that
 * reads/writes the counter instead, so this query never runs again for it.
 */
async function seedFromExistingActivities(category: string, difficulty: string): Promise<LevelSeed> {
  const q = query(collection(db, ACTIVITY_QUESTIONS_COLLECTION), where('category', '==', category));
  const snap = await getDocs(q);

  let currentLevel = 0;
  let currentCount = 0;

  snap.docs.forEach((d) => {
    const data = d.data() as { level?: string };
    const n = parseLevelNumber(data.level, category, difficulty);
    if (n === null) return;
    if (n > currentLevel) {
      currentLevel = n;
      currentCount = 1;
    } else if (n === currentLevel) {
      currentCount += 1;
    }
  });

  if (currentLevel === 0) {
    // No existing activities for this category+difficulty yet.
    currentLevel = 1;
    currentCount = 0;
  }

  return { currentLevel, currentCount };
}

/**
 * Atomically determines the level a newly-approved activity belongs to and
 * reserves its slot. If the current/latest level for this category+
 * difficulty has fewer than `requiredPerLevel` activities, that level is
 * reused; otherwise the next level number is used. Existing level numbers,
 * gaps, and records are never modified — only the new activity's slot is
 * reserved.
 *
 * Safe under concurrent approvals: the reservation happens inside a
 * Firestore transaction against a single `level_counters/{category}_
 * {difficulty}` document, so Firestore's normal transaction-conflict retry
 * guarantees two simultaneous approvals for the same category+difficulty
 * can never both land on the same slot.
 */
export async function reserveNextLevel(
  category: string,
  difficulty: string,
  requiredPerLevel: number = REQUIRED_ACTIVITIES_PER_LEVEL
): Promise<LevelReservation> {
  const counterRef = doc(db, LEVEL_COUNTERS_COLLECTION, counterDocId(category, difficulty));

  // Only ever queried (and only once, even across transaction retries) when
  // the counter doc doesn't exist yet for this category+difficulty pair.
  let seedPromise: Promise<LevelSeed> | null = null;
  const getSeed = (): Promise<LevelSeed> => {
    if (!seedPromise) seedPromise = seedFromExistingActivities(category, difficulty);
    return seedPromise;
  };

  const assignedLevelNumber = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);

    let currentLevel: number;
    let currentCount: number;

    if (counterSnap.exists()) {
      const data = counterSnap.data() as { currentLevel?: number; currentCount?: number };
      currentLevel = data.currentLevel && data.currentLevel > 0 ? data.currentLevel : 1;
      currentCount = data.currentCount ?? 0;
    } else {
      const seed = await getSeed();
      currentLevel = seed.currentLevel;
      currentCount = seed.currentCount;
    }

    let targetLevel = currentLevel;
    let targetCount = currentCount;

    if (targetCount >= requiredPerLevel) {
      targetLevel = currentLevel + 1;
      targetCount = 0;
    }

    targetCount += 1;

    transaction.set(
      counterRef,
      {
        category,
        difficulty,
        currentLevel: targetLevel,
        currentCount: targetCount,
        requiredPerLevel,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return targetLevel;
  });

  return { level: buildLevelId(category, difficulty, assignedLevelNumber), levelNumber: assignedLevelNumber };
}
