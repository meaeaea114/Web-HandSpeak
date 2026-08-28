// ==========================================
// AI ANALYTICS CLIENT HELPER (BROWSER-SAFE)
// ==========================================
// Builds minimal, non-PII payloads from data already computed on the
// client from real Firestore data, and calls the server-side AI
// analytics API routes (which hold the actual Anthropic API key).
// No secret ever lives in this file.

import { auth } from './firebase';
import { Student, FourTierAnalytics, parseDateToMs } from './data-service';

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

async function getAuthHeader(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to request AI analytics.');
  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchGestureAndActivitySummary(
  studentIds: string[]
): Promise<{ success: true; gesture: GestureAccuracySummary; activity: ActivityAttemptSummary } | { success: false; error: string }> {
  const empty: GestureAccuracySummary = { hasData: false, totalAttempts: 0, overallAccuracy: null, perSign: [], weakSigns: [], signsMastered: 0 };
  const emptyActivity: ActivityAttemptSummary = { hasData: false, totalAttempts: 0, totalCompleted: 0, avgScore: null };

  if (studentIds.length === 0) {
    return { success: true, gesture: empty, activity: emptyActivity };
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

export function buildCohortMetricsPayload(
  scopeLabel: string,
  analytics: FourTierAnalytics,
  gestureAccuracy: GestureAccuracySummary
) {
  const highRiskCount = analytics.predictive.riskForecast.filter((r) => r.riskLevel === 'HIGH RISK').length;
  const moderateRiskCount = analytics.predictive.riskForecast.filter((r) => r.riskLevel === 'MODERATE').length;
  const fastPacedCount = analytics.predictive.growthForecast.filter((g) => g.growthVelocity === 'FAST-PACED').length;
  const steadyCount = analytics.predictive.growthForecast.filter((g) => g.growthVelocity === 'STEADY').length;

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
    stalledOnboardingCount: analytics.diagnostic.stalledOnboardingCount,
    classPerformance: analytics.descriptive.classPerformance.map((c) => ({
      className: c.className,
      studentCount: c.studentCount,
      avgProgress: c.avgProgress,
      avgXp: c.avgXp,
    })),
    highRiskCount,
    moderateRiskCount,
    fastPacedCount,
    steadyCount,
    gestureAccuracy: {
      hasData: gestureAccuracy.hasData,
      totalAttempts: gestureAccuracy.totalAttempts,
      overallAccuracy: gestureAccuracy.overallAccuracy,
      weakSigns: gestureAccuracy.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
      signsMastered: gestureAccuracy.signsMastered,
    },
  };
}

export function buildStudentMetricsPayload(student: Student, gestureAccuracy: GestureAccuracySummary) {
  const now = Date.now();
  const lastActiveMs =
    parseDateToMs(student.lastActive) ??
    parseDateToMs(student.lastActiveDate) ??
    parseDateToMs(student.lastCompletedChallengeDate) ??
    parseDateToMs(student.rawDoc?.updatedAt) ??
    parseDateToMs(student.createdAt);
  const createdMs = parseDateToMs(student.createdAt);

  const alphabetModule = student.moduleProgress.find((m) => m.moduleId === 'alphabet');
  const numbersModule = student.moduleProgress.find((m) => m.moduleId === 'numbers');

  return {
    firstName: student.firstName || (student.name || 'Student').split(' ')[0],
    gradeLevel: student.gradeLevel,
    section: student.section,
    studentType: student.type,
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
    accountAgeDays: createdMs ? Math.floor((now - createdMs) / (1000 * 60 * 60 * 24)) : null,
    status: student.status,
    gestureAccuracy: {
      hasData: gestureAccuracy.hasData,
      totalAttempts: gestureAccuracy.totalAttempts,
      overallAccuracy: gestureAccuracy.overallAccuracy,
      weakSigns: gestureAccuracy.weakSigns.map((s) => ({ sign: s.sign, module: s.module, attempts: s.attempts, accuracy: s.accuracy })),
    },
  };
}

export async function fetchCohortAIInsights(
  scopeLabel: string,
  analytics: FourTierAnalytics,
  gestureAccuracy: GestureAccuracySummary,
  forceRefresh = false
): Promise<{ success: true; insights: CohortAIInsights; cached: boolean } | { success: false; error: string }> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/analytics/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ metrics: buildCohortMetricsPayload(scopeLabel, analytics, gestureAccuracy), forceRefresh }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to load AI analytics insights.' };
    }
    return { success: true, insights: json.insights, cached: json.cached };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reach the AI analytics service.' };
  }
}

export async function fetchStudentAIInsight(
  student: Student,
  gestureAccuracy: GestureAccuracySummary,
  forceRefresh = false
): Promise<{ success: true; insight: StudentAIInsight; cached: boolean } | { success: false; error: string }> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/analytics/student-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        studentId: student.id || student.uid,
        metrics: buildStudentMetricsPayload(student, gestureAccuracy),
        forceRefresh,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || 'Failed to load this student\'s AI insight.' };
    }
    return { success: true, insight: json.insight, cached: json.cached };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reach the AI analytics service.' };
  }
}
