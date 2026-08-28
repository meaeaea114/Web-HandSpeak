'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Layers, 
  Zap,
  Sparkles, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ShieldAlert,
  Activity,
  ArrowRight,
  Brain,
  Trophy,
  ThumbsDown,
  Lock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  getStudentsRealtime, 
  Student, 
  computeComprehensiveAnalytics, 
  FourTierAnalytics, 
  parseDateToMs 
} from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { fetchCohortAIInsights, fetchGestureAndActivitySummary, CohortAIInsights, GestureAccuracySummary } from '@/lib/ai-analytics-client';
import { StudentProfileDrawer } from '@/components/dashboard/student-profile-drawer';

type AnalyticsCategory = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive' | 'ai';

export default function TeacherAnalyticsDashboardPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Category on Left Master Column (Matches Settings Layout)
  const [activeCategory, setActiveCategory] = useState<AnalyticsCategory>('descriptive');

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Student inspection now reuses the shared Student Profile Drawer (avoids a duplicate UI)
  const [inspectedStudent, setInspectedStudent] = useState<Student | null>(null);

  // AI Cohort Insights state (fetched on-demand, cached server-side)
  const [aiInsights, setAiInsights] = useState<CohortAIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCached, setAiCached] = useState<boolean>(false);
  const [aiRequestedOnce, setAiRequestedOnce] = useState<boolean>(false);
  const [gestureSummary, setGestureSummary] = useState<GestureAccuracySummary | null>(null);

  const standardGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  // Teacher access scope: unrestricted for admin/principal/department roles,
  // limited to the teacher's assigned grade/sections otherwise. Analytics
  // must never expose students outside this scope.
  const isScopeRestricted = useMemo(() => {
    if (!user) return false;
    if (user.role !== 'teacher') return false;
    const gradeIsAll = !user.assignedGrade || user.assignedGrade === 'All';
    const sectionsAreAll = !user.assignedSections || user.assignedSections.length === 0 || user.assignedSections.includes('All');
    return !gradeIsAll || !sectionsAreAll;
  }, [user]);

  const scopedStudents = useMemo(() => {
    if (!isScopeRestricted || !user) return students;
    return students.filter((s) => {
      const studentGrade = (s.gradeLevel || '').toLowerCase().startsWith('grade') ? s.gradeLevel : `Grade ${s.gradeLevel}`;
      const gradeMatches = !user.assignedGrade || user.assignedGrade === 'All' || studentGrade === user.assignedGrade;
      const sectionMatches =
        !user.assignedSections || user.assignedSections.length === 0 || user.assignedSections.includes('All') ||
        user.assignedSections.includes(s.section);
      return gradeMatches && sectionMatches;
    });
  }, [students, isScopeRestricted, user]);

  const scopeLabel = useMemo(() => {
    if (!isScopeRestricted || !user) return 'All Assigned Classes';
    const grade = user.assignedGrade || 'Assigned Grade';
    const sections = (user.assignedSections || []).filter((s) => s !== 'All').join(', ');
    return sections ? `${grade} - ${sections}` : grade;
  }, [isScopeRestricted, user]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getStudentsRealtime(
      (data) => {
        setStudents(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Analytics realtime subscription error:', err);
        setError('Failed to fetch realtime student analytics from Firestore.');
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const availableGrades = useMemo(() => {
    if (isScopeRestricted && user?.assignedGrade && user.assignedGrade !== 'All') return [user.assignedGrade];
    return standardGrades;
  }, [isScopeRestricted, user]);

  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    scopedStudents.forEach((s) => {
      if (s.section && s.section !== 'General Section' && s.section !== 'N/A') {
        sections.add(s.section);
      }
    });
    return Array.from(sections).sort();
  }, [scopedStudents]);

  // Filtered dataset (scope-restricted first, then UI filters on top)
  const filteredStudents = useMemo(() => {
    return scopedStudents.filter((s) => {
      const studentGradeNormalized = (s.gradeLevel || '').toLowerCase().startsWith('grade') 
        ? s.gradeLevel 
        : `Grade ${s.gradeLevel}`;

      const matchesGrade = selectedGrade === 'all' || studentGradeNormalized === selectedGrade;
      const matchesSection = selectedSection === 'all' || s.section === selectedSection;
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSection && matchesSearch;
    });
  }, [scopedStudents, selectedGrade, selectedSection, searchQuery]);

  // 4-Tier Analytics Calculation (deterministic, from real Firestore data)
  const analytics: FourTierAnalytics = useMemo(() => {
    return computeComprehensiveAnalytics(filteredStudents);
  }, [filteredStudents]);

  const maxClassAvgProgress = useMemo(() => {
    if (!analytics.descriptive.classPerformance.length) return 100;
    return Math.max(...analytics.descriptive.classPerformance.map((c) => c.avgProgress), 10);
  }, [analytics.descriptive.classPerformance]);

  // Student performance ranking (top & bottom by progress) — real data only
  const rankedByProgress = useMemo(() => {
    return [...filteredStudents]
      .filter((s) => s.status !== 'archived')
      .sort((a, b) => (b.progress || 0) - (a.progress || 0));
  }, [filteredStudents]);

  const topPerformers = rankedByProgress.slice(0, 5);
  const bottomPerformers = [...rankedByProgress].reverse().slice(0, 5);

  const chartData = useMemo(
    () =>
      analytics.descriptive.classPerformance.map((c) => ({
        name: c.className,
        avgProgress: c.avgProgress,
        avgXp: c.avgXp,
      })),
    [analytics.descriptive.classPerformance]
  );

  useEffect(() => {
    const studentIds = filteredStudents.map((s) => s.id || s.uid).filter(Boolean);
    if (studentIds.length === 0) {
      setGestureSummary({ hasData: false, totalAttempts: 0, overallAccuracy: null, perSign: [], weakSigns: [], signsMastered: 0 });
      return;
    }
    let cancelled = false;
    fetchGestureAndActivitySummary(studentIds).then((result) => {
      if (cancelled) return;
      if (result.success) setGestureSummary(result.gesture);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents]);

  const loadAIInsights = async (forceRefresh = false) => {
    setAiLoading(true);
    setAiError(null);
    setAiRequestedOnce(true);
    const studentIds = filteredStudents.map((s) => s.id || s.uid).filter(Boolean);
    const emptyGesture: GestureAccuracySummary = { hasData: false, totalAttempts: 0, overallAccuracy: null, perSign: [], weakSigns: [], signsMastered: 0 };
    let gesture = gestureSummary || emptyGesture;
    if (!gestureSummary) {
      const gestureResult = await fetchGestureAndActivitySummary(studentIds);
      gesture = gestureResult.success ? gestureResult.gesture : emptyGesture;
      setGestureSummary(gesture);
    }
    const result = await fetchCohortAIInsights(scopeLabel, analytics, gesture, forceRefresh);
    if (result.success) {
      setAiInsights(result.insights);
      setAiCached(result.cached);
    } else {
      setAiError(result.error);
    }
    setAiLoading(false);
  };

  const handleOpenAITab = () => {
    setActiveCategory('ai');
    if (!aiRequestedOnce) {
      loadAIInsights(false);
    }
  };

  const formatActivityTime = (dateVal: any) => {
    const ms = parseDateToMs(dateVal);
    if (!ms) return 'No activity recorded';
    const diffHours = Math.floor((Date.now() - ms) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-800" />
        <p className="text-xs font-semibold text-[#521903] tracking-wide">
          Running HandSpeak Educational Analytics Engine...
        </p>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="p-6 bg-rose-50/80 border border-rose-200 rounded-2xl text-center space-y-2 max-w-md mx-auto my-auto">
        <AlertTriangle className="h-6 w-6 text-rose-700 mx-auto" />
        <h4 className="text-sm font-bold text-[#521903]">Telemetry Sync Error</h4>
        <p className="text-xs text-rose-800">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-[#521903] text-amber-50 rounded-xl text-xs font-bold hover:bg-[#3d1202]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col justify-between p-1 max-w-[96rem] mx-auto overflow-hidden select-none gap-2.5">
      
      {/* SECTION 1: TOP GLOBAL SEARCH & FILTER HEADER */}
      <div className="bg-white/85 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/70 shadow-[3px_3px_12px_rgba(82,25,3,0.03)] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="relative w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#521903]/40" />
          <input
            type="text"
            placeholder="Search students, lessons, gestures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#FAF6EE]/80 border border-amber-900/15 text-[#521903] placeholder:text-[#521903]/40 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
        </div>

        <div className="flex items-center gap-2">
          {isScopeRestricted && (
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200" title="Analytics limited to your assigned classes">
              <Lock className="h-3 w-3 text-amber-700" />
              <span className="text-[10px] font-bold text-amber-800">{scopeLabel}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-[#FAF6EE]/80 px-3 py-1 rounded-xl border border-amber-900/15">
            <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Grade:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              disabled={availableGrades.length === 1}
              className="bg-transparent text-xs font-bold text-[#521903] outline-none cursor-pointer disabled:cursor-default"
            >
              <option value="all">All Grades</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {availableSections.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAF6EE]/80 px-3 py-1 rounded-xl border border-amber-900/15">
              <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Sec:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#521903] outline-none cursor-pointer"
              >
                <option value="all">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
            {filteredStudents.length} Active Records
          </span>
        </div>
      </div>

      {/* SECTION 2: MASTER / DETAIL 2-COLUMN PANELS (MATCHING IMAGE FORMAT) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 min-h-0">
        
        {/* LEFT COLUMN: TIER CATEGORY SELECTOR (MATCHES SETTINGS NAVIGATION) */}
        <div className="md:col-span-4 bg-white/85 backdrop-blur-md p-4 rounded-3xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.03)] flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#521903]/50 px-3 block mb-1">
              Analytics Framework
            </span>

            {/* Tab 1: Descriptive */}
            <button
              onClick={() => setActiveCategory('descriptive')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeCategory === 'descriptive'
                  ? 'bg-[#3D1702] text-white shadow-md'
                  : 'text-[#521903]/70 hover:bg-[#FAF6EE] hover:text-[#521903]'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Descriptive Summary</span>
            </button>

            {/* Tab 2: Diagnostic */}
            <button
              onClick={() => setActiveCategory('diagnostic')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeCategory === 'diagnostic'
                  ? 'bg-[#3D1702] text-white shadow-md'
                  : 'text-[#521903]/70 hover:bg-[#FAF6EE] hover:text-[#521903]'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Diagnostic Findings</span>
            </button>

            {/* Tab 3: Predictive */}
            <button
              onClick={() => setActiveCategory('predictive')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeCategory === 'predictive'
                  ? 'bg-[#3D1702] text-white shadow-md'
                  : 'text-[#521903]/70 hover:bg-[#FAF6EE] hover:text-[#521903]'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Predictive Risk Forecast</span>
            </button>

            {/* Tab 4: Prescriptive */}
            <button
              onClick={() => setActiveCategory('prescriptive')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeCategory === 'prescriptive'
                  ? 'bg-[#3D1702] text-white shadow-md'
                  : 'text-[#521903]/70 hover:bg-[#FAF6EE] hover:text-[#521903]'
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              <span>Prescriptive Action Blueprint</span>
            </button>

            {/* Tab 5: AI-Generated Insights */}
            <button
              onClick={handleOpenAITab}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeCategory === 'ai'
                  ? 'bg-[#3D1702] text-white shadow-md'
                  : 'text-[#521903]/70 hover:bg-[#FAF6EE] hover:text-[#521903]'
              }`}
            >
              <Brain className="h-4 w-4" />
              <span>AI-Generated Insights</span>
            </button>
          </div>

          <div className="p-3.5 bg-[#FAF6EE] rounded-2xl border border-amber-900/10 space-y-1">
            <span className="text-[9px] font-black text-amber-900 uppercase tracking-widest block">Cohort Telemetry Active</span>
            <p className="text-[10px] text-[#521903]/70 font-medium leading-tight">
              {analytics.descriptive.activeCohort} Active learners · {analytics.descriptive.totalCompletedLessons} Lessons completed across cohort.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL WORKSPACE (SPACIOUS, UNCLUTTERED, PROFESSIONAL) */}
        <div className="md:col-span-8 bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.03)] flex flex-col justify-between overflow-hidden">
          
          {/* TIER 1 VIEW: DESCRIPTIVE DETAILS */}
          {activeCategory === 'descriptive' && (
            <div className="flex flex-col h-full space-y-3 overflow-y-auto pr-1">
              <div className="space-y-1 border-b border-slate-100 pb-2.5">
                <h2 className="text-base font-black text-[#521903] tracking-tight">
                  Descriptive Analytics — &ldquo;What is happening?&rdquo;
                </h2>
                <p className="text-xs text-[#521903]/60 font-medium">
                  Comprehensive performance summary synthesized directly from Firestore student documents.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FAF6EE] p-3 rounded-2xl border border-amber-900/10 space-y-0.5">
                  <span className="text-[9px] font-bold text-[#521903]/60 uppercase">Total Students</span>
                  <h3 className="text-xl font-black text-[#521903]">{analytics.descriptive.totalStudents}</h3>
                  <p className="text-[10px] text-emerald-800 font-bold">{analytics.descriptive.activeCohort} Active</p>
                </div>

                <div className="bg-[#FAF6EE] p-3 rounded-2xl border border-amber-900/10 space-y-0.5">
                  <span className="text-[9px] font-bold text-[#521903]/60 uppercase">Avg Mastery Level</span>
                  <h3 className="text-xl font-black text-[#521903]">{analytics.descriptive.avgProgress}%</h3>
                  <div className="w-16 bg-amber-900/15 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-amber-700 h-full rounded-full" style={{ width: `${Math.min(analytics.descriptive.avgProgress, 100)}%` }} />
                  </div>
                </div>

                <div className="bg-[#FAF6EE] p-3 rounded-2xl border border-amber-900/10 space-y-0.5">
                  <span className="text-[9px] font-bold text-[#521903]/60 uppercase">Total Experience</span>
                  <h3 className="text-xl font-black text-[#521903]">{analytics.descriptive.totalXp.toLocaleString()}</h3>
                  <p className="text-[10px] text-[#521903]/60 font-semibold">Avg {analytics.descriptive.avgXp} XP / stu</p>
                </div>

                <div className="bg-[#FAF6EE] p-3 rounded-2xl border border-amber-900/10 space-y-0.5">
                  <span className="text-[9px] font-bold text-[#521903]/60 uppercase">At-Risk Count</span>
                  <h3 className="text-xl font-black text-rose-700">{analytics.descriptive.inactiveOver7Days}</h3>
                  <p className="text-[10px] text-rose-700/80 font-semibold">Flagged for intervention</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-2xl border border-amber-900/10 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-[#521903]/60 uppercase">FSL Alphabet XP</span>
                    <p className="text-base font-black text-amber-800">{analytics.descriptive.alphabetXp.toLocaleString()} XP</p>
                  </div>
                  <Layers className="h-4 w-4 text-amber-700" />
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-900/10 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-[#521903]/60 uppercase">FSL Numbers XP</span>
                    <p className="text-base font-black text-amber-800">{analytics.descriptive.numbersXp.toLocaleString()} XP</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-amber-700" />
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-900/10 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-[#521903]/60 uppercase">Avg Stars / Streak</span>
                    <p className="text-base font-black text-amber-800">{analytics.descriptive.avgStars} ⭐ · {analytics.descriptive.avgStreak}d 🔥</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-amber-900/10 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-[#521903]/60 uppercase">Active Today / This Week</span>
                    <p className="text-base font-black text-emerald-700">{analytics.descriptive.activeToday} / {analytics.descriptive.activeThisWeek}</p>
                  </div>
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
              </div>

              {chartData.length > 1 && (
                <div className="bg-white p-3 rounded-2xl border border-amber-900/10">
                  <span className="text-[10px] font-bold uppercase text-[#521903]/70 block mb-1">Class Comparison — Avg Mastery %</span>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7ddce" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#8a6a4a' }} interval={0} angle={-15} textAnchor="end" height={30} />
                      <YAxis tick={{ fontSize: 9, fill: '#8a6a4a' }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="avgProgress" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.avgProgress >= 70 ? '#059669' : entry.avgProgress >= 40 ? '#F0AB31' : '#e11d48'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Gesture Recognition Accuracy — real data, or an honest empty state */}
              <div className="bg-white p-3 rounded-2xl border border-amber-900/10 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-[#521903]/70 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-700" /> Gesture Recognition Accuracy
                </span>
                {gestureSummary === null ? (
                  <p className="text-[11px] text-stone-400 italic">Loading gesture data...</p>
                ) : gestureSummary.hasData ? (
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <span className="text-lg font-black text-[#521903]">{gestureSummary.overallAccuracy}%</span>
                      <span className="text-[10.5px] text-stone-500 font-semibold ml-1.5">
                        overall · {gestureSummary.totalAttempts} recorded attempts · {gestureSummary.signsMastered} signs mastered
                      </span>
                    </div>
                    {gestureSummary.weakSigns.length > 0 && (
                      <span className="text-[10.5px] text-rose-700 font-semibold">
                        Weakest: {gestureSummary.weakSigns.slice(0, 3).map((s) => `${s.sign} (${s.accuracy}%)`).join(', ')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 italic leading-relaxed">
                    Insufficient gesture data — no recognition attempts have been recorded yet for students in this scope.
                    This will populate automatically once the student-facing app records practice attempts.
                  </p>
                )}
              </div>

              {/* Student Performance Ranking */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-amber-900/10 space-y-1">
                  <span className="text-[9px] font-black uppercase text-emerald-800 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Top Performers
                  </span>
                  {topPerformers.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic">No student records in scope.</p>
                  ) : (
                    topPerformers.map((s) => (
                      <button
                        key={s.id || s.uid}
                        onClick={() => setInspectedStudent(s)}
                        className="w-full flex justify-between items-center text-[10.5px] py-0.5 hover:bg-emerald-50 rounded px-1 cursor-pointer"
                      >
                        <span className="font-bold text-[#521903] truncate">{s.fullName}</span>
                        <span className="font-black text-emerald-700 shrink-0 ml-1">{s.progress}%</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="bg-white p-3 rounded-2xl border border-amber-900/10 space-y-1">
                  <span className="text-[9px] font-black uppercase text-rose-700 flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3" /> Needs Attention
                  </span>
                  {bottomPerformers.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic">No student records in scope.</p>
                  ) : (
                    bottomPerformers.map((s) => (
                      <button
                        key={s.id || s.uid}
                        onClick={() => setInspectedStudent(s)}
                        className="w-full flex justify-between items-center text-[10.5px] py-0.5 hover:bg-rose-50 rounded px-1 cursor-pointer"
                      >
                        <span className="font-bold text-[#521903] truncate">{s.fullName}</span>
                        <span className="font-black text-rose-700 shrink-0 ml-1">{s.progress}%</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Class Performance Roster */}
              <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase text-[#521903]/70">Class Performance Benchmark</span>
                <div className="divide-y divide-amber-900/10 bg-white p-3 rounded-2xl border border-amber-900/10">
                  {analytics.descriptive.classPerformance.map((c) => (
                    <div key={c.className} className="py-1.5 flex justify-between items-center text-xs">
                      <span className="font-bold text-[#521903]">{c.className}</span>
                      <span className="text-[11px] font-semibold text-stone-600">{c.studentCount} students · <strong className="text-[#521903]">{c.avgProgress}%</strong> avg mastery</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TIER 2 VIEW: DIAGNOSTIC DETAILS */}
          {activeCategory === 'diagnostic' && (
            <div className="flex flex-col justify-between h-full space-y-3">
              <div className="space-y-1 border-b border-slate-100 pb-2.5">
                <h2 className="text-base font-black text-[#521903] tracking-tight">
                  Diagnostic Analytics — &ldquo;Why is it happening?&rdquo;
                </h2>
                <p className="text-xs text-[#521903]/60 font-medium">
                  Automated root cause analysis examining onboarding friction, engagement disparities, and module difficulty gaps.
                </p>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {analytics.diagnostic.findings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-emerald-800 gap-1.5 py-12">
                    <CheckCircle2 className="h-5 w-5" /> No critical curriculum friction roots detected across active cohort.
                  </div>
                ) : (
                  analytics.diagnostic.findings.map((f) => (
                    <div key={f.id} className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-amber-900/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#521903]">{f.title}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase">
                          {f.metric}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#521903]/70 font-medium leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-[#FAF6EE] rounded-2xl border border-amber-900/10 text-[11px] text-[#521903]/80 font-medium">
                <strong>Activity &amp; Streak Correlation:</strong> {analytics.diagnostic.streakCorrelation}
              </div>

              <div className="p-3 bg-white rounded-2xl border border-amber-900/10 space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#521903]/70 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-700" /> Frequently Misperformed Signs
                </span>
                {gestureSummary?.hasData && gestureSummary.weakSigns.length > 0 ? (
                  <div className="divide-y divide-amber-900/10">
                    {gestureSummary.weakSigns.map((s) => (
                      <div key={`${s.module}-${s.sign}`} className="py-1 flex justify-between items-center text-[11px]">
                        <span className="font-bold text-[#521903]">{s.sign} <span className="text-[9px] font-medium text-stone-400 uppercase">({s.module})</span></span>
                        <span className="text-rose-700 font-semibold">{s.accuracy}% accuracy · {s.attempts} attempts</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 italic">
                    Insufficient gesture-recognition data to identify repeated sign errors yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TIER 3 VIEW: PREDICTIVE DETAILS */}
          {activeCategory === 'predictive' && (
            <div className="flex flex-col justify-between h-full space-y-3">
              <div className="space-y-1 border-b border-slate-100 pb-2.5">
                <h2 className="text-base font-black text-[#521903] tracking-tight">
                  Predictive Analytics — &ldquo;What is likely to happen?&rdquo;
                </h2>
                <p className="text-xs text-[#521903]/60 font-medium">
                  Telemetry-driven forecast identifying students with declining practice velocity or projected curriculum mastery.
                </p>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {analytics.predictive.riskForecast.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-emerald-800 gap-1.5 py-12">
                    <CheckCircle2 className="h-5 w-5" /> All learners projected to sustain positive mastery velocity.
                  </div>
                ) : (
                  analytics.predictive.riskForecast.map((rf) => (
                    <div 
                      key={rf.student.id || rf.student.uid}
                      onClick={() => setInspectedStudent(rf.student)}
                      className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between cursor-pointer hover:bg-rose-100/70 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-black text-[#521903] block truncate">
                          {rf.student.fullName || rf.student.name}
                        </span>
                        <span className="text-[10px] text-rose-800/80 font-medium block truncate">
                          {rf.reason}
                        </span>
                      </div>
                      <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-rose-600 text-white shrink-0 uppercase tracking-wider">
                        {rf.riskLevel}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-[#FAF6EE] rounded-2xl border border-amber-900/10 text-[11px] text-[#521903]/80 font-medium flex items-center justify-between">
                <span>{analytics.predictive.summary}</span>
                <span className="font-bold text-amber-800">Next Month Est: {analytics.predictive.projectedCohortAvgNextMonth}%</span>
              </div>
            </div>
          )}

          {/* TIER 4 VIEW: PRESCRIPTIVE DETAILS */}
          {activeCategory === 'prescriptive' && (
            <div className="flex flex-col justify-between h-full space-y-3">
              <div className="space-y-1 border-b border-slate-100 pb-2.5">
                <h2 className="text-base font-black text-[#521903] tracking-tight">
                  Prescriptive Analytics — &ldquo;What should the teacher do?&rdquo;
                </h2>
                <p className="text-xs text-[#521903]/60 font-medium">
                  Direct, actionable instructional blueprints synthesized from the descriptive, diagnostic, and predictive findings.
                </p>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {analytics.prescriptive.directives.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-emerald-800 gap-1.5 py-12">
                    <CheckCircle2 className="h-5 w-5" /> No critical interventions needed. Learner velocity is optimal.
                  </div>
                ) : (
                  analytics.prescriptive.directives.map((dir) => (
                    <div key={dir.id} className="p-3.5 rounded-2xl bg-white border border-amber-900/10 flex items-center justify-between gap-3 hover:bg-[#FAF6EE] transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                            dir.priority === 'URGENT' ? 'bg-rose-600 text-white' :
                            dir.priority === 'HIGH' ? 'bg-amber-500 text-white' :
                            'bg-emerald-600 text-white'
                          }`}>
                            {dir.priority}
                          </span>
                          <strong className="text-xs text-[#521903] truncate">
                            {dir.targetScope} <span className="text-[10px] font-normal text-[#521903]/60">({dir.targetType})</span>
                          </strong>
                        </div>
                        <p className="text-xs text-[#521903]/85 font-medium leading-tight">
                          {dir.actionDirective}
                        </p>
                        <span className="text-[10px] text-stone-400 block pt-0.5">Rationale: {dir.rationale}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    const firstStudent = scopedStudents.find(s => s.progress < 25);
                    if (firstStudent) setInspectedStudent(firstStudent);
                  }}
                  className="px-4 py-2 bg-[#F2B33D] hover:bg-[#D99A26] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Student Inspector Deck</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TIER 5 VIEW: AI-GENERATED INSIGHTS (GENUINE AI INTERPRETATION LAYER) */}
          {activeCategory === 'ai' && (
            <div className="flex flex-col h-full space-y-3 overflow-hidden">
              <div className="space-y-1 border-b border-slate-100 pb-2.5 flex items-start justify-between shrink-0">
                <div>
                  <h2 className="text-base font-black text-[#521903] tracking-tight flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#F0AB31]" />
                    AI-Generated Insights
                  </h2>
                  <p className="text-xs text-[#521903]/60 font-medium">
                    Claude interprets the real cohort metrics above to explain patterns, forecast trends, and recommend actions.
                  </p>
                </div>
                <button
                  onClick={() => loadAIInsights(true)}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-[#521903] hover:bg-[#3d1202] text-white rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${aiLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {aiLoading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-amber-700" />
                  <span className="text-xs font-bold text-[#521903]/60">Analyzing cohort metrics with Claude...</span>
                </div>
              )}

              {!aiLoading && aiError && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <p className="text-xs font-semibold text-[#521903]/70">{aiError}</p>
                  <p className="text-[10.5px] text-[#521903]/50">The rule-based Descriptive, Diagnostic, Predictive, and Prescriptive tabs remain fully available.</p>
                  <button
                    onClick={() => loadAIInsights(false)}
                    className="mt-1 px-3 py-1.5 bg-[#521903] text-white rounded-xl text-[10.5px] font-bold cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!aiLoading && !aiError && aiInsights && (
                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                  <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-amber-900/10 space-y-1">
                    <span className="text-[9px] font-black uppercase text-amber-900 flex items-center gap-1">
                      <Brain className="h-3.5 w-3.5" /> Diagnostic Narrative
                    </span>
                    <p className="text-xs text-[#521903]/85 font-medium leading-relaxed">{aiInsights.diagnosticNarrative}</p>
                    {aiInsights.diagnosticDrivers.length > 0 && (
                      <ul className="pt-1 space-y-0.5">
                        {aiInsights.diagnosticDrivers.map((d, i) => (
                          <li key={i} className="text-[11px] text-[#521903]/70 font-medium">• {d}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-amber-900/10 space-y-1">
                    <span className="text-[9px] font-black uppercase text-[#521903]/60 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Predictive Narrative
                      <span className="text-[8px] font-bold normal-case text-stone-400">(estimate, not a guarantee)</span>
                    </span>
                    <p className="text-xs text-[#521903]/85 font-medium leading-relaxed">{aiInsights.predictiveNarrative}</p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-[#521903]/70">Prescriptive Recommendations</span>
                    {aiInsights.prescriptiveRecommendations.length === 0 ? (
                      <p className="text-[11px] text-stone-400 italic">No differentiated recommendations were generated for this scope.</p>
                    ) : (
                      aiInsights.prescriptiveRecommendations.map((rec, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-amber-900/10 flex items-start gap-2">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 mt-0.5 ${
                            rec.priority === 'URGENT' ? 'bg-rose-600 text-white' :
                            rec.priority === 'HIGH' ? 'bg-amber-500 text-white' :
                            rec.priority === 'RECOMMENDED' ? 'bg-sky-600 text-white' :
                            'bg-emerald-600 text-white'
                          }`}>
                            {rec.priority}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#521903]">{rec.targetScope}</p>
                            <p className="text-[11px] text-[#521903]/80 font-medium leading-tight">{rec.action}</p>
                            <p className="text-[10px] text-stone-400">Rationale: {rec.rationale}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {aiInsights.dataLimitations.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-dashed border-stone-300">
                      <span className="text-[8.5px] font-bold text-stone-400 uppercase block mb-0.5">Data Limitations</span>
                      {aiInsights.dataLimitations.map((s, i) => (
                        <p key={i} className="text-[10px] text-stone-400 leading-tight">{s}</p>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-stone-300 text-center pt-1">
                    {aiCached ? 'Showing a recent AI analysis' : 'Freshly generated'} for {scopeLabel} · grounded in the real metrics shown in the other tabs
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* SHARED STUDENT PROFILE DRAWER (reused across the app, includes an AI Insight tab) */}
      <StudentProfileDrawer
        student={inspectedStudent}
        isOpen={!!inspectedStudent}
        onClose={() => setInspectedStudent(null)}
      />


    </div>
  );
}