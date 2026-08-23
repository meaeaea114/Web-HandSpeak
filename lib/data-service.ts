import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';

// ==========================================
// DATA MODELS & INTERFACES
// ==========================================

export interface LevelProgressDetail {
  key: string;
  name: string;
  stars: number;
}

export interface ModuleProgressItem {
  moduleId: string;
  moduleName: string;
  xp: number;
  starsEarned: number;
  totalPossibleStars: number;
  progress: number;
  completedLevels: number;
  totalLevels: number;
  levelDetails: LevelProgressDetail[];
}

export interface StudentAssessment {
  id: string;
  title: string;
  score: number;
  completedAt: any;
}

export interface GamificationData {
  xp: number;
  weeklyXp: number;
  dailyXp: number;
  stars: number;
  streak: number;
  alphabetXp: number;
  numbersXp: number;
  completedLessons: number;
  lastCompletedChallengeDate?: string;
}

export interface TeacherNote {
  id: string;
  authorName: string;
  authorUid: string;
  content: string;
  createdAt: any;
}

export interface TeacherProfile {
  id: string;
  uid: string;
  name: string;
  fullName: string;
  email: string;
  employeeId?: string;
  department?: string;
  status: 'active' | 'pending' | 'approved' | 'rejected' | 'inactive' | 'archived' | 'deactivated';
  avatar?: string;
  createdAt?: any;
  lastActive?: any;
  handledClasses?: string[];
  role: string;
  rawDoc?: Record<string, any>;
}

export interface Student {
  id: string;
  uid: string;
  name: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  middleInitial?: string;
  lastName?: string;
  studentId: string;
  email: string;
  type: 'SNED' | 'REGULAR';
  section: string;
  gradeLevel: string;
  schoolName: string;
  status: 'active' | 'pending' | 'approved' | 'rejected' | 'inactive' | 'archived' | 'deactivated';
  temporaryPassword?: string;
  currentModule: string;
  currentTask?: string;
  progress: number;
  score: number | null;
  avatar: string;
  createdAt: any;
  lastActive: any;
  lastActiveDate?: any;
  lastCompletedChallengeDate?: string;
  approvedAt?: any;
  approvedBy?: string;
  rejectedAt?: any;
  rejectionReason?: string;
  reviewedBy?: string;
  archivedAt?: any;
  deactivatedAt?: any;
  gamification: GamificationData;
  moduleProgress: ModuleProgressItem[];
  assessments?: StudentAssessment[];
  teacherNotes?: TeacherNote[];
  rawDoc?: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  user: string;
  userName?: string;
  userRole?: string;
  action: string;
  title?: string;
  target?: string;
  description?: string;
  type: 'auth' | 'content' | 'student' | 'system';
  timestamp: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author?: string;
  targetRole?: 'all' | 'admin' | 'teacher' | 'student';
  createdAt?: any;
  timestamp?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BulkUploadRowValidation {
  rowNumber: number;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  email: string;
  studentId: string;
  gradeLevel: string;
  section: string;
  classification: 'SNED' | 'REGULAR';
  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingInDatabase: boolean;
  errorReason?: string;
}

export interface BulkUploadValidationResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateInFileCount: number;
  existingInDbCount: number;
  rows: BulkUploadRowValidation[];
}

// Dashboard & Analytics Engine Interfaces
export interface ClassPerformanceItem {
  className: string;
  gradeLevel: string;
  section: string;
  studentCount: number;
  totalXp: number;
  avgXp: number;
  avgProgress: number;
}

export interface DashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
  totalXp: number;
  avgXp: number;
  avgProgress: number;
  totalAlphabetXp: number;
  totalNumbersXp: number;
  classPerformance: ClassPerformanceItem[];
  inactiveStudents: Student[];
  topStudents: Student[];
}

export interface DiagnosticFinding {
  id: string;
  title: string;
  category: 'Engagement' | 'Curriculum' | 'Performance' | 'Attendance';
  severity: 'high' | 'medium' | 'low';
  description: string;
  metric: string;
  affectedCount: number;
}

export interface PredictiveRiskItem {
  student: Student;
  riskLevel: 'HIGH RISK' | 'MODERATE' | 'LOW RISK';
  predictedOutcome: string;
  reason: string;
}

export interface PredictiveGrowthItem {
  student: Student;
  growthVelocity: 'FAST-PACED' | 'STEADY';
  projectedMastery: string;
  reason: string;
}

export interface PrescriptiveDirective {
  id: string;
  priority: 'URGENT' | 'HIGH' | 'RECOMMENDED' | 'ENCOURAGE';
  targetScope: string;
  targetType: 'STUDENT' | 'CLASS' | 'MODULE' | 'COHORT';
  actionDirective: string;
  rationale: string;
}

export interface FourTierAnalytics {
  descriptive: {
    totalStudents: number;
    activeCohort: number;
    pendingCount: number;
    totalXp: number;
    avgXp: number;
    avgProgress: number;
    totalCompletedLessons: number;
    avgStars: number;
    avgStreak: number;
    alphabetXp: number;
    numbersXp: number;
    classPerformance: ClassPerformanceItem[];
    activeToday: number;
    activeThisWeek: number;
    inactiveOver7Days: number;
  };
  diagnostic: {
    findings: DiagnosticFinding[];
    moduleComparison: {
      alphabetAvgXp: number;
      numbersAvgXp: number;
      lowerModule: string;
      gapDifference: number;
    };
    lowestClass: ClassPerformanceItem | null;
    stalledOnboardingCount: number;
    streakCorrelation: string;
  };
  predictive: {
    riskForecast: PredictiveRiskItem[];
    growthForecast: PredictiveGrowthItem[];
    projectedCohortAvgNextMonth: number;
    summary: string;
  };
  prescriptive: {
    directives: PrescriptiveDirective[];
  };
}

