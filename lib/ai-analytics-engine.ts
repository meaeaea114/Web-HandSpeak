// ==========================================
// AI ANALYTICS ENGINE (SERVER-ONLY)
// ==========================================

import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

const COHORT_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const STUDENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ==========================================
// SHARED TYPES
// ==========================================

export interface AIEngineResult<T> {
  ok: boolean;
  data: T | null;
  cached: boolean;
  generatedAt: number | null;
  error?: string;
  limitations?: string[];
}

export interface CohortAIInsights {
  diagnosticNarrative: string;
  diagnosticDrivers: string[];
  predictiveNarrative: string;
  predictiveIsEstimate: true;
  prescriptiveRecommendations: {
    priority: 'URGENT' | 'HIGH' | 'RECOMMENDED' | 'ENCOURAGE';
    targetScope: string;
    action: string;
    rationale: string;
  }[];
  dataLimitations: string[];
}

export interface StudentAIInsight {
  studentSummary: string;
  strengths: string[];
  weaknesses: string[];
  diagnosticInsight: string;
  predictiveInsight: string | null;
  predictiveConfidenceNote: string | null;
  recommendedActivities: string[];
  recommendedInterventions: string[];
  dataLimitations: string[];
}

export interface CohortMetricsPayload {
  scopeLabel: string;
  totalStudents: number;
  activeCohort: number;
  pendingCount: number;
  avgProgress: number;
  avgXp: number;
  avgStars: number;
  avgStreak: number;
  totalCompletedLessons: number;
  alphabetAvgXp: number;
  numbersAvgXp: number;
  activeToday: number;
  activeThisWeek: number;
  inactiveOver7Days: number;
  stalledOnboardingCount: number;
  classPerformance: { className: string; studentCount: number; avgProgress: number; avgXp: number }[];
  highRiskCount: number;
  moderateRiskCount: number;
  fastPacedCount: number;
  steadyCount: number;
  gestureAccuracy: {
    hasData: boolean;
    totalAttempts: number;
    overallAccuracy: number | null;
    weakSigns: { sign: string; module: string; attempts: number; accuracy: number }[];
    signsMastered: number;
  };
}

export interface StudentMetricsPayload {
  firstName: string;
  gradeLevel?: string;
  section?: string;
  studentType?: 'SNED' | 'REGULAR';
  progress: number;
  xp: number;
  stars?: number;
  streak?: number;
  completedLessons?: number;
  alphabetXp?: number;
  alphabetProgress?: number;
  numbersXp?: number;
  numbersProgress?: number;
  daysSinceLastActive?: number | null;
  accountAgeDays?: number | null;
  status: string;
  gestureAccuracy?: {
    hasData: boolean;
    totalAttempts: number;
    overallAccuracy: number | null;
    weakSigns: { sign: string; module: string; attempts: number; accuracy: number }[];
  };
}

// ==========================================
// FALLBACK BUILDERS (API FAILURE / NO CREDITS)
// ==========================================

const FALLBACK_COHORT_INSIGHT = (payload: CohortMetricsPayload): CohortAIInsights => ({
  diagnosticNarrative: `Cohort analytics show an average progress of ${payload.avgProgress}% with ${payload.activeThisWeek} active student(s) this week out of ${payload.totalStudents} total records.`,
  diagnosticDrivers: [
    `Active learners this week: ${payload.activeThisWeek}`,
    `Average streak maintained: ${payload.avgStreak} days`,
    `Students requiring attention: ${payload.highRiskCount + payload.moderateRiskCount}`
  ],
  predictiveNarrative: 'Regular module interaction is projected to sustain incremental progress across all active sections.',
  predictiveIsEstimate: true,
  prescriptiveRecommendations: [
    {
      priority: payload.highRiskCount > 0 ? 'HIGH' : 'RECOMMENDED',
      targetScope: payload.scopeLabel,
      action: 'Schedule focused intervention or review modules for at-risk or inactive students.',
      rationale: 'Rule-based check identified inactive or lower-progress metrics within this scope.'
    }
  ],
  dataLimitations: ['Anthropic API offline or insufficient credits; system defaulted to deterministic metrics.']
});

