'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Eye, 
  RefreshCw, 
  Sparkles, 
  AlertCircle, 
  ArrowUpDown, 
  Archive, 
  RotateCcw, 
  ChevronDown 
} from 'lucide-react';
import { Student, getStudentsRealtime, archiveStudent, restoreStudent } from '@/lib/data-service';
import { StudentProfileDrawer } from '@/components/dashboard/student-profile-drawer';
import { usePreferences } from '@/lib/preferences-context';
import { useTranslation } from '@/lib/translations';

type ActiveCardFilter = 'none' | 'active' | 'evaluated' | 'proficient' | 'attention';

export default function TeacherStudentsPage() {
  const { preferences } = usePreferences();
  const t = useTranslation(preferences.language);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search, Dropdowns & Quick Metric Card Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [cardQuickFilter, setCardQuickFilter] = useState<ActiveCardFilter>('none');

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'score' | 'section'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected Student Drawer
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);

    const unsubscribe = getStudentsRealtime(
      (data) => {
        setStudents(data);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setErrorMessage('Unable to connect to live student records.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      const updated = students.find((s) => s.id === selectedStudent.id);
      if (updated) setSelectedStudent(updated);
    }
  }, [students, selectedStudent]);

  // Derived filter options from real records
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => { if (s.section) set.add(s.section); });
    return Array.from(set).sort();
  }, [students]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => { if (s.gradeLevel) set.add(s.gradeLevel); });
    return Array.from(set).sort();
  }, [students]);

  const availableModules = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => { if (s.currentModule) set.add(s.currentModule); });
    return Array.from(set).sort();
  }, [students]);

  // Real Cohort Metrics (calculated on active non-archived students)
  const metrics = useMemo(() => {
    const activeCohort = students.filter((s) => s.status !== 'archived');
    const totalCohort = activeCohort.length;
    const evaluatedStudents = activeCohort.filter((s) => s.score !== null && s.score !== undefined);
    
    const avgScore = evaluatedStudents.length > 0 
      ? Math.round(evaluatedStudents.reduce((acc, curr) => acc + (curr.score || 0), 0) / evaluatedStudents.length)
      : 0;

    const proficientCount = evaluatedStudents.filter((s) => (s.score || 0) >= 75).length;
    const proficiencyRate = evaluatedStudents.length > 0 
      ? Math.round((proficientCount / evaluatedStudents.length) * 100) 
      : 0;

    const needsAttentionCount = activeCohort.filter((s) => s.score !== null && (s.score || 0) < 50).length;

    return {
      totalCohort,
      avgScore: evaluatedStudents.length > 0 ? avgScore : '--',
      proficiencyRate: `${proficiencyRate}%`,
      needsAttentionCount,
    };
  }, [students]);

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    const result = students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q ||
        (s.name?.toLowerCase().includes(q) ?? false) ||
        (s.studentId?.toLowerCase().includes(q) ?? false) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.section?.toLowerCase().includes(q) ?? false) ||
        (s.gradeLevel?.toLowerCase().includes(q) ?? false) ||
        ((s as any).department?.toLowerCase()?.includes(q) ?? false);

      const matchesSection = sectionFilter === 'All' || s.section === sectionFilter;
      const matchesGrade = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
      const matchesModule = moduleFilter === 'All' || s.currentModule === moduleFilter;
      const matchesType = typeFilter === 'All' || s.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

      let matchesCard = true;
      if (cardQuickFilter === 'active') {
        matchesCard = s.status === 'active';
      } else if (cardQuickFilter === 'evaluated') {
        matchesCard = s.score !== null && s.score !== undefined;
      } else if (cardQuickFilter === 'proficient') {
        matchesCard = s.score !== null && s.score !== undefined && s.score >= 75;
      } else if (cardQuickFilter === 'attention') {
        matchesCard = s.score !== null && s.score !== undefined && s.score < 50;
      }

      return matchesQuery && matchesSection && matchesGrade && matchesModule && matchesType && matchesStatus && matchesCard;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = (a.name || '').localeCompare(b.name || '');
      else if (sortBy === 'id') comparison = (a.studentId || '').localeCompare(b.studentId || '');
      else if (sortBy === 'section') comparison = (a.section || '').localeCompare(b.section || '');
      else if (sortBy === 'score') comparison = (a.score || 0) - (b.score || 0);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchQuery, sectionFilter, gradeFilter, moduleFilter, typeFilter, statusFilter, cardQuickFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'id' | 'score' | 'section') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleCardClick = (filterType: ActiveCardFilter) => {
    if (cardQuickFilter === filterType) {
      setCardQuickFilter('none');
    } else {
      setCardQuickFilter(filterType);
      if (filterType === 'active') setStatusFilter('active');
    }
  };

  const handleQuickToggleArchive = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    try {
      if (student.status === 'archived') await restoreStudent(student.id);
      else await archiveStudent(student.id);
    } catch (err) {
      console.error('Failed to toggle archive status:', err);
    }
  };

  const handleOpenDrawer = (student: Student) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
  };

  return (
    <div className="w-full h-full flex flex-col font-sans gap-4 text-stone-800 dark:text-stone-100 overflow-hidden">
      
      {/* Top Header Tag */}
      <div className="flex items-center justify-between shrink-0">
        <div className="inline-flex items-center gap-2 bg-[#F5E6C4]/70 dark:bg-[#2A231F] border border-amber-900/10 dark:border-stone-800 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider text-[#521903] dark:text-[#F0AB31] uppercase shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#F0AB31]" />
          <span>{(t as any)('studentManagement') || 'STUDENT MANAGEMENT'}</span>
        </div>
      </div>

      {/* Interactive Metric Filter Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        
        {/* TOTAL ACTIVE COHORT */}
        <div 
          onClick={() => handleCardClick('active')}
          title="Filter Active students"
          className={`cursor-pointer transition-all duration-200 p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 select-none ${
            cardQuickFilter === 'active'
              ? 'bg-sky-50/90 dark:bg-sky-950/50 border-sky-400 ring-2 ring-sky-400/40'
              : 'bg-white/80 dark:bg-[#1A1614]/85 hover:bg-sky-50/40 border-white/60 dark:border-[#382F2A]'
          }`}
        >
          <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900/40">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-[#A0938A] truncate">Active Cohort</p>
            <p className="text-2xl font-black text-[#521903] dark:text-[#F3EFEA] tracking-tight leading-none mt-1">{loading ? '--' : metrics.totalCohort}</p>
          </div>
        </div>

        {/* CLASS AVG SCORE */}
        <div 
          onClick={() => handleCardClick('evaluated')}
          title="Filter Evaluated students"
          className={`cursor-pointer transition-all duration-200 p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 select-none ${
            cardQuickFilter === 'evaluated'
              ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/40'
              : 'bg-white/80 dark:bg-[#1A1614]/85 hover:bg-amber-50/40 border-white/60 dark:border-[#382F2A]'
          }`}
        >
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-[#3B2810] text-[#D98A1C] dark:text-[#FCD34D] flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-[#A0938A] truncate">Class Avg Score</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-[#521903] dark:text-[#F3EFEA] tracking-tight leading-none">{loading ? '--' : metrics.avgScore}</span>
              <span className="text-xs text-stone-400 font-bold">/100</span>
            </div>
          </div>
        </div>

        {/* PROFICIENCY RATE */}
        <div 
          onClick={() => handleCardClick('proficient')}
          title="Filter Proficient students (≥ 75%)"
          className={`cursor-pointer transition-all duration-200 p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 select-none ${
            cardQuickFilter === 'proficient'
              ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-400/40'
              : 'bg-white/80 dark:bg-[#1A1614]/85 hover:bg-emerald-50/40 border-white/60 dark:border-[#382F2A]'
          }`}
        >
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-[#A0938A] truncate">Proficiency Rate</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight leading-none mt-1">{loading ? '--' : metrics.proficiencyRate}</p>
          </div>
        </div>

        {/* NEEDS ATTENTION */}
        <div 
          onClick={() => handleCardClick('attention')}
          title="Filter students needing Intervention (< 50%)"
          className={`cursor-pointer transition-all duration-200 p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 select-none ${
            cardQuickFilter === 'attention'
              ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-400 ring-2 ring-rose-400/40'
              : 'bg-white/80 dark:bg-[#1A1614]/85 hover:bg-rose-50/40 border-white/60 dark:border-[#382F2A]'
          }`}
        >
          <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-[#3E1C22] text-rose-600 dark:text-[#FDA4AF] flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-[#A0938A] truncate">Needs Attention</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none mt-1">{loading ? '--' : metrics.needsAttentionCount}</p>
          </div>
        </div>

      </div>

      {/* Main Student Ledger Card Container */}
      <div className="bg-white/80 dark:bg-[#1A1614]/85 backdrop-blur-2xl rounded-3xl p-5 border border-white/60 dark:border-[#382F2A] shadow-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pb-4 border-b border-stone-200/60 dark:border-[#382F2A] shrink-0">
          
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, student ID, email, grade, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white/90 dark:bg-[#0D0B0A] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F0AB31] text-stone-800 dark:text-stone-100 placeholder:text-stone-400 shadow-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCardQuickFilter('none');
                }}
                className="appearance-none h-10 pl-4 pr-9 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white/90 dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="inactive">Inactive</option>
                <option value="All">All Status</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Grade Filter */}
            <div className="relative flex items-center">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="appearance-none h-10 pl-4 pr-9 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white/90 dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Grades</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Section Filter */}
            <div className="relative flex items-center">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="appearance-none h-10 pl-4 pr-9 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white/90 dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Module Filter */}
            <div className="relative flex items-center">
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="appearance-none h-10 pl-4 pr-9 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white/90 dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Modules</option>
                {availableModules.map((mod) => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Type Filter */}
            <div className="relative flex items-center">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none h-10 pl-4 pr-9 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white/90 dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Types</option>
                <option value="REGULAR">Regular</option>
                <option value="SNED">SNED</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-[#F0AB31]" />
              <p className="text-xs font-bold">Querying live student database...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center py-16 text-rose-500 gap-2 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 p-6 text-center">
              <AlertCircle className="h-7 w-7" />
              <p className="text-xs font-bold">{errorMessage}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-2 border border-dashed border-stone-200 dark:border-[#382F2A] rounded-2xl">
              <Users className="h-8 w-8 text-stone-300 dark:text-stone-600" />
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400">No student records found matching filter criteria.</p>
              <span className="text-[11px] text-stone-400">Student accounts are populated directly from the mobile application.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              
              {/* Header Row */}
              <div className="grid grid-cols-[2.2fr_0.8fr_1.2fr_1.4fr_1.3fr_110px] gap-3 px-4 text-[10px] font-black tracking-widest text-[#B59275] dark:text-[#A0938A] uppercase select-none items-center">
                <div 
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-[#521903] dark:hover:text-[#F0AB31] transition-colors"
                >
                  <span>STUDENT PROFILING LEDGER</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60 shrink-0" />
                </div>
                <div>TYPE TAG</div>
                <div 
                  onClick={() => toggleSort('section')}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-[#521903] dark:hover:text-[#F0AB31] transition-colors"
                >
                  <span>SECTION & LEVEL</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60 shrink-0" />
                </div>
                <div>CURRENT MODULE TRACKING</div>
                <div 
                  onClick={() => toggleSort('score')}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-[#521903] dark:hover:text-[#F0AB31] transition-colors"
                >
                  <span>PERFORMANCE METRICS</span>
                  <ArrowUpDown className="h-3 w-3 opacity-60 shrink-0" />
                </div>
                <div className="text-right pr-2">ACTION DECK</div>
              </div>

              {/* Data Rows */}
              {filteredStudents.map((stu) => {
                const hasScore = stu.score !== null && stu.score !== undefined;
                const isAttentionNeeded = hasScore && (stu.score || 0) < 50;
                const isArchived = stu.status === 'archived';
                const stuInitials = (stu.name || 'ST')
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'ST';

                return (
                  <div
                    key={stu.id}
                    className={`grid grid-cols-[2.2fr_0.8fr_1.2fr_1.4fr_1.3fr_110px] gap-3 items-center min-h-[58px] p-3 rounded-full bg-white/90 dark:bg-[#151311]/90 hover:bg-amber-50/40 dark:hover:bg-[#2A231F] border border-stone-100 dark:border-[#382F2A] shadow-xs transition-all duration-200 group ${
                      isArchived ? 'opacity-70' : ''
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-0 pl-2">
                      {stu.avatar ? (
                        <img
                          src={stu.avatar}
                          alt={stu.name}
                          className="h-10 w-10 rounded-full object-cover border border-amber-900/10 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-[#F5E6C4] dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] font-black text-xs flex items-center justify-center uppercase shrink-0 border border-amber-900/10">
                          {stuInitials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-[#521903] dark:text-[#F3EFEA] group-hover:text-[#9F4409] transition-colors truncate">
                            {stu.name}
                          </span>
                          {isAttentionNeeded && !isArchived && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" title="Needs Academic Intervention" />
                          )}
                          {isArchived && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold uppercase shrink-0">
                              Archived
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-bold text-stone-400 dark:text-[#8C8077] block truncate">
                          ID: {stu.studentId}
                        </span>
                      </div>
                    </div>

                    {/* Type Tag */}
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                        stu.type === 'SNED'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      }`}>
                        {stu.type}
                      </span>
                    </div>

                    {/* Section & Level */}
                    <div className="truncate">
                      <span className="font-bold text-xs text-stone-800 dark:text-stone-200 block truncate">{stu.section}</span>
                      <span className="text-stone-400 text-[10px] block font-semibold truncate">{stu.gradeLevel}</span>
                    </div>

                    {/* Module */}
                    <div className="truncate">
                      <p className="font-bold text-xs text-stone-700 dark:text-stone-300 truncate">{stu.currentModule}</p>
                      <p className="text-[10px] text-stone-400 truncate">{stu.currentTask}</p>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      {hasScore ? (
                        <div className="space-y-1 max-w-[130px]">
                          <span className={`text-xs font-black block leading-none ${
                            stu.score! >= 75 
                              ? 'text-[#059669] dark:text-emerald-400' 
                              : stu.score! >= 50 
                              ? 'text-[#D97706] dark:text-amber-400' 
                              : 'text-[#E11D48] dark:text-rose-400'
                          }`}>
                            {stu.score}%
                          </span>
                          <div className="h-1 w-full bg-stone-200/80 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                stu.score! >= 75 
                                  ? 'bg-[#059669]' 
                                  : stu.score! >= 50 
                                  ? 'bg-[#D97706]' 
                                  : 'bg-[#E11D48]'
                              }`}
                              style={{ width: `${Math.min(stu.score || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-[#9CA3AF] dark:text-stone-500">
                          Not evaluated
                        </span>
                      )}
                    </div>

                    {/* Action Deck */}
                    <div className="flex items-center justify-end gap-1.5 pr-2">
                      <button
                        onClick={(e) => handleQuickToggleArchive(e, stu)}
                        title={isArchived ? "Restore Student" : "Archive Student"}
                        className="h-8 w-8 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#2A231F] hover:bg-stone-100 flex items-center justify-center text-stone-500 dark:text-stone-400 transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        {isArchived ? <RotateCcw className="h-3.5 w-3.5 text-emerald-600" /> : <Archive className="h-3.5 w-3.5 text-stone-400" />}
                      </button>

                      <button
                        onClick={() => handleOpenDrawer(stu)}
                        title="View Student Profile"
                        className="h-8 px-3 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#2A231F] hover:bg-[#F8B936] hover:text-[#521903] hover:border-[#DC8C18] text-stone-700 dark:text-stone-300 text-[10.5px] font-black inline-flex items-center gap-1.5 transition-all shadow-xs shrink-0 active:translate-y-px cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>VIEW</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ledger Statistics Footer */}
        <div className="pt-3 border-t border-stone-100 dark:border-[#382F2A] flex items-center justify-between text-xs text-stone-400 shrink-0">
          <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> enrolled students</span>
          <span className="font-semibold text-[11px]">Real-time Firestore Sync Active</span>
        </div>

      </div>

      {/* Profile Details & Monitoring Drawer */}
      {drawerOpen && selectedStudent && (
        <StudentProfileDrawer
          student={selectedStudent}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedStudent(null);
          }}
        />
      )}

    </div>
  );
}