// ==========================================
// DOCUMENT MAPPER
// ==========================================

export function mapDocToStudent(docSnap: any): Student {
  const data = docSnap.data() || {};
  
  const rawType = (data.studentType || data.type || (data.isSned ? 'SNED' : 'REGULAR')).toString().toUpperCase();
  const normalizedType: 'SNED' | 'REGULAR' = rawType.includes('SNED') ? 'SNED' : 'REGULAR';

  let normalizedStatus: Student['status'] = 'active';
  const statusStr = (data.status || 'pending').toString().toLowerCase();
  if (statusStr === 'archived') normalizedStatus = 'archived';
  else if (statusStr === 'rejected') normalizedStatus = 'rejected';
  else if (statusStr === 'pending') normalizedStatus = 'pending';
  else if (statusStr === 'approved' || statusStr === 'active') normalizedStatus = 'approved';
  else if (statusStr === 'deactivated' || statusStr === 'inactive' || statusStr === 'suspended') normalizedStatus = 'deactivated';
  else normalizedStatus = 'active';

  const gamification: GamificationData = {
    xp: typeof data.xp === 'number' ? data.xp : 0,
    weeklyXp: typeof data.weeklyXp === 'number' ? data.weeklyXp : 0,
    dailyXp: typeof data.dailyXp === 'number' ? data.dailyXp : 0,
    stars: typeof data.stars === 'number' ? data.stars : 0,
    streak: typeof data.streak === 'number' ? data.streak : 0,
    alphabetXp: typeof data.alphabetXp === 'number' ? data.alphabetXp : 0,
    numbersXp: typeof data.numbersXp === 'number' ? data.numbersXp : 0,
    completedLessons: typeof data.completedLessons === 'number' ? data.completedLessons : 0,
    lastCompletedChallengeDate: data.lastCompletedChallengeDate || undefined,
  };

  const progressMap = (data.progress && typeof data.progress === 'object') ? data.progress : {};
  
  const alphabetLevels: LevelProgressDetail[] = [];
  const numbersLevels: LevelProgressDetail[] = [];

  Object.entries(progressMap).forEach(([key, val]) => {
    const starCount = typeof val === 'number' ? val : 0;
    const cleanName = key.replace(/_/g, ' ').toUpperCase();
    if (key.startsWith('alphabet')) {
      alphabetLevels.push({ key, name: cleanName, stars: starCount });
    } else if (key.startsWith('numbers')) {
      numbersLevels.push({ key, name: cleanName, stars: starCount });
    }
  });

  const alphabetStars = alphabetLevels.reduce((sum, l) => sum + l.stars, 0);
  const alphabetMaxStars = Math.max(alphabetLevels.length * 3, 15);
  const alphabetPercent = alphabetLevels.length > 0 ? Math.round((alphabetStars / alphabetMaxStars) * 100) : 0;

  const numbersStars = numbersLevels.reduce((sum, l) => sum + l.stars, 0);
  const numbersMaxStars = Math.max(numbersLevels.length * 3, 15);
  const numbersPercent = numbersLevels.length > 0 ? Math.round((numbersStars / numbersMaxStars) * 100) : 0;

  const totalCompletedStars = alphabetStars + numbersStars;
  const totalMaxStars = alphabetMaxStars + numbersMaxStars;
  const overallCalculatedProgress = (alphabetLevels.length > 0 || numbersLevels.length > 0)
    ? Math.round((totalCompletedStars / totalMaxStars) * 100)
    : (gamification.xp > 0 ? Math.min(Math.round((gamification.xp / 3000) * 100), 100) : 0);

  const modulesList: ModuleProgressItem[] = [
    {
      moduleId: 'alphabet',
      moduleName: 'FSL Alphabet',
      xp: gamification.alphabetXp,
      starsEarned: alphabetStars,
      totalPossibleStars: alphabetMaxStars,
      progress: alphabetPercent,
      completedLevels: alphabetLevels.filter(l => l.stars >= 3).length,
      totalLevels: alphabetLevels.length || 5,
      levelDetails: alphabetLevels,
    },
    {
      moduleId: 'numbers',
      moduleName: 'FSL Numbers',
      xp: gamification.numbersXp,
      starsEarned: numbersStars,
      totalPossibleStars: numbersMaxStars,
      progress: numbersPercent,
      completedLevels: numbersLevels.filter(l => l.stars >= 3).length,
      totalLevels: numbersLevels.length || 5,
      levelDetails: numbersLevels,
    }
  ];

  let currentActiveModule = 'FSL Alphabet';
  if (gamification.numbersXp > 0 && numbersPercent < 100) {
    currentActiveModule = 'FSL Numbers';
  } else if (alphabetPercent === 100 && numbersPercent === 100) {
    currentActiveModule = 'Common Phrases';
  }

  const teacherNotesList: TeacherNote[] = Array.isArray(data.teacherNotes) 
    ? data.teacherNotes 
    : (data.notes && typeof data.notes === 'string' ? [{
        id: 'note-init',
        authorName: 'Instructor',
        authorUid: 'teacher',
        content: data.notes,
        createdAt: data.updatedAt || data.createdAt || null
      }] : []);

  const rawScore = data.score !== undefined ? data.score : (overallCalculatedProgress > 0 ? overallCalculatedProgress : null);

  return {
    id: docSnap.id,
    uid: data.uid || docSnap.id,
    name: data.name || data.fullName || 'Student',
    fullName: data.name || data.fullName || 'Student',
    firstName: data.firstName || '',
    middleName: data.middleName || '',
    middleInitial: data.middleInitial || '',
    lastName: data.lastName || '',
    studentId: data.studentId || `STU-${docSnap.id.slice(0, 5).toUpperCase()}`,
    email: data.email || 'No email registered',
    type: normalizedType,
    section: data.section || 'General Section',
    gradeLevel: data.gradeLevel || data.grade || 'Grade 1',
    schoolName: data.schoolName || 'Sto. Tomas North Central School',
    status: normalizedStatus,
    temporaryPassword: data.temporaryPassword || data.initialPassword || undefined,
    currentModule: currentActiveModule,
    currentTask: `${gamification.completedLessons} Lessons Mastered`,
    progress: overallCalculatedProgress,
    score: rawScore,
    avatar: data.avatar || data.photoURL || '',
    createdAt: data.createdAt || null,
    lastActive: data.lastActive || data.lastActiveDate || data.updatedAt || data.createdAt || null,
    lastActiveDate: data.lastActiveDate || null,
    lastCompletedChallengeDate: data.lastCompletedChallengeDate || undefined,
    approvedAt: data.approvedAt || null,
    approvedBy: data.approvedBy || '',
    rejectedAt: data.rejectedAt || null,
    rejectionReason: data.rejectionReason || '',
    reviewedBy: data.reviewedBy || '',
    archivedAt: data.archivedAt || null,
    deactivatedAt: data.deactivatedAt || null,
    gamification,
    moduleProgress: modulesList,
    assessments: Array.isArray(data.assessments) ? data.assessments : [],
    teacherNotes: teacherNotesList,
    rawDoc: data,
  };
}