const FALLBACK_STUDENT_INSIGHT = (payload: StudentMetricsPayload): StudentAIInsight => ({
  studentSummary: `${payload.firstName} is registered with a current overall progress rate of ${payload.progress}%.`,
  strengths: payload.xp > 0 ? ['Active participation in practice exercises', 'Earning module XP'] : ['Registered account on platform'],
  weaknesses: payload.progress < 50 ? ['Overall completion rate is below target threshold'] : [],
  diagnosticInsight: 'Performance trends indicate steady engagement with opportunities for additional practice consistency.',
  predictiveInsight: 'Continued practice is estimated to increase individual module completion.',
  predictiveConfidenceNote: 'Estimate generated based on current activity parameters.',
  recommendedActivities: ['Review primary sign language modules', 'Complete 10 minutes of daily practice'],
  recommendedInterventions: payload.progress < 30 ? ['Schedule guided review session'] : [],
  dataLimitations: ['Detailed attempt logs unavailable or restricted.']
});

// ==========================================
// HASHING & CACHE UTILITIES
// ==========================================

function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
}

async function readCache<T>(collection: string, key: string, ttlMs: number): Promise<{ data: T; generatedAt: number } | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection(collection).doc(key).get();
    if (!snap.exists) return null;
    const doc = snap.data();
    if (!doc || !doc.generatedAt || !doc.insights) return null;
    const generatedAtMs = typeof doc.generatedAt === 'number' ? doc.generatedAt : doc.generatedAt.toMillis?.() ?? 0;
    if (Date.now() - generatedAtMs > ttlMs) return null;
    return { data: doc.insights as T, generatedAt: generatedAtMs };
  } catch (err) {
    console.error(`AI cache read failed (${collection}/${key}):`, err);
    return null;
  }
}

