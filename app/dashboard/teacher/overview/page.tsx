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
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { 
  getStudentsRealtime, 
  Student, 
  calculateDashboardMetrics, 
  DashboardMetrics,
  parseDateToMs 
} from '@/lib/data-service';

export default function TeacherDashboardTelemetryOverviewPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Filter students based on UI selections
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
      const matchesSection = selectedSection === 'all' || s.section === selectedSection;
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSection && matchesSearch;
    });
  }, [students, selectedGrade, selectedSection, searchQuery]);

  // Compute all metrics dynamically from Firestore
  const metrics: DashboardMetrics = useMemo(() => {
    return calculateDashboardMetrics(filteredStudents);
  }, [filteredStudents]);

  // Calculate student classification counts directly from live Firestore records
  const studentTypeCounts = useMemo(() => {
    let sned = 0;
    let regular = 0;
    filteredStudents.forEach((s) => {
      if (s.type === 'SNED') sned++;
      else regular++;
    });
    return { sned, regular };
  }, [filteredStudents]);

  const maxClassAvgProgress = useMemo(() => {
    if (!metrics.classPerformance.length) return 100;
    return Math.max(...metrics.classPerformance.map((c) => c.avgProgress), 10);
  }, [metrics.classPerformance]);

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

  // Progress buckets for telemetry chart from actual progress values
  const progressBuckets = useMemo(() => {
    const buckets = [
      { label: '0-25%', count: 0 },
      { label: '26-50%', count: 0 },
      { label: '51-75%', count: 0 },
      { label: '76-100%', count: 0 }
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

  // Compute live SVG line graph points based on real progress tiers
  const progressChartPoints = useMemo(() => {
    const total = filteredStudents.length || 1;
    const p1 = Math.round((progressBuckets.buckets[0].count / total) * 100);
    const p2 = Math.round(((progressBuckets.buckets[0].count + progressBuckets.buckets[1].count) / total) * 100);
    const p3 = Math.round(((progressBuckets.buckets[0].count + progressBuckets.buckets[1].count + progressBuckets.buckets[2].count) / total) * 100);
    const p4 = 100;

    // SVG Y inverted scale: y = 150 - (value / 100) * 130
    const getY = (val: number) => 150 - (val / 100) * 130;

    return {
      path: `M 40,${getY(p1)} L 185,${getY(p2)} L 330,${getY(p3)} L 475,${getY(p4)}`,
      coords: [
        { cx: 40, cy: getY(p1), val: p1 },
        { cx: 185, cy: getY(p2), val: p2 },
        { cx: 330, cy: getY(p3), val: p3 },
        { cx: 475, cy: getY(p4), val: p4 }
      ]
    };
  }, [filteredStudents, progressBuckets]);

  if (loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] space-y-4">
        <RefreshCw className="h-9 w-9 animate-spin text-amber-800" />
        <p className="text-sm font-semibold text-[#521903] tracking-wide">
          Connecting to Firestore student telemetry...
        </p>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="p-8 bg-rose-50/80 border border-rose-200 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-8 w-8 text-rose-700 mx-auto" />
        <h4 className="text-base font-bold text-[#521903]">Telemetry Sync Error</h4>
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
    <div className="space-y-6 p-2 max-w-7xl mx-auto pb-10">
      
      {/* WELCOME BANNER WITH CONTROLS */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#521903] tracking-tight">
              Welcome back, Instructor!
            </h1>
            <p className="text-xs text-[#521903]/70 font-medium">
              Monitor your gamified Filipino Sign Language (FSL) classroom progress, view live application student actions, and adjust lesson paths below.
            </p>
          </div>

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
          </div>
        </div>
      </div>

      {/* SECTION 1: TOP 3D TELEMETRY CARDS (CALCULATED FROM FIRESTORE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
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

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">AVG MASTERY LEVEL</span>
            <h3 className="text-3xl font-black text-[#521903] tracking-tight">
              {metrics.avgProgress}%
            </h3>
            <p className="text-[11px] text-[#521903]/60 font-semibold">
              Total XP: {metrics.totalXp.toLocaleString()} · Avg: {metrics.avgXp.toLocaleString()} XP
            </p>
          </div>
          <div className="p-2.5 rounded-xl text-[#521903] bg-amber-50 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">AT RISK STUDENTS</span>
            <h3 className="text-3xl font-black text-rose-700 tracking-tight">
              {metrics.inactiveStudents.length}
            </h3>
            <p className="text-[11px] text-rose-700/80 font-semibold">
              Inactive for &gt; 7 days
            </p>
          </div>
          <div className="p-2.5 rounded-xl text-rose-700 bg-rose-50 shadow-inner">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* DOMAIN MODULE BREAKDOWN (REAL XP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] flex items-center justify-between">
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

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] flex items-center justify-between">
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

      {/* SECTION 2: GRAPH MONITORING CORE DATA MATRIX (REAL PROGRESS & CLASS MASTERY) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        
        {/* LINE GRAPH: Progress Distribution Telemetry */}
        <div className="bg-white/80 backdrop-blur-md p-7 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] lg:col-span-3 flex flex-col justify-between min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-700" />
              <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">PROGRESS OVER TIME</h4>
            </div>
            <span className="text-[10px] font-bold text-[#521903]/50">
              {filteredStudents.length} Active Students
            </span>
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-xs font-bold text-[#521903]/40">
              No student progress data available for the current filter.
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[180px] relative mt-2">
              <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                <line x1="40" y1="20" x2="40" y2="150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="150" x2="480" y2="150" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="85" x2="480" y2="85" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />

                <text x="10" y="25" className="text-[10px] font-bold fill-[#521903]/40">100</text>
                <text x="15" y="90" className="text-[10px] font-bold fill-[#521903]/40">50</text>
                <text x="20" y="155" className="text-[10px] font-bold fill-[#521903]/40">0</text>

                <text x="35" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q1 (0-25%)</text>
                <text x="170" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q2 (26-50%)</text>
                <text x="315" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q3 (51-75%)</text>
                <text x="450" y="170" className="text-[10px] font-bold fill-[#521903]/40">Q4 (76-100%)</text>

                {/* Live path calculated from Firestore student distribution */}
                <path 
                  d={progressChartPoints.path} 
                  fill="none" 
                  stroke="#F2B33D" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                />

                {progressChartPoints.coords.map((pt, idx) => (
                  <g key={idx}>
                    <circle cx={pt.cx} cy={pt.cy} r="4" fill="white" stroke="#D97706" strokeWidth="2.5" />
                    <text x={pt.cx - 8} y={pt.cy - 8} className="text-[9px] font-bold fill-[#521903]">
                      {progressBuckets.buckets[idx].count}
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
              <span className="h-2 w-2 rounded-full bg-[#F2B33D]"></span> Mastery Curve
            </div>
          </div>
        </div>

        {/* BAR CHART: Classroom Mastery Profiles (Real Grade & Section Data) */}
        <div className="bg-white/80 backdrop-blur-md p-7 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] lg:col-span-2 flex flex-col justify-between min-h-[320px]">
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-amber-700" />
              <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">MASTERY PER CLASS</h4>
            </div>
            <p className="text-[10px] text-[#521903]/50 font-bold">Average mastery level by class group</p>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4 py-2">
            {metrics.classPerformance.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-[#521903]/40">
                No class or section data found in database.
              </div>
            ) : (
              metrics.classPerformance.slice(0, 4).map((item) => {
                const widthPercent = Math.round((item.avgProgress / maxClassAvgProgress) * 100);
                return (
                  <div key={item.className} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-[#521903]">
                      <span className="truncate max-w-[140px]">{item.className}</span>
                      <span className="opacity-70 font-medium">
                        {item.studentCount} stu · <strong className="text-[#521903]">{item.avgProgress}%</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#F5E6C4]/40 h-7 rounded-lg overflow-hidden border border-[#F5E6C4]/60 p-0.5">
                      <div 
                        className="bg-[#F2B33D] h-full rounded-md shadow-sm transition-all duration-500"
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

      {/* SECTION 3: RECENT ACTIVITIES LOG (PULLED FROM LIVE FIRESTORE STUDENTS) */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] space-y-4">
        <div className="space-y-1 border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-700" />
            <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Recent Activity</h4>
          </div>
          <p className="text-[10px] text-[#521903]/50 font-bold">Latest student actions from database</p>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-[#521903]/40">
            No student activity records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100/70">
            {[...filteredStudents]
              .sort((a, b) => (parseDateToMs(b.lastActive) || 0) - (parseDateToMs(a.lastActive) || 0))
              .slice(0, 5)
              .map((student) => {
                const initial = (student.firstName || student.name || 'S').charAt(0).toUpperCase();
                return (
                  <div key={student.id || student.uid} className="flex items-center justify-between py-3.5 px-2 rounded-xl hover:bg-neutral-50/50 transition-colors group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-[#F5E6C4]/70 flex items-center justify-center text-[#521903] font-black text-xs shadow-inner flex-shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#521903] truncate">{student.fullName || student.name}</h5>
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

    </div>
  );
}