// ==========================================
// DASHBOARD METRIC CALCULATOR
// ==========================================

export function parseDateToMs(field: any): number | null {
  if (!field) return null;
  if (typeof field.toDate === 'function') return field.toDate().getTime();
  if (field instanceof Date) return field.getTime();
  if (typeof field === 'number') return field;
  if (typeof field === 'string') {
    const parsed = new Date(field).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  if (field.seconds) return field.seconds * 1000;
  return null;
}

export function calculateDashboardMetrics(students: Student[]): DashboardMetrics {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let totalXp = 0;
  let totalProgress = 0;
  let totalAlphabetXp = 0;
  let totalNumbersXp = 0;
  let activeStudents = 0;
  let pendingStudents = 0;

  const classMap = new Map<string, {
    className: string;
    gradeLevel: string;
    section: string;
    studentCount: number;
    totalXp: number;
    totalProgress: number;
  }>();

  const inactiveStudents: Student[] = [];

  students.forEach((student) => {
    const xp = Number(student.gamification?.xp) || 0;
    const progress = Number(student.progress) || 0;
    const alphaXp = Number(student.gamification?.alphabetXp) || 0;
    const numXp = Number(student.gamification?.numbersXp) || 0;
    const completedLessons = Number(student.gamification?.completedLessons) || 0;

    totalXp += xp;
    totalProgress += progress;
    totalAlphabetXp += alphaXp;
    totalNumbersXp += numXp;

    const st = (student.status || 'active').toLowerCase();
    if (st === 'pending') {
      pendingStudents++;
    } else if (st === 'active' || st === 'approved') {
      activeStudents++;
    }

    // Grouping by gradeLevel + section
    const rawGrade = student.gradeLevel || 'Grade 1';
    const grade = rawGrade.toLowerCase().startsWith('grade') ? rawGrade : `Grade ${rawGrade}`;
    const sec = student.section && student.section !== 'N/A' && student.section !== 'General Section' ? student.section : 'General';
    const classKey = `${grade} - ${sec}`;

    const existingClass = classMap.get(classKey) || {
      className: classKey,
      gradeLevel: grade,
      section: sec,
      studentCount: 0,
      totalXp: 0,
      totalProgress: 0,
    };

    existingClass.studentCount += 1;
    existingClass.totalXp += xp;
    existingClass.totalProgress += progress;
    classMap.set(classKey, existingClass);

    // Resolve most recent activity timestamp across all fields
    const lastActiveMs = 
      parseDateToMs(student.lastActive) ?? 
      parseDateToMs(student.lastActiveDate) ?? 
      parseDateToMs(student.lastCompletedChallengeDate) ?? 
      parseDateToMs(student.rawDoc?.updatedAt) ?? 
      parseDateToMs(student.createdAt);

    // 1. High Mastery Exclusion: >= 80% progress is completed/mastered (e.g. Heart with 97%)
    const isMastered = progress >= 80;

    // 2. Critically Low Progress / Stalled Onboarding (< 25% progress or 0 completed lessons)
    const isStalledOrLowProgress = progress < 25 || completedLessons === 0;

    // 3. Extended Inactivity (> 7 days without having finished)
    const isInactiveOver7Days = lastActiveMs ? lastActiveMs < sevenDaysAgo : false;

    // 4. Pending Account Status
    const isPendingStatus = st === 'pending';

    // Flag student if NOT mastered and matches any condition (Yields 7 for your 8-student cohort)
    if (!isMastered && (isStalledOrLowProgress || isInactiveOver7Days || isPendingStatus)) {
      inactiveStudents.push(student);
    }
  });

  const totalStudents = students.length;
  const avgXp = totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0;
  const avgProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0;

  const classPerformance: ClassPerformanceItem[] = Array.from(classMap.values()).map((c) => ({
    className: c.className,
    gradeLevel: c.gradeLevel,
    section: c.section,
    studentCount: c.studentCount,
    totalXp: c.totalXp,
    avgXp: c.studentCount > 0 ? Math.round(c.totalXp / c.studentCount) : 0,
    avgProgress: c.studentCount > 0 ? Math.round(c.totalProgress / c.studentCount) : 0,
  })).sort((a, b) => b.avgXp - a.avgXp);

  const topStudents = [...students].sort((a, b) => (b.gamification?.xp || 0) - (a.gamification?.xp || 0)).slice(0, 5);

  return {
    totalStudents,
    activeStudents,
    pendingStudents,
    totalXp,
    avgXp,
    avgProgress,
    totalAlphabetXp,
    totalNumbersXp,
    classPerformance,
    inactiveStudents,
    topStudents,
  };
}

// ==========================================
// 4-TIER COMPREHENSIVE ANALYTICS ENGINE
// ==========================================

export function computeComprehensiveAnalytics(students: Student[]): FourTierAnalytics {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let totalXp = 0;
  let totalProgress = 0;
  let totalCompletedLessons = 0;
  let totalStars = 0;
  let totalStreak = 0;
  let totalAlphabetXp = 0;
  let totalNumbersXp = 0;
  let activeCohort = 0;
  let pendingCount = 0;
  let activeToday = 0;
  let activeThisWeek = 0;
  let inactiveOver7Days = 0;

  const classMap = new Map<string, {
    className: string;
    gradeLevel: string;
    section: string;
    studentCount: number;
    totalXp: number;
    totalProgress: number;
  }>();

  const riskForecast: PredictiveRiskItem[] = [];
  const growthForecast: PredictiveGrowthItem[] = [];
  const directives: PrescriptiveDirective[] = [];

  let highStreakCount = 0;
  let highStreakProgressSum = 0;
  let lowStreakCount = 0;
  let lowStreakProgressSum = 0;
  let stalledOnboardingCount = 0;

  students.forEach((s) => {
    const xp = Number(s.gamification?.xp) || 0;
    const progress = Number(s.progress) || 0;
    const stars = Number(s.gamification?.stars) || 0;
    const streak = Number(s.gamification?.streak) || 0;
    const alphaXp = Number(s.gamification?.alphabetXp) || 0;
    const numXp = Number(s.gamification?.numbersXp) || 0;
    const lessons = Number(s.gamification?.completedLessons) || 0;

    totalXp += xp;
    totalProgress += progress;
    totalCompletedLessons += lessons;
    totalStars += stars;
    totalStreak += streak;
    totalAlphabetXp += alphaXp;
    totalNumbersXp += numXp;

    const st = (s.status || 'active').toLowerCase();
    if (st === 'pending') pendingCount++;
    if (st === 'active' || st === 'approved') activeCohort++;

    const lastActiveMs = 
      parseDateToMs(s.lastActive) ?? 
      parseDateToMs(s.lastActiveDate) ?? 
      parseDateToMs(s.lastCompletedChallengeDate) ?? 
      parseDateToMs(s.rawDoc?.updatedAt) ?? 
      parseDateToMs(s.createdAt);

    if (lastActiveMs && lastActiveMs >= oneDayAgo) activeToday++;
    if (lastActiveMs && lastActiveMs >= sevenDaysAgo) activeThisWeek++;
    if (!lastActiveMs || lastActiveMs < sevenDaysAgo) inactiveOver7Days++;

    // Streak Correlation Data Gathering
    if (streak >= 2) {
      highStreakCount++;
      highStreakProgressSum += progress;
    } else {
      lowStreakCount++;
      lowStreakProgressSum += progress;
    }

    if (progress < 25 || lessons === 0) {
      stalledOnboardingCount++;
    }

    // Class Grouping
    const rawGrade = s.gradeLevel || 'Grade 1';
    const grade = rawGrade.toLowerCase().startsWith('grade') ? rawGrade : `Grade ${rawGrade}`;
    const sec = s.section && s.section !== 'N/A' && s.section !== 'General Section' ? s.section : 'General';
    const classKey = `${grade} - ${sec}`;

    const existingClass = classMap.get(classKey) || {
      className: classKey,
      gradeLevel: grade,
      section: sec,
      studentCount: 0,
      totalXp: 0,
      totalProgress: 0,
    };
    existingClass.studentCount += 1;
    existingClass.totalXp += xp;
    existingClass.totalProgress += progress;
    classMap.set(classKey, existingClass);

    // PREDICTIVE ENGINE EVALUATION (Data-Driven Estimator)
    const isMastered = progress >= 80;
    if (isMastered) {
      growthForecast.push({
        student: s,
        growthVelocity: 'FAST-PACED',
        projectedMastery: '100% Curriculum Mastery Achieved',
        reason: `Exemplary mastery (${progress}% progress, ${xp.toLocaleString()} XP) achieved through active sign execution.`,
      });
    } else if (progress === 0 && lessons === 0) {
      riskForecast.push({
        student: s,
        riskLevel: 'HIGH RISK',
        predictedOutcome: 'High risk of onboarding dropout / inactivity',
        reason: 'Zero completed lessons recorded since account provision. Requires guided walkthrough.',
      });
      directives.push({
        id: `dir_${s.id || s.uid}`,
        priority: 'URGENT',
        targetScope: s.fullName || s.name,
        targetType: 'STUDENT',
        actionDirective: 'Provide initial lesson onboarding walkthrough and verify mobile device access.',
        rationale: `Student is registered in ${s.gradeLevel} - ${s.section} but has not completed any FSL gesture drills yet.`,
      });
    } else if (progress < 25) {
      riskForecast.push({
        student: s,
        riskLevel: 'HIGH RISK',
        predictedOutcome: 'Likely to stall in early gesture modules',
        reason: `Critically low progress (${progress}%) with low XP (${xp} XP).`,
      });
      directives.push({
        id: `dir_${s.id || s.uid}`,
        priority: 'HIGH',
        targetScope: s.fullName || s.name,
        targetType: 'STUDENT',
        actionDirective: 'Schedule targeted one-on-one hand posture and gesture orientation review.',
        rationale: `Student progress is currently stalled at ${progress}%.`,
      });
    } else if (!lastActiveMs || lastActiveMs < sevenDaysAgo) {
      riskForecast.push({
        student: s,
        riskLevel: 'MODERATE',
        predictedOutcome: 'Risk of retention loss due to activity lapse',
        reason: 'Inactive for > 7 days. Learning momentum is declining.',
      });
      directives.push({
        id: `dir_${s.id || s.uid}`,
        priority: 'RECOMMENDED',
        targetScope: s.fullName || s.name,
        targetType: 'STUDENT',
        actionDirective: 'Send reminder notification or conduct quick attendance welfare check.',
        rationale: 'Prolonged inactivity detected (> 7 days without practice).',
      });
    } else if (streak >= 1) {
      growthForecast.push({
        student: s,
        growthVelocity: streak >= 3 ? 'FAST-PACED' : 'STEADY',
        projectedMastery: `Projected ${Math.min(progress + 20, 100)}% mastery in upcoming cycle`,
        reason: `Consistent activity streak (${streak} days) driving steady progress velocity.`,
      });
    }
  });

  const totalStudents = students.length;
  const avgXp = totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0;
  const avgProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0;
  const avgStars = totalStudents > 0 ? Math.round((totalStars / totalStudents) * 10) / 10 : 0;
  const avgStreak = totalStudents > 0 ? Math.round((totalStreak / totalStudents) * 10) / 10 : 0;

  const classPerformance: ClassPerformanceItem[] = Array.from(classMap.values()).map((c) => ({
    className: c.className,
    gradeLevel: c.gradeLevel,
    section: c.section,
    studentCount: c.studentCount,
    totalXp: c.totalXp,
    avgXp: c.studentCount > 0 ? Math.round(c.totalXp / c.studentCount) : 0,
    avgProgress: c.studentCount > 0 ? Math.round(c.totalProgress / c.studentCount) : 0,
  })).sort((a, b) => b.avgProgress - a.avgProgress);

  // DIAGNOSTIC ENGINE COMPUTATION
  const alphabetAvgXp = totalStudents > 0 ? Math.round(totalAlphabetXp / totalStudents) : 0;
  const numbersAvgXp = totalStudents > 0 ? Math.round(totalNumbersXp / totalStudents) : 0;
  const lowerModule = numbersAvgXp < alphabetAvgXp ? 'FSL Numbers' : 'FSL Alphabet';
  const gapDifference = Math.abs(alphabetAvgXp - numbersAvgXp);

  const lowestClass = classPerformance.length > 0 ? classPerformance[classPerformance.length - 1] : null;

  const findings: DiagnosticFinding[] = [];

  if (stalledOnboardingCount > 0) {
    findings.push({
      id: 'diag_1',
      title: 'Initial Onboarding Stoppage',
      category: 'Engagement',
      severity: 'high',
      description: `${stalledOnboardingCount} out of ${totalStudents} students have not yet mastered initial FSL gesture levels or have 0% progress.`,
      metric: `${stalledOnboardingCount} Learners (${Math.round((stalledOnboardingCount / (totalStudents || 1)) * 100)}%)`,
      affectedCount: stalledOnboardingCount,
    });
  }

  if (gapDifference > 50) {
    findings.push({
      id: 'diag_2',
      title: 'Module Performance Disparity',
      category: 'Curriculum',
      severity: 'medium',
      description: `Student engagement in ${lowerModule} (${lowerModule === 'FSL Numbers' ? numbersAvgXp : alphabetAvgXp} avg XP) lags behind ${lowerModule === 'FSL Numbers' ? 'FSL Alphabet' : 'FSL Numbers'} (${lowerModule === 'FSL Numbers' ? alphabetAvgXp : numbersAvgXp} avg XP).`,
      metric: `${gapDifference} XP Average Gap`,
      affectedCount: totalStudents,
    });

    directives.push({
      id: 'dir_module_gap',
      priority: 'RECOMMENDED',
      targetScope: lowerModule,
      targetType: 'MODULE',
      actionDirective: `Organize instructor-led group gesture practice focusing specifically on ${lowerModule}.`,
      rationale: `Data shows significant XP disparity between Alphabet and Numbers modules.`,
    });
  }

  if (lowestClass && lowestClass.avgProgress < 50 && totalStudents > 1) {
    findings.push({
      id: 'diag_3',
      title: 'Class Section Performance Lag',
      category: 'Performance',
      severity: 'medium',
      description: `${lowestClass.className} has an average progress of ${lowestClass.avgProgress}%, which is below the cohort benchmark.`,
      metric: `${lowestClass.avgProgress}% Avg Progress`,
      affectedCount: lowestClass.studentCount,
    });

    directives.push({
      id: `dir_class_${lowestClass.className}`,
      priority: 'HIGH',
      targetScope: lowestClass.className,
      targetType: 'CLASS',
      actionDirective: `Review section-level lesson pacing and conduct in-class sign recognition review for ${lowestClass.className}.`,
      rationale: `Section average progress (${lowestClass.avgProgress}%) lags behind other sections.`,
    });
  }

  const highStreakAvgProgress = highStreakCount > 0 ? Math.round(highStreakProgressSum / highStreakCount) : 0;
  const lowStreakAvgProgress = lowStreakCount > 0 ? Math.round(lowStreakProgressSum / lowStreakCount) : 0;
  const streakCorrelation = highStreakCount > 0 && lowStreakCount > 0
    ? `Students maintaining an active streak demonstrate higher average mastery (${highStreakAvgProgress}%) compared to non-streak learners (${lowStreakAvgProgress}%).`
    : 'Maintain regular daily practice streaks to drive higher mastery progress.';

  // Cohort Growth Projection
  const projectedCohortAvgNextMonth = Math.min(Math.round(avgProgress + (activeToday > 0 ? 15 : 5)), 100);

  return {
    descriptive: {
      totalStudents,
      activeCohort,
      pendingCount,
      totalXp,
      avgXp,
      avgProgress,
      totalCompletedLessons,
      avgStars,
      avgStreak,
      alphabetXp: totalAlphabetXp,
      numbersXp: totalNumbersXp,
      classPerformance,
      activeToday,
      activeThisWeek,
      inactiveOver7Days,
    },
    diagnostic: {
      findings,
      moduleComparison: {
        alphabetAvgXp,
        numbersAvgXp,
        lowerModule,
        gapDifference,
      },
      lowestClass,
      stalledOnboardingCount,
      streakCorrelation,
    },
    predictive: {
      riskForecast: riskForecast.slice(0, 6),
      growthForecast: growthForecast.slice(0, 6),
      projectedCohortAvgNextMonth,
      summary: totalStudents > 0 
        ? `Based on current trajectory, cohort progress is estimated to reach ${projectedCohortAvgNextMonth}% next month with ${riskForecast.length} students requiring intervention.`
        : 'Insufficient historical telemetry to compile future cohort projection.',
    },
    prescriptive: {
      directives: directives.slice(0, 6),
    },
  };
}

// ==========================================
// STUDENT SERVICES
// ==========================================

export async function getStudents(): Promise<Student[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'student'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocToStudent);
  } catch (error) {
    console.error('Error fetching students from Firestore:', error);
    throw new Error('Failed to load real student records from database.');
  }
}

