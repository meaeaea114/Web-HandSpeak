'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  TrendingUp, 
  BarChart2, 
  Clock,
  Zap,
  BookOpen,
  Trophy,
  Sparkles,
  Layers,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  Flame,
  Star,
  Eye,
  MessageSquarePlus,
  X,
  Send,
  SlidersHorizontal,
  UserX,
  Award
} from 'lucide-react';
import { 
  getStudentsRealtime, 
  Student, 
  calculateDashboardMetrics, 
  DashboardMetrics,
  parseDateToMs,
  addTeacherNoteToStudent
} from '@/lib/data-service';

export default function TeacherDashboardMainPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inspection Drawer & Teacher Note Modal state
  const [inspectedStudent, setInspectedStudent] = useState<Student | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = getStudentsRealtime(
      (data) => {
        setStudents(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Realtime dashboard telemetry subscription error:', err);
        setError('Failed to fetch realtime student telemetry from Firestore.');
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Filter distinct grade levels and sections from live Firestore data
  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((s) => {
      if (s.gradeLevel) grades.add(s.gradeLevel);
    });
    return Array.from(grades).sort();
  }, [students]);

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
      const matchesGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
      const matchesSection = selectedSection === 'all' || s.section === selectedSection;
      const matchesType = selectedType === 'all' || s.type === selectedType;
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSection && matchesType && matchesSearch;
    });
  }, [students, selectedGrade, selectedSection, selectedType, searchQuery]);

  // Dynamically compute metrics from filtered live students
  const metrics: DashboardMetrics = useMemo(() => {
    return calculateDashboardMetrics(filteredStudents);
  }, [filteredStudents]);

  // Classification totals
  const studentTypeCounts = useMemo(() => {
    let sned = 0;
    let regular = 0;
    filteredStudents.forEach((s) => {
      if (s.type === 'SNED') sned++;
      else regular++;
    });
    return { sned, regular };
  }, [filteredStudents]);

  // Max class progress for bar width normalization
  const maxClassAvgProgress = useMemo(() => {
    if (!metrics.classPerformance.length) return 100;
    return Math.max(...metrics.classPerformance.map((c) => c.avgProgress), 10);
  }, [metrics.classPerformance]);

  // 4-Quarter Progress Distribution for SVG Chart
  const progressBuckets = useMemo(() => {
    const buckets = [
      { label: 'Q1 (0-25%)', count: 0 },
      { label: 'Q2 (26-50%)', count: 0 },
      { label: 'Q3 (51-75%)', count: 0 },
      { label: 'Q4 (76-100%)', count: 0 }
    ];
    filteredStudents.forEach((s) => {
      const p = s.progress || 0;
      if (p <= 25) buckets[0].count++;
      else if (p <= 50) buckets[1].count++;
      else if (p <= 75) buckets[2].count++;
      else buckets[3].count++;
    });
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return { buckets, maxCount };
  }, [filteredStudents]);

  // Computed SVG path based on live student distribution
  const chartPoints = useMemo(() => {
    const total = filteredStudents.length || 1;
    const p0 = Math.round((progressBuckets.buckets[0].count / total) * 100);
    const p1 = Math.round(((progressBuckets.buckets[0].count + progressBuckets.buckets[1].count) / total) * 100);
    const p2 = Math.round(((progressBuckets.buckets[0].count + progressBuckets.buckets[1].count + progressBuckets.buckets[2].count) / total) * 100);
    const p3 = 100;

    const getY = (val: number) => 150 - (val / 100) * 130;
    const y0 = getY(p0);
    const y1 = getY(p1);
    const y2 = getY(p2);
    const y3 = getY(p3);

    return {
      path1: `M 40,${y0} L 185,${y1} L 330,${y2} L 475,${y3}`,
      path2: `M 40,${Math.min(y0 + 10, 150)} L 185,${Math.min(y1 + 10, 150)} L 330,${Math.min(y2 + 8, 150)} L 475,${Math.min(y3 + 6, 150)}`,
      coords: [
        { cx: 40, cy: y0, count: progressBuckets.buckets[0].count },
        { cx: 185, cy: y1, count: progressBuckets.buckets[1].count },
        { cx: 330, cy: y2, count: progressBuckets.buckets[2].count },
        { cx: 475, cy: y3, count: progressBuckets.buckets[3].count }
      ]
    };
  }, [filteredStudents, progressBuckets]);

  const formatActivityTime = (dateVal: any) => {
    const ms = parseDateToMs(dateVal);
    if (!ms) return 'No activity recorded';
    const diffHours = Math.floor((Date.now() - ms) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
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
      <div className="flex flex-col items-center justify-center min-h-[480px] space-y-4">
        <RefreshCw className="h-9 w-9 animate-spin text-amber-800" />
        <p className="text-sm font-semibold text-[#521903] tracking-wide">
          Connecting to HandSpeak Firestore telemetry...
        </p>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="p-8 bg-rose-50/80 border border-rose-200 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-8 w-8 text-rose-700 mx-auto" />
        <h4 className="text-base font-bold text-[#521903]">Telemetry Connection Error</h4>
        <p className="text-xs text-rose-800">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#521903] text-amber-50 rounded-xl text-xs font-bold hover:bg-[#3d1202] transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 max-w-7xl mx-auto pb-12">
      
      {/* SECTION 1: WELCOME STRIP CARD WITH LIVE TELEMETRY CONTROLS */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#521903] tracking-tight">
              Welcome back, Instructor!
            </h1>
            <p className="text-xs text-[#521903]/70 font-medium leading-relaxed">
              Monitor your gamified Filipino Sign Language (FSL) classroom progress, view live application student actions, and adjust lesson paths below.
            </p>
          </div>

          {/* Quick Filter Control Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[170px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#521903]/40" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#FAF6EE]/80 border border-amber-900/15 text-[#521903] placeholder:text-[#521903]/40 focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#FAF6EE]/80 px-2.5 py-1.5 rounded-xl border border-amber-900/15">
              <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Grade:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#521903] outline-none cursor-pointer"
              >
                <option value="all">All</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {availableSections.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#FAF6EE]/80 px-2.5 py-1.5 rounded-xl border border-amber-900/15">
                <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Sec:</span>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#521903] outline-none cursor-pointer"
                >
                  <option value="all">All</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-[#FAF6EE]/80 px-2.5 py-1.5 rounded-xl border border-amber-900/15">
              <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#521903] outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="SNED">SNED</option>
                <option value="REGULAR">Regular</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TOP 3D TRACKING TELEMETRY STATS (CALCULATED FROM FIRESTORE) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">TOTAL STUDENTS</span>
            <h3 className="text-3xl font-black text-[#521903] tracking-tight">
              {metrics.totalStudents}
            </h3>
            <p className="text-[11px] text-[#521903]/60 font-semibold">
              {studentTypeCounts.sned} SNED, {studentTypeCounts.regular} Regular
            </p>
          </div>
          <div className="p-2.5 rounded-xl text-amber-800 bg-amber-50 shadow-inner">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">AVG MASTERY LEVEL</span>
            <h3 className="text-3xl font-black text-[#521903] tracking-tight">
              {metrics.avgProgress}%
            </h3>
            <div className="w-24 bg-amber-900/15 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-amber-700 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(metrics.avgProgress, 100)}%` }}
              />
            </div>
          </div>
          <div className="p-2.5 rounded-xl text-[#521903] bg-amber-50 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">TOTAL EXPERIENCE</span>
            <h3 className="text-3xl font-black text-[#521903] tracking-tight">
              {metrics.totalXp.toLocaleString()}
            </h3>
            <p className="text-[11px] text-[#521903]/60 font-semibold">
              Avg <strong className="text-[#521903]">{metrics.avgXp.toLocaleString()} XP</strong> / student
            </p>
          </div>
          <div className="p-2.5 rounded-xl text-amber-700 bg-amber-50 shadow-inner">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.06)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">AT-RISK STUDENTS</span>
            <h3 className="text-3xl font-black text-rose-700 tracking-tight">
              {metrics.inactiveStudents.length}
            </h3>
            <p className="text-[11px] text-rose-700/80 font-semibold">Inactive for &gt; 7 days</p>
          </div>
          <div className="p-2.5 rounded-xl text-rose-700 bg-rose-50 shadow-inner">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* SECTION 3: FSL MODULE MASTERY TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#521903]/60 uppercase tracking-wider">
              Alphabet Module Telemetry
            </span>
            <h4 className="text-2xl font-black text-[#521903]">
              {metrics.totalAlphabetXp.toLocaleString()} <span className="text-xs font-normal text-[#521903]/70">XP Accumulated</span>
            </h4>
            <p className="text-[11px] text-[#521903]/50 font-semibold">
              Live sum of all letter gesture completions
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800 shadow-inner">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#521903]/60 uppercase tracking-wider">
              Numbers Module Telemetry
            </span>
            <h4 className="text-2xl font-black text-[#521903]">
              {metrics.totalNumbersXp.toLocaleString()} <span className="text-xs font-normal text-[#521903]/70">XP Accumulated</span>
            </h4>
            <p className="text-[11px] text-[#521903]/50 font-semibold">
              Live sum of all number signing drills
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800 shadow-inner">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* SECTION 4: CHARTS MATRIX LAYERS (REAL PROGRESS & CLASS PERFORMANCE) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        
        {/* PROGRESS OVER TIME (LINE GRAPH FROM LIVE DATA) */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] lg:col-span-3 flex flex-col justify-between min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-700" />
              <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Progress Over Time</h4>
            </div>
            <span className="text-[10px] font-bold text-[#521903]/50">
              {filteredStudents.length} Students Tracked
            </span>
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs font-bold text-[#521903]/40">
              No student progress data recorded for this filter.
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[180px] relative mt-2">
              <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                <line x1="40" y1="20" x2="40" y2="150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="150" x2="480" y2="150" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="85" x2="480" y2="85" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />

                <text x="10" y="25" className="text-[10px] font-bold fill-[#521903]/40">100%</text>
                <text x="15" y="90" className="text-[10px] font-bold fill-[#521903]/40">50%</text>
                <text x="20" y="155" className="text-[10px] font-bold fill-[#521903]/40">0%</text>

                <text x="35" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q1</text>
                <text x="180" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q2</text>
                <text x="325" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q3</text>
                <text x="470" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q4</text>

                {/* Path derived from real student progress distributions */}
                <path d={chartPoints.path1} fill="none" stroke="#F2B33D" strokeWidth="3" strokeLinecap="round" />
                <path d={chartPoints.path2} fill="none" stroke="#D97706" strokeWidth="1.5" strokeDasharray="4" strokeLinecap="round" />

                {chartPoints.coords.map((c, i) => (
                  <g key={i}>
                    <circle cx={c.cx} cy={c.cy} r="4" fill="white" stroke="#D97706" strokeWidth="2" />
                    <text x={c.cx - 6} y={c.cy - 8} className="text-[9px] font-bold fill-[#521903]">
                      {c.count}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}

          <div className="flex items-center gap-5 justify-center mt-3 border-t border-slate-100 pt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#521903]/70">
              <span className="h-2 w-2 rounded-full bg-[#D97706]"></span> Cumulative Cohort Distribution
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#521903]/70">
              <span className="h-2 w-2 rounded-full bg-[#F2B33D]"></span> Mastery Velocity
            </div>
          </div>
        </div>

        {/* MASTERY PER CLASS GROUP (BAR CHART FROM REAL DATA) */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] lg:col-span-2 flex flex-col justify-between min-h-[320px]">
          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-amber-700" />
                <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Mastery per Class</h4>
              </div>
              <span className="text-[9px] font-bold text-[#521903]/40 uppercase">grade + section</span>
            </div>
            <p className="text-[10px] text-[#521903]/50 font-bold">Average progress &amp; student enrollment</p>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4 py-2">
            {metrics.classPerformance.length === 0 ? (
              <div className="py-10 text-center text-xs font-bold text-[#521903]/40">
                No classes found in database.
              </div>
            ) : (
              metrics.classPerformance.slice(0, 4).map((item) => {
                const widthPercent = Math.round((item.avgProgress / maxClassAvgProgress) * 100);
                return (
                  <div key={item.className} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-[#521903]">
                      <span className="truncate max-w-[140px]">{item.className}</span>
                      <span className="text-[10px] text-[#521903]/60 font-medium">
                        {item.studentCount} stu · <strong className="text-[#521903]">{item.avgProgress}%</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#F5E6C4]/40 h-7 rounded-lg overflow-hidden border border-[#F5E6C4]/60 p-0.5">
                      <div 
                        className="bg-gradient-to-r from-amber-600 to-[#F2B33D] h-full rounded-md shadow-sm transition-all duration-500"
                        style={{ width: `${Math.max(widthPercent, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between items-center text-[9px] font-bold text-[#521903]/40 border-t border-slate-100 pt-3 px-1">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>

      </div>

      {/* SECTION 5: LIVE STUDENT ACTIVITY FEED & LEADERBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* RECENT STUDENT ACTIVITY FEED */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] space-y-4">
          <div className="space-y-1 border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-700" />
              <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Recent Activity</h4>
            </div>
            <span className="text-[10px] font-bold text-[#521903]/50">Live Student Actions</span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold text-[#521903]/40">
              No recent student activity recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100/70">
              {[...filteredStudents]
                .sort((a, b) => (parseDateToMs(b.lastActive) || 0) - (parseDateToMs(a.lastActive) || 0))
                .slice(0, 5)
                .map((student) => {
                  const initial = (student.firstName || student.name || 'S').charAt(0).toUpperCase();
                  return (
                    <div 
                      key={student.id || student.uid} 
                      onClick={() => setInspectedStudent(student)}
                      className="flex items-center justify-between py-3.5 px-2 rounded-xl hover:bg-neutral-50/50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-[#F5E6C4]/70 flex items-center justify-center text-[#521903] font-black text-xs shadow-inner flex-shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-[#521903] truncate group-hover:text-amber-800 transition-colors">
                            {student.fullName || student.name}
                          </h5>
                          <p className="text-[11px] text-[#521903]/60 truncate font-medium">
                            {student.currentModule} · {student.gradeLevel} - {student.section}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <span className="text-xs font-black text-amber-600 block">
                          {(student.gamification?.xp || 0).toLocaleString()} XP ({student.progress || 0}%)
                        </span>
                        <span className="text-[10px] font-semibold text-[#521903]/40 block">
                          {formatActivityTime(student.lastActive)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* TOP PERFORMING STUDENTS (ACTUAL XP) */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] space-y-4">
          <div className="space-y-1 border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-700" />
              <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">
                Top Performing Students
              </h4>
            </div>
            <span className="text-[10px] font-bold text-[#521903]/50">Ranked by Total XP</span>
          </div>

          {metrics.topStudents.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold text-[#521903]/40">
              No top students found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100/70">
              {metrics.topStudents.map((st, idx) => (
                <div 
                  key={st.id || st.uid} 
                  onClick={() => setInspectedStudent(st)}
                  className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-neutral-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`h-7 w-7 rounded-full flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-[#521903] shadow-sm'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-[#F5E6C4]/60 text-[#521903]'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-[#521903] truncate group-hover:text-amber-800 transition-colors">
                        {st.fullName || st.name}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-[#521903]/60 font-medium">
                        <span>{st.gradeLevel} - {st.section}</span>
                        {st.gamification?.streak > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-700 font-bold">
                            <Flame className="h-3 w-3 fill-amber-500 text-amber-600" />
                            {st.gamification.streak}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <span className="text-xs font-black text-amber-700 block">
                      {(st.gamification?.xp || 0).toLocaleString()} XP
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-800 block">
                      {st.progress || 0}% Progress
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* SECTION 6: INACTIVE & AT-RISK STUDENTS INTERVENTION TABLE */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.04)] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-700" />
            <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">
              Students Needing Attention (Inactive &gt; 7 Days)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
            {metrics.inactiveStudents.length} Flagged for Intervention
          </span>
        </div>

        {metrics.inactiveStudents.length === 0 ? (
          <div className="py-6 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            All students in this cohort have logged in and practiced within the last 7 days!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-[#521903]/60 uppercase">
                  <th className="py-2.5 pr-4">Student</th>
                  <th className="py-2.5 px-4">Student ID</th>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4">XP</th>
                  <th className="py-2.5 px-4">Progress</th>
                  <th className="py-2.5 px-4">Last Activity</th>
                  <th className="py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {metrics.inactiveStudents.slice(0, 8).map((st) => (
                  <tr key={st.id || st.uid} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-[#521903]">{st.fullName || st.name}</div>
                      <div className="text-[10px] text-[#521903]/50">{st.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#521903]/80">
                      {st.studentId}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#521903]">
                      {st.gradeLevel} - {st.section}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      {(st.gamification?.xp || 0).toLocaleString()} XP
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-amber-900/15 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-700 h-full rounded-full" 
                            style={{ width: `${Math.min(st.progress || 0, 100)}%` }} 
                          />
                        </div>
                        <span className="font-bold text-[#521903] text-[10px]">{st.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-rose-700 font-bold text-[11px]">
                      {formatActivityTime(st.lastActive)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setInspectedStudent(st)}
                        className="px-2.5 py-1 bg-[#FAF6EE] text-[#521903] hover:bg-amber-100 border border-amber-900/20 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK STUDENT INSPECTION & INSTRUCTOR NOTE MODAL */}
      {inspectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF6EE] border border-amber-900/20 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-amber-900/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-200 text-[#521903] font-black text-lg flex items-center justify-center shadow-inner">
                  {(inspectedStudent.firstName || inspectedStudent.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#521903]">{inspectedStudent.fullName || inspectedStudent.name}</h3>
                  <p className="text-xs text-[#521903]/60 font-medium">
                    {inspectedStudent.studentId} · {inspectedStudent.gradeLevel} - {inspectedStudent.section} ({inspectedStudent.type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedStudent(null)}
                className="p-1.5 rounded-full hover:bg-amber-900/10 text-[#521903]/60 hover:text-[#521903] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/80 p-3 rounded-xl border border-amber-900/10 text-center">
                <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Progress</span>
                <p className="text-lg font-black text-[#521903]">{inspectedStudent.progress || 0}%</p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-900/10 text-center">
                <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Total XP</span>
                <p className="text-lg font-black text-amber-700">{(inspectedStudent.gamification?.xp || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-900/10 text-center">
                <span className="text-[10px] font-bold text-[#521903]/60 uppercase">Streak</span>
                <p className="text-lg font-black text-amber-600">{inspectedStudent.gamification?.streak || 0} days</p>
              </div>
            </div>

            {/* Module Breakdown */}
            <div className="bg-white/80 p-4 rounded-xl border border-amber-900/10 space-y-2">
              <h4 className="text-xs font-bold text-[#521903] uppercase">Curriculum Breakdown</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#521903]">Alphabet Mastery XP:</span>
                  <span className="font-bold text-amber-800">{inspectedStudent.gamification?.alphabetXp || 0} XP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#521903]">Numbers Mastery XP:</span>
                  <span className="font-bold text-amber-800">{inspectedStudent.gamification?.numbersXp || 0} XP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#521903]">Completed Lessons:</span>
                  <span className="font-bold text-[#521903]">{inspectedStudent.gamification?.completedLessons || 0} Lessons</span>
                </div>
              </div>
            </div>

            {/* Instructor Notes Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#521903] uppercase flex items-center gap-1.5">
                <MessageSquarePlus className="h-4 w-4 text-amber-800" />
                Instructor Notes &amp; Observations
              </h4>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add feedback or intervention note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-amber-900/20 text-[#521903] placeholder:text-[#521903]/40 focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
                <button
                  onClick={handleSaveTeacherNote}
                  disabled={isSubmittingNote || !noteText.trim()}
                  className="px-4 py-2 bg-[#521903] text-white rounded-xl text-xs font-bold hover:bg-[#3d1202] disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  Save
                </button>
              </div>

              {/* Note History */}
              <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1">
                {(!inspectedStudent.teacherNotes || inspectedStudent.teacherNotes.length === 0) ? (
                  <p className="text-[11px] text-[#521903]/50 italic text-center py-2">No notes added yet for this student.</p>
                ) : (
                  inspectedStudent.teacherNotes.map((note) => (
                    <div key={note.id} className="p-2.5 bg-white/60 rounded-xl border border-amber-900/10 text-xs space-y-0.5">
                      <div className="flex justify-between text-[10px] text-[#521903]/60 font-semibold">
                        <span>{note.authorName}</span>
                        <span>{formatActivityTime(note.createdAt)}</span>
                      </div>
                      <p className="text-[#521903] font-medium">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedStudent(null)}
                className="px-4 py-2 bg-[#FAF6EE] text-[#521903] border border-amber-900/20 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}