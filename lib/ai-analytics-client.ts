// ==========================================
// AI ANALYTICS CLIENT HELPER (BROWSER-SAFE)
// ==========================================
// Builds ONE payload per analytics pillar (descriptive/diagnostic/
// predictive/prescriptive) from data already computed on the client
// from real Firestore data, and calls the pillar-aware server routes.
// There is no "build one big payload and summarize everything" path —
// each pillar gets only the data relevant to its own analytical purpose.

import { auth } from './firebase';
import { Student, FourTierAnalytics, computeComprehensiveAnalytics, parseDateToMs } from './data-service';

export type AnalyticsPillar = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';

export interface GestureAccuracySummary {
  hasData: boolean;
  totalAttempts: number;
  overallAccuracy: number | null;
  perSign: { sign: string; module: string; attempts: number; correct: number; accuracy: number; avgConfidence: number | null }[];
  weakSigns: { sign: string; module: string; attempts: number; correct: number; accuracy: number; avgConfidence: number | null }[];
  signsMastered: number;
}

export interface ActivityAttemptSummary {
  hasData: boolean;
  totalAttempts: number;
  totalCompleted: number;
  avgScore: number | null;
}

export const EMPTY_GESTURE_SUMMARY: GestureAccuracySummary = {
  hasData: false,
  totalAttempts: 0,
  overallAccuracy: null,
  perSign: [],
  weakSigns: [],
  signsMastered: 0,
};

// ==========================================
// PILLAR INSIGHT RESPONSE TYPES (mirrors server)
// ==========================================

export interface DescriptiveInsight {
  narrative: string;
  observations: string[];
}
export interface DiagnosticInsight {
  narrative: string;
  contributingFactors: string[];
}
export interface PredictiveInsight {
  hasForecast: boolean;
  narrative: string | null;
  forecastPeriod: string | null;
  evidenceUsed: string[];
  limitation: string | null;
}
export interface PrescriptiveRecommendation {
  target: string;
  action: string;
  reason: string;
  relevantSkill: string | null;
  priority: 'URGENT' | 'HIGH' | 'RECOMMENDED' | 'ENCOURAGE';
  followUp: string;
}
export interface PrescriptiveInsight {
  recommendations: PrescriptiveRecommendation[];
}

export type PillarInsightMap = {
  descriptive: DescriptiveInsight;
  diagnostic: DiagnosticInsight;
  predictive: PredictiveInsight;
  prescriptive: PrescriptiveInsight;
};

// ==========================================
// AUTH
// ==========================================

async function getAuthHeader(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to request AI analytics.');
  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

// ==========================================
// GESTURE / ACTIVITY SUMMARY FETCH (shared by every pillar)
// ==========================================

export async function fetchGestureAndActivitySummary(
  studentIds: string[]
): Promise<{ success: true; gesture: GestureAccuracySummary; activity: ActivityAttemptSummary } | { success: false; error: string }> {
  const emptyActivity: ActivityAttemptSummary = { hasData: false, totalAttempts: 0, totalCompleted: 0, avgScore: null };

  if (studentIds.length === 0) {
    return { success: true, gesture: EMPTY_GESTURE_SUMMARY, activity: emptyActivity };
  }

  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/analytics/gesture-accuracy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ studentIds }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to load gesture/activity analytics.' };
    }
    return { success: true, gesture: json.gesture, activity: json.activity };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reach the gesture analytics service.' };
  }
}

function summarizeGestureForAI(g: GestureAccuracySummary) {
  return {
    hasData: g.hasData,
    totalAttempts: g.totalAttempts,
    overallAccuracy: g.overallAccuracy,
    weakSigns: g.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
    signsMastered: g.signsMastered,
  };
}

// ==========================================
// COHORT-LEVEL PAYLOAD BUILDERS (one per pillar)
// ==========================================

export function buildCohortDescriptivePayload(scopeLabel: string, analytics: FourTierAnalytics, gesture: GestureAccuracySummary) {
  return {
    scopeLabel,
    totalStudents: analytics.descriptive.totalStudents,
    activeCohort: analytics.descriptive.activeCohort,
    pendingCount: analytics.descriptive.pendingCount,
    avgProgress: analytics.descriptive.avgProgress,
    avgXp: analytics.descriptive.avgXp,
    avgStars: analytics.descriptive.avgStars,
    avgStreak: analytics.descriptive.avgStreak,
    totalCompletedLessons: analytics.descriptive.totalCompletedLessons,
    alphabetAvgXp: analytics.diagnostic.moduleComparison.alphabetAvgXp,
    numbersAvgXp: analytics.diagnostic.moduleComparison.numbersAvgXp,
    activeToday: analytics.descriptive.activeToday,
    activeThisWeek: analytics.descriptive.activeThisWeek,
    inactiveOver7Days: analytics.descriptive.inactiveOver7Days,
    classPerformance: analytics.descriptive.classPerformance.map((c) => ({
      className: c.className,
      studentCount: c.studentCount,
      avgProgress: c.avgProgress,
      avgXp: c.avgXp,
    })),
    gestureAccuracy: summarizeGestureForAI(gesture),
  };
}