export function getStudentsRealtime(
  onSuccess: (students: Student[]) => void,
  onError: (error: Error) => void
) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'student'));

    return onSnapshot(
      q,
      (snapshot) => {
        const students = snapshot.docs.map(mapDocToStudent);
        onSuccess(students);
      },
      (err) => {
        console.error('Realtime student subscription error:', err);
        onError(new Error(err.message || 'Error subscribing to student data.'));
      }
    );
  } catch (error: any) {
    onError(error);
    return () => {};
  }
}

export async function getStudentDeepDetails(studentId: string): Promise<Partial<Student>> {
  try {
    const studentDocRef = doc(db, 'users', studentId);
    const studentSnap = await getDoc(studentDocRef);
    if (!studentSnap.exists()) return {};
    return mapDocToStudent(studentSnap);
  } catch (error) {
    console.error('Error fetching student details:', error);
    return {};
  }
}

// ==========================================
// ACCOUNT ACTIONS & DRAWER SERVICES
// ==========================================

export function getStudentAccountRequestsRealtime(
  onSuccess: (students: Student[]) => void,
  onError: (error: Error) => void
) {
  return getStudentsRealtime(onSuccess, onError);
}

export async function approveStudentAccountRequest(studentId: string, reviewerName: string): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: reviewerName,
    reviewedBy: reviewerName,
    updatedAt: serverTimestamp(),
  });
}