async function writeCache(collection: string, key: string, insights: unknown): Promise<number> {
  const generatedAt = Date.now();
  try {
    const db = getAdminDb();
    await db.collection(collection).doc(key).set({
      insights,
      generatedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(`AI cache write failed (${collection}/${key}):`, err);
  }
  return generatedAt;
}

// ==========================================
// ANTHROPIC API CALL
// ==========================================

async function callClaude(system: string, userPrompt: string, maxTokens = 1400): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[AI Engine] ANTHROPIC_API_KEY is not configured on the server.');
    return null;
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[AI Engine] Anthropic API error status (${response.status}):`, errText);
      return null;
    }

    const data = await response.json();
    const textBlock = Array.isArray(data?.content)
      ? data.content.find((b: any) => b.type === 'text')
      : null;
    return textBlock?.text ?? null;
  } catch (err) {
    console.error('[AI Engine] Anthropic API request network error:', err);
    return null;
  }
}

function extractJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

// ==========================================
// PROMPTS
// ==========================================

const COHORT_SYSTEM_PROMPT = `You are an instructional-analytics assistant embedded in a Filipino Sign Language (FSL) learning platform called HandSpeak, used by K-6 teachers.

You will be given ONLY aggregated, already-computed statistics about a class or cohort of students. These numbers are ground truth — do not alter, recompute, round differently, or contradict them, and never invent a number that was not given to you.

Your job is to:
1. Interpret WHY the pattern in the data is likely happening (diagnostic reasoning), grounded strictly in the provided numbers.
2. Offer a predictive narrative about what is likely to happen if current trends continue.
3. Recommend concrete, differentiated teacher actions (prescriptive).
4. List any analytics you cannot responsibly produce because the data provided is insufficient.

Respond with ONLY a single JSON object matching exactly this shape:
{
  "diagnosticNarrative": string,
  "diagnosticDrivers": string[],
  "predictiveNarrative": string,
  "prescriptiveRecommendations": [
    { "priority": "URGENT"|"HIGH"|"RECOMMENDED"|"ENCOURAGE", "targetScope": string, "action": string, "rationale": string }
  ],
  "dataLimitations": string[]
}`;

const STUDENT_SYSTEM_PROMPT = `You are an instructional-analytics assistant embedded in a Filipino Sign Language (FSL) learning platform called HandSpeak.

You will be given ONLY aggregated, already-computed statistics about ONE student.

Your job is to:
1. Identify real strengths and weaknesses grounded strictly in the provided numbers.
2. Give a short diagnostic insight explaining a likely reason for the pattern.
3. Give a predictive insight if sufficient data exists; otherwise set "predictiveInsight" to null and explain in "predictiveConfidenceNote".
4. Recommend concrete next learning activities and interventions.
5. List data limitations.

Respond with ONLY a single JSON object matching exactly this shape:
{
  "studentSummary": string,
  "strengths": string[],
  "weaknesses": string[],
  "diagnosticInsight": string,
  "predictiveInsight": string | null,
  "predictiveConfidenceNote": string | null,
  "recommendedActivities": string[],
  "recommendedInterventions": string[],
  "dataLimitations": string[]
}`;

// ==========================================
// PUBLIC EXPORTS
// ==========================================

export async function getCohortAIInsights(
  payload: CohortMetricsPayload,
  opts: { forceRefresh?: boolean } = {}
): Promise<AIEngineResult<CohortAIInsights>> {
  const key = hashPayload(payload);

  if (!opts.forceRefresh) {
    const cached = await readCache<CohortAIInsights>('ai_insights_cohort', key, COHORT_CACHE_TTL_MS);
    if (cached) {
      return { ok: true, data: cached.data, cached: true, generatedAt: cached.generatedAt };
    }
  }

  if (payload.totalStudents === 0) {
    return {
      ok: true,
      cached: false,
      generatedAt: Date.now(),
      data: {
        diagnosticNarrative: 'No students are currently in this scope, so no diagnostic pattern can be identified.',
        diagnosticDrivers: [],
        predictiveNarrative: 'A forecast cannot be produced without any enrolled students in scope.',
        predictiveIsEstimate: true,
        prescriptiveRecommendations: [],
        dataLimitations: ['No student records are available in the current filter/scope.'],
      },
    };
  }

  const userPrompt = `Here is the aggregated cohort data for "${payload.scopeLabel}":\n\n${JSON.stringify(payload, null, 2)}`;
  const raw = await callClaude(COHORT_SYSTEM_PROMPT, userPrompt);
  const parsed = extractJson<Omit<CohortAIInsights, 'predictiveIsEstimate'>>(raw);

  if (!parsed) {
    console.warn('[AI Engine] Anthropic API failed or credit exhausted. Serving deterministic fallback.');
    return {
      ok: true,
      data: FALLBACK_COHORT_INSIGHT(payload),
      cached: false,
      generatedAt: Date.now(),
    };
  }

  const insights: CohortAIInsights = { ...parsed, predictiveIsEstimate: true };
  const generatedAt = await writeCache('ai_insights_cohort', key, insights);

  return { ok: true, data: insights, cached: false, generatedAt };
}

export async function getStudentAIInsight(
  studentId: string,
  payload: StudentMetricsPayload,
  opts: { forceRefresh?: boolean } = {}
): Promise<AIEngineResult<StudentAIInsight>> {
  const key = `${studentId}_${hashPayload(payload)}`;

  if (!opts.forceRefresh) {
    const cached = await readCache<StudentAIInsight>('ai_insights_student', key, STUDENT_CACHE_TTL_MS);
    if (cached) {
      return { ok: true, data: cached.data, cached: true, generatedAt: cached.generatedAt };
    }
  }

  const userPrompt = `Here is the aggregated performance data for one student:\n\n${JSON.stringify(payload, null, 2)}`;
  const raw = await callClaude(STUDENT_SYSTEM_PROMPT, userPrompt, 900);
  const parsed = extractJson<StudentAIInsight>(raw);

  if (!parsed) {
    console.warn(`[AI Engine] Anthropic API failed for student ${studentId}. Serving fallback insights.`);
    return {
      ok: true,
      data: FALLBACK_STUDENT_INSIGHT(payload),
      cached: false,
      generatedAt: Date.now(),
    };
  }

  const generatedAt = await writeCache('ai_insights_student', key, parsed);
  return { ok: true, data: parsed, cached: false, generatedAt };
}