export function buildCohortDiagnosticPayload(scopeLabel: string, analytics: FourTierAnalytics, gesture: GestureAccuracySummary) {
  return {
    scopeLabel,
    totalStudents: analytics.descriptive.totalStudents,
    findings: analytics.diagnostic.findings.map((f) => ({
      title: f.title,
      category: f.category,
      severity: f.severity,
      description: f.description,
      metric: f.metric,
      affectedCount: f.affectedCount,
    })),
    moduleComparison: analytics.diagnostic.moduleComparison,
    lowestClass: analytics.diagnostic.lowestClass
      ? {
          className: analytics.diagnostic.lowestClass.className,
          avgProgress: analytics.diagnostic.lowestClass.avgProgress,
          studentCount: analytics.diagnostic.lowestClass.studentCount,
        }
      : null,
    stalledOnboardingCount: analytics.diagnostic.stalledOnboardingCount,
    streakCorrelation: analytics.diagnostic.streakCorrelation,
    gestureWeakSigns: gesture.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
    gestureHasData: gesture.hasData,
  };
}

export function buildCohortPredictivePayload(scopeLabel: string, analytics: FourTierAnalytics) {
  return {
    scopeLabel,
    totalStudents: analytics.descriptive.totalStudents,
    riskForecast: analytics.predictive.riskForecast.map((r) => ({
      student: r.student.fullName || r.student.name || 'Student',
      riskLevel: r.riskLevel,
      predictedOutcome: r.predictedOutcome,
      reason: r.reason,
    })),
    growthForecast: analytics.predictive.growthForecast.map((g) => ({
      student: g.student.fullName || g.student.name || 'Student',
      growthVelocity: g.growthVelocity,
      projectedMastery: g.projectedMastery,
      reason: g.reason,
    })),
    projectedCohortAvgNextMonth: analytics.predictive.projectedCohortAvgNextMonth,
    deterministicSummary: analytics.predictive.summary,
  };
}

export function buildCohortPrescriptivePayload(scopeLabel: string, analytics: FourTierAnalytics, gesture: GestureAccuracySummary) {
  return {
    scopeLabel,
    totalStudents: analytics.descriptive.totalStudents,
    directives: analytics.prescriptive.directives.map((d) => ({
      priority: d.priority,
      targetScope: d.targetScope,
      targetType: d.targetType,
      actionDirective: d.actionDirective,
      rationale: d.rationale,
    })),
    riskForecastCount: analytics.predictive.riskForecast.length,
    gestureWeakSigns: gesture.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
  };
}

// ==========================================
// STUDENT-LEVEL PAYLOAD BUILDERS (one per pillar)
// ==========================================
// Diagnostic/Predictive/Prescriptive reuse the SAME real deterministic
// rule engine as the cohort view (computeComprehensiveAnalytics), just
// run against an array containing only this one student — so the
// "forecast" and "directive" a student sees are the literal output of
// the same real analytics engine, evaluated on their own data only.

export function buildStudentDescriptivePayload(student: Student, gesture: GestureAccuracySummary) {
  const now = Date.now();
  const lastActiveMs =
    parseDateToMs(student.lastActive) ??
    parseDateToMs(student.lastActiveDate) ??
    parseDateToMs(student.lastCompletedChallengeDate) ??
    parseDateToMs(student.rawDoc?.updatedAt) ??
    parseDateToMs(student.createdAt);

  const alphabetModule = student.moduleProgress.find((m) => m.moduleId === 'alphabet');
  const numbersModule = student.moduleProgress.find((m) => m.moduleId === 'numbers');

  return {
    firstName: student.firstName || (student.name || 'Student').split(' ')[0],
    gradeLevel: student.gradeLevel,
    section: student.section,
    progress: student.progress,
    xp: student.gamification.xp,
    stars: student.gamification.stars,
    streak: student.gamification.streak,
    completedLessons: student.gamification.completedLessons,
    alphabetXp: student.gamification.alphabetXp,
    alphabetProgress: alphabetModule?.progress ?? 0,
    numbersXp: student.gamification.numbersXp,
    numbersProgress: numbersModule?.progress ?? 0,
    daysSinceLastActive: lastActiveMs ? Math.floor((now - lastActiveMs) / (1000 * 60 * 60 * 24)) : null,
    status: student.status,
    gestureAccuracy: summarizeGestureForAI(gesture),
  };
}