export async function deactivateStudentAccount(studentId: string, reviewerName: string): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    status: 'deactivated',
    deactivatedAt: serverTimestamp(),
    reviewedBy: reviewerName,
    updatedAt: serverTimestamp(),
  });
}

export async function activateStudentAccount(studentId: string, reviewerName: string): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: reviewerName,
    reviewedBy: reviewerName,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectStudentAccountRequest(
  studentId: string,
  reviewerName: string,
  rejectionReason: string
): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    status: 'rejected',
    rejectionReason: rejectionReason.trim(),
    rejectedAt: serverTimestamp(),
    reviewedBy: reviewerName,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveStudent(studentId: string): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    status: 'archived',
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreStudent(studentId: string): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
}

export async function updateStudentClassAssignment(
  studentId: string, 
  updates: { gradeLevel?: string; section?: string; status?: Student['status'] }
): Promise<void> {
  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function addTeacherNoteToStudent(
  studentId: string,
  noteText: string,
  teacherName: string,
  teacherUid: string
): Promise<TeacherNote> {
  const newNote: TeacherNote = {
    id: `note_${Date.now()}`,
    authorName: teacherName || 'Teacher',
    authorUid: teacherUid || 'unknown',
    content: noteText.trim(),
    createdAt: new Date().toISOString(),
  };

  const studentRef = doc(db, 'users', studentId);
  await updateDoc(studentRef, {
    teacherNotes: arrayUnion(newNote),
    updatedAt: serverTimestamp(),
  });

  return newNote;
}

// ==========================================
// EXCEL (.XLSX / .XLS) & CSV SPREADSHEET PARSER
// ==========================================

export async function validateSpreadsheetFile(file: File): Promise<BulkUploadValidationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The uploaded spreadsheet does not contain any valid worksheet.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length <= 1) {
    throw new Error('The spreadsheet is empty or missing data rows.');
  }

  const headerCols = (rawRows[0] || []).map((h: any) => String(h).trim().toLowerCase());
  
  let firstNameIdx = headerCols.findIndex((h: string) => h.includes('first'));
  let middleNameIdx = headerCols.findIndex((h: string) => h.includes('middle'));
  let lastNameIdx = headerCols.findIndex((h: string) => h.includes('last') || h.includes('surname'));
  let fullNameIdx = headerCols.findIndex((h: string) => h === 'full name' || h === 'name');
  let emailIdx = headerCols.findIndex((h: string) => h.includes('email'));
  let studentIdIdx = headerCols.findIndex((h: string) => h.includes('student') || h.includes('id') || h.includes('lrn'));
  let gradeIdx = headerCols.findIndex((h: string) => h.includes('grade'));
  let sectionIdx = headerCols.findIndex((h: string) => h.includes('section'));
  let classificationIdx = headerCols.findIndex((h: string) => h.includes('class') || h.includes('type'));

  if (firstNameIdx === -1 && fullNameIdx === -1) firstNameIdx = 0;
  if (emailIdx === -1) emailIdx = firstNameIdx === 0 && lastNameIdx === -1 ? 1 : 3;
  if (studentIdIdx === -1) studentIdIdx = emailIdx === 1 ? 2 : 4;
  if (gradeIdx === -1) gradeIdx = studentIdIdx + 1;
  if (sectionIdx === -1) sectionIdx = gradeIdx + 1;
  if (classificationIdx === -1) classificationIdx = sectionIdx + 1;

  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  const existingEmails = new Set<string>();
  const existingStudentIds = new Set<string>();

  snapshot.docs.forEach((docSnap) => {
    const d = docSnap.data() || {};
    if (d.email) existingEmails.add(String(d.email).toLowerCase().trim());
    if (d.studentId) existingStudentIds.add(String(d.studentId).toUpperCase().trim());
  });

  const parsedRows: BulkUploadRowValidation[] = [];
  const fileEmails = new Set<string>();
  const fileStudentIds = new Set<string>();

  let validCount = 0;
  let invalidCount = 0;
  let duplicateInFileCount = 0;
  let existingInDbCount = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every((c: any) => String(c).trim() === '')) continue;

    let firstName = '';
    let middleName = '';
    let lastName = '';

    if (firstNameIdx !== -1 && lastNameIdx !== -1 && row[firstNameIdx] && row[lastNameIdx]) {
      firstName = String(row[firstNameIdx] || '').trim();
      middleName = middleNameIdx !== -1 ? String(row[middleNameIdx] || '').trim() : '';
      lastName = String(row[lastNameIdx] || '').trim();
    } else if (fullNameIdx !== -1 && row[fullNameIdx]) {
      const parts = String(row[fullNameIdx]).trim().split(' ').filter(Boolean);
      firstName = parts[0] || '';
      lastName = parts.length > 1 ? parts[parts.length - 1] : '';
      middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    } else {
      firstName = String(row[0] || '').trim();
      middleName = row.length > 6 ? String(row[1] || '').trim() : '';
      lastName = row.length > 6 ? String(row[2] || '').trim() : String(row[1] || '').trim();
    }

    const email = String(row[emailIdx] || '').toLowerCase().trim();
    const studentId = String(row[studentIdIdx] || '').toUpperCase().trim();
    const rawGrade = String(row[gradeIdx] || 'Grade 1').trim();
    const gradeLevel = rawGrade.toLowerCase().includes('grade') ? rawGrade : `Grade ${rawGrade}`;
    const section = String(row[sectionIdx] || 'Narra').trim();
    const classificationRaw = String(row[classificationIdx] || 'Regular').toUpperCase().trim();
    const classification: 'SNED' | 'REGULAR' = classificationRaw.includes('SNED') ? 'SNED' : 'REGULAR';

    const miDisplay = middleName ? `${middleName.charAt(0).toUpperCase()}.` : '';
    const compiledFullName = [firstName, miDisplay, lastName].filter(Boolean).join(' ');

    let isValid = true;
    let isDuplicateInFile = false;
    let isExistingInDatabase = false;
    let errorReason = '';

    if (!firstName || !lastName) {
      isValid = false;
      errorReason = 'Missing first name or surname';
    } else if (!email || !email.includes('@')) {
      isValid = false;
      errorReason = 'Invalid email address';
    } else if (!studentId || studentId.length < 5 || studentId.length > 12) {
      isValid = false;
      errorReason = 'Student ID must be 5-12 digits';
    }

    if (isValid) {
      if (fileEmails.has(email) || fileStudentIds.has(studentId)) {
        isDuplicateInFile = true;
        isValid = false;
        errorReason = 'Duplicate entry in spreadsheet';
        duplicateInFileCount++;
      } else if (existingEmails.has(email) || existingStudentIds.has(studentId)) {
        isExistingInDatabase = true;
        isValid = false;
        errorReason = 'Account already exists in database';
        existingInDbCount++;
      } else {
        fileEmails.add(email);
        fileStudentIds.add(studentId);
        validCount++;
      }
    } else {
      invalidCount++;
    }

    parsedRows.push({
      rowNumber: i,
      firstName,
      middleName,
      lastName,
      fullName: compiledFullName,
      email,
      studentId,
      gradeLevel,
      section,
      classification,
      isValid,
      isDuplicateInFile,
      isExistingInDatabase,
      errorReason: errorReason || undefined,
    });
  }

  return {
    totalRows: parsedRows.length,
    validCount,
    invalidCount,
    duplicateInFileCount,
    existingInDbCount,
    rows: parsedRows,
  };
}

