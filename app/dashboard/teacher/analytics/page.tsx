'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Users, 
  GraduationCap, 
  Zap, 
  Layers, 
  Sparkles, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Eye, 
  X, 
  Send,
  MessageSquarePlus,
  ShieldAlert,
  Activity,
  Flame,
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { 
  getStudentsRealtime, 
  Student, 
  computeComprehensiveAnalytics, 
  FourTierAnalytics, 
  parseDateToMs, 
  addTeacherNoteToStudent 
} from '@/lib/data-service';

type AnalyticsCategory = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';

export default function TeacherAnalyticsDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Category on Left Master Column (Matches Settings Layout)
  const [activeCategory, setActiveCategory] = useState<AnalyticsCategory>('descriptive');

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inspection Drawer & Teacher Note Modal state
  const [inspectedStudent, setInspectedStudent] = useState<Student | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  const standardGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

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

  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    students.forEach((s) => {
      if (s.section && s.section !== 'General Section' && s.section !== 'N/A') {
        sections.add(s.section);
      }
    });
    return Array.from(sections).sort();
  }, [students]);

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
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
  }, [students, selectedGrade, selectedSection, searchQuery]);

  // 4-Tier Analytics Calculation
  const analytics: FourTierAnalytics = useMemo(() => {
    return computeComprehensiveAnalytics(filteredStudents);
  }, [filteredStudents]);

  const maxClassAvgProgress = useMemo(() => {
    if (!analytics.descriptive.classPerformance.length) return 100;
    return Math.max(...analytics.descriptive.classPerformance.map((c) => c.avgProgress), 10);
  }, [analytics.descriptive.classPerformance]);

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

  const handleSaveTeacherNote = async () => {
    if (!inspectedStudent || !noteText.trim()) return;
    try {
      setIsSubmittingNote(true);
      const newNote = await addTeacherNoteToStudent(
        inspectedStudent.id || inspectedStudent.uid,
        noteText,
        'Instructor',
        'teacher_auth'
      );
      setInspectedStudent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          teacherNotes: [newNote, ...(prev.teacherNotes || [])]
        };
      });
      setNoteText('');
    } catch (err) {
      console.error('Failed to append teacher note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
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
          <div className="flex items-center gap-1.5 bg-[#FAF6EE]/80 px-3 py-1 rounded-xl border border-amber-900/15">
            <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Grade:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#521903] outline-none cursor-pointer"
            >
              <option value="all">All Grades</option>
              {standardGrades.map((g) => (
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
            <div className="flex flex-col justify-between h-full space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
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
                    const firstStudent = students.find(s => s.progress < 25);
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

        </div>
      </div>

      {/* QUICK STUDENT INSPECTION & INSTRUCTOR NOTE MODAL */}
      {inspectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-[#FAF6EE] border border-amber-900/20 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-amber-900/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-200 text-[#521903] font-black text-sm flex items-center justify-center shadow-inner">
                  {(inspectedStudent.firstName || inspectedStudent.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#521903]">{inspectedStudent.fullName || inspectedStudent.name}</h3>
                  <p className="text-[10px] text-[#521903]/60 font-medium">
                    {inspectedStudent.studentId} · {inspectedStudent.gradeLevel} - {inspectedStudent.section} ({inspectedStudent.type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedStudent(null)}
                className="p-1 rounded-full hover:bg-amber-900/10 text-[#521903]/60 hover:text-[#521903]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-amber-900/10">
                <span className="text-[8.5px] font-bold text-[#521903]/60 uppercase">Progress</span>
                <p className="text-sm font-black text-[#521903]">{inspectedStudent.progress || 0}%</p>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-900/10">
                <span className="text-[8.5px] font-bold text-[#521903]/60 uppercase">Total XP</span>
                <p className="text-sm font-black text-amber-700">{(inspectedStudent.gamification?.xp || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-900/10">
                <span className="text-[8.5px] font-bold text-[#521903]/60 uppercase">Streak</span>
                <p className="text-sm font-black text-amber-600">{inspectedStudent.gamification?.streak || 0}d</p>
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-900/10 space-y-1 text-xs">
              <h4 className="text-[9px] font-bold text-[#521903] uppercase">Curriculum Breakdown</h4>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-[#521903]">Alphabet Mastery XP:</span>
                <span className="font-bold text-amber-800">{inspectedStudent.gamification?.alphabetXp || 0} XP</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-[#521903]">Numbers Mastery XP:</span>
                <span className="font-bold text-amber-800">{inspectedStudent.gamification?.numbersXp || 0} XP</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-semibold text-[#521903]">Completed Lessons:</span>
                <span className="font-bold text-[#521903]">{inspectedStudent.gamification?.completedLessons || 0} Lessons</span>
              </div>
            </div>

            {/* Instructor Notes */}
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-bold text-[#521903] uppercase flex items-center gap-1">
                <MessageSquarePlus className="h-3.5 w-3.5 text-amber-800" />
                Instructor Notes &amp; Observations
              </h4>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Add intervention note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white border border-amber-900/20 text-[#521903] placeholder:text-[#521903]/40 focus:outline-none"
                />
                <button
                  onClick={handleSaveTeacherNote}
                  disabled={isSubmittingNote || !noteText.trim()}
                  className="px-3 py-1 bg-[#521903] text-white rounded-lg text-xs font-bold hover:bg-[#3d1202] disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  Save
                </button>
              </div>

              <div className="max-h-20 overflow-y-auto space-y-1 pt-0.5">
                {(!inspectedStudent.teacherNotes || inspectedStudent.teacherNotes.length === 0) ? (
                  <p className="text-[9px] text-[#521903]/50 italic text-center py-1">No notes added yet for this student.</p>
                ) : (
                  inspectedStudent.teacherNotes.map((note) => (
                    <div key={note.id} className="p-1.5 bg-white/60 rounded-lg border border-amber-900/10 text-xs space-y-0.5">
                      <div className="flex justify-between text-[8px] text-[#521903]/60 font-semibold">
                        <span>{note.authorName}</span>
                        <span>{formatActivityTime(note.createdAt)}</span>
                      </div>
                      <p className="text-[#521903] text-[10px] font-medium leading-tight">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setInspectedStudent(null)}
                className="px-3.5 py-1.5 bg-[#FAF6EE] text-[#521903] border border-amber-900/20 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}