export function buildStudentDiagnosticPayload(student: Student, gesture: GestureAccuracySummary) {
  const now = Date.now();
  const lastActiveMs =
    parseDateToMs(student.lastActive) ??
    parseDateToMs(student.lastActiveDate) ??
    parseDateToMs(student.lastCompletedChallengeDate) ??
    parseDateToMs(student.rawDoc?.updatedAt) ??
    parseDateToMs(student.createdAt);

  const solo = computeComprehensiveAnalytics([student]);
  const alphaXp = student.gamification.alphabetXp;
  const numXp = student.gamification.numbersXp;
  const gap = Math.abs(alphaXp - numXp);
  const moduleGapDescription =
    gap > 0
      ? `${alphaXp >= numXp ? 'Numbers' : 'Alphabet'} XP (${Math.min(alphaXp, numXp)}) lags ${alphaXp >= numXp ? 'Alphabet' : 'Numbers'} XP (${Math.max(alphaXp, numXp)}) by ${gap} XP for this student.`
      : 'Alphabet and Numbers XP are currently balanced for this student.';

  return {
    firstName: student.firstName || (student.name || 'Student').split(' ')[0],
    progress: student.progress,
    alphabetXp: alphaXp,
    numbersXp: numXp,
    moduleGapDescription,
    isStalledOnboarding: solo.diagnostic.stalledOnboardingCount > 0,
    streak: student.gamification.streak,
    daysSinceLastActive: lastActiveMs ? Math.floor((now - lastActiveMs) / (1000 * 60 * 60 * 24)) : null,
    gestureWeakSigns: gesture.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
    gestureHasData: gesture.hasData,
  };
}

export function buildStudentPredictivePayload(student: Student) {
  const solo = computeComprehensiveAnalytics([student]);
  const createdMs = parseDateToMs(student.createdAt);
  const now = Date.now();

  const riskItem = solo.predictive.riskForecast[0]
    ? {
        riskLevel: solo.predictive.riskForecast[0].riskLevel,
        predictedOutcome: solo.predictive.riskForecast[0].predictedOutcome,
        reason: solo.predictive.riskForecast[0].reason,
      }
    : null;

  const growthItem = solo.predictive.growthForecast[0]
    ? {
        growthVelocity: solo.predictive.growthForecast[0].growthVelocity,
        projectedMastery: solo.predictive.growthForecast[0].projectedMastery,
        reason: solo.predictive.growthForecast[0].reason,
      }
    : null;

  return {
    firstName: student.firstName || (student.name || 'Student').split(' ')[0],
    riskItem,
    growthItem,
    accountAgeDays: createdMs ? Math.floor((now - createdMs) / (1000 * 60 * 60 * 24)) : null,
    progress: student.progress,
    streak: student.gamification.streak,
  };
}

export function buildStudentPrescriptivePayload(student: Student, gesture: GestureAccuracySummary) {
  const solo = computeComprehensiveAnalytics([student]);
  const directive = solo.prescriptive.directives[0]
    ? {
        priority: solo.prescriptive.directives[0].priority,
        actionDirective: solo.prescriptive.directives[0].actionDirective,
        rationale: solo.prescriptive.directives[0].rationale,
      }
    : null;

  const alphaXp = student.gamification.alphabetXp;
  const numXp = student.gamification.numbersXp;
  const weakerModule = alphaXp === numXp ? null : alphaXp < numXp ? 'alphabet' : 'numbers';

  return {
    firstName: student.firstName || (student.name || 'Student').split(' ')[0],
    directive,
    progress: student.progress,
    gestureWeakSigns: gesture.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
    weakerModule,
  };
}

// ==========================================
// GENERIC PILLAR FETCHERS
// ==========================================

type FetchResult<P extends AnalyticsPillar> =
  | { success: true; pillar: P; insight: PillarInsightMap[P]; cached: boolean; generatedAt: number | null }
  | { success: false; error: string };

export async function fetchCohortPillarInsight<P extends AnalyticsPillar>(
  pillar: P,
  payload: unknown,
  forceRefresh = false
): Promise<FetchResult<P>> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/analytics/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ pillar, payload, forceRefresh }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || `Failed to load the ${pillar} AI insight.` };
    }
    return { success: true, pillar, insight: json.insight, cached: json.cached, generatedAt: json.generatedAt };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reach the AI analytics service.' };
  }
}

export async function fetchStudentPillarInsight<P extends AnalyticsPillar>(
  pillar: P,
  studentId: string,
  payload: unknown,
  forceRefresh = false
): Promise<FetchResult<P>> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/analytics/student-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ studentId, pillar, payload, forceRefresh }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || `Failed to load the student ${pillar} AI insight.` };
    }
    return { success: true, pillar, insight: json.insight, cached: json.cached, generatedAt: json.generatedAt };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reach the AI analytics service.' };
  }
}