export async function validateBulkStudentCSV(csvText: string): Promise<BulkUploadValidationResult> {
  const blob = new Blob([csvText], { type: 'text/csv' });
  const file = new File([blob], 'upload.csv', { type: 'text/csv' });
  return validateSpreadsheetFile(file);
}

export async function executeBulkStudentImport(
  validRows: BulkUploadRowValidation[],
  accountStatus: 'pending' | 'approved' = 'approved'
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  const validOnly = validRows.filter((r) => r.isValid);
  const batchSize = 400;

  for (let i = 0; i < validOnly.length; i += batchSize) {
    const chunk = validOnly.slice(i, i + batchSize);
    const batch = writeBatch(db);

    chunk.forEach((row) => {
      const newStudentRef = doc(collection(db, 'users'));
      const cleanPrefix = (row.firstName || 'Student').replace(/[^a-zA-Z]/g, '').slice(0, 4);
      const cleanId = row.studentId.replace(/[^0-9]/g, '').slice(-4) || '1001';
      const uniqueSalt = Math.random().toString(36).substring(2, 5).toUpperCase();
      const generatedPassword = `HS@${cleanPrefix}${cleanId}#${uniqueSalt}`;

      batch.set(newStudentRef, {
        id: newStudentRef.id,
        uid: newStudentRef.id,
        name: row.fullName,
        fullName: row.fullName,
        firstName: row.firstName,
        middleName: row.middleName,
        middleInitial: row.middleName ? row.middleName.charAt(0).toUpperCase() : '',
        lastName: row.lastName,
        email: row.email,
        studentId: row.studentId,
        gradeLevel: row.gradeLevel,
        grade: row.gradeLevel,
        section: row.section,
        studentType: row.classification,
        type: row.classification,
        isSned: row.classification === 'SNED',
        role: 'student',
        status: accountStatus,
        temporaryPassword: generatedPassword,
        creationOrigin: 'Spreadsheet Bulk Upload',
        schoolName: 'Sto. Tomas North Central School',
        department: row.classification === 'SNED' ? 'SNED' : 'STNCS',
        progress: 0,
        xp: 0,
        stars: 0,
        streak: 0,
        completedLessons: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
      imported += chunk.length;
    } catch (err) {
      console.error('Batch commit failed for chunk:', err);
      failed += chunk.length;
    }
  }

  return { imported, failed };
}

// ==========================================
// ANNOUNCEMENTS SERVICES
// ==========================================

export async function getAnnouncements(maxLimit = 10): Promise<Announcement[]> {
  try {
    const announcementsRef = collection(db, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'), limit(maxLimit));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const fallbackSnap = await getDocs(announcementsRef);
      return fallbackSnap.docs.slice(0, maxLimit).map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Announcement[];
    }

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Announcement[];
  } catch (error) {
    console.error('Error loading announcements from Firestore:', error);
    return [];
  }
}

export function getAnnouncementsRealtime(
  onSuccess: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const announcementsRef = collection(db, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Announcement[];
        onSuccess(items);
      },
      (err) => {
        console.error('Error in realtime announcements listener:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// ==========================================
// ACTIVITY LOG SERVICES
// ==========================================

export async function getActivityLogs(limitCount = 8): Promise<ActivityLog[]> {
  try {
    const logsRef = collection(db, 'activity_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const fallbackSnap = await getDocs(logsRef);
      return fallbackSnap.docs.slice(0, limitCount).map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ActivityLog[];
    }

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ActivityLog[];
  } catch {
    return [];
  }
}

// ==========================================
// TEACHER SERVICES
// ==========================================

export async function getTeachers(): Promise<TeacherProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'teacher'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      
      let normalizedStatus: TeacherProfile['status'] = 'active';
      const statusStr = (data.status || 'pending').toString().toLowerCase();
      if (['active', 'pending', 'approved', 'rejected', 'inactive', 'archived', 'deactivated'].includes(statusStr)) {
        normalizedStatus = statusStr as TeacherProfile['status'];
      }
      
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        name: data.name || data.fullName || 'Teacher',
        fullName: data.fullName || data.name || 'Teacher',
        email: data.email || 'No email',
        employeeId: data.employeeId || '',
        department: data.department || '',
        status: normalizedStatus,
        avatar: data.avatar || data.photoURL || '',
        createdAt: data.createdAt || null,
        lastActive: data.lastActive || data.lastActiveDate || null,
        handledClasses: data.handledClasses || [],
        role: data.role || 'teacher',
        rawDoc: data
      } as TeacherProfile;
    });
  } catch (error) {
    console.error('Error fetching teachers from Firestore:', error);
    throw new Error('Failed to load teacher records from database.');
  }
}