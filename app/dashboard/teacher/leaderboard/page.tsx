'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  ChevronDown, 
  X,
  Zap,
  Star,
  RefreshCw,
  Flame,
  Calendar,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Student, getStudentsRealtime } from '@/lib/data-service';

interface DynamicModuleItem {
  id: string;
  name: string;
}

interface RankedStudent extends Student {
  calculatedScore: number;
  displayRank: number;
  isTied: boolean;
}

export default function TeacherLeaderboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Dynamic Scope & Dimension Filters
  const [activeScope, setActiveScope] = useState<string>('overall');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [classificationFilter, setClassificationFilter] = useState<string>('All');

  // Selected Student Profile Inspection
  const [selectedStudent, setSelectedStudent] = useState<RankedStudent | null>(null);

  // Subscribe in real-time to Firestore for student records
  useEffect(() => {
    setLoading(true);
    const unsubscribe = getStudentsRealtime(
      (data) => {
        const eligibleStudents = data.filter(
          (s) => s.status !== 'rejected' && s.status !== 'archived'
        );
        setStudents(eligibleStudents);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching realtime leaderboard data:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Dynamically discover all active & upcoming modules present across student records
  const dynamicModules = useMemo<DynamicModuleItem[]>(() => {
    const map = new Map<string, string>();
    
    // Core foundational modules
    map.set('alphabet', 'Alphabet');
    map.set('numbers', 'Numbers');

    students.forEach((s) => {
      // 1. Inspect structured moduleProgress list
      if (Array.isArray(s.moduleProgress)) {
        s.moduleProgress.forEach((m) => {
          if (m.moduleId && !map.has(m.moduleId.toLowerCase())) {
            map.set(m.moduleId.toLowerCase(), m.moduleName || m.moduleId.replace(/_/g, ' '));
          }
        });
      }

      // 2. Inspect raw progress map keys
      const rawDoc = s.rawDoc || {};
      const progressObj = (rawDoc.progress && typeof rawDoc.progress === 'object') ? rawDoc.progress : {};
      Object.keys(progressObj).forEach((k) => {
        const modPrefix = k.split('_')[0].toLowerCase();
        if (modPrefix && !map.has(modPrefix)) {
          const cleanName = modPrefix.charAt(0).toUpperCase() + modPrefix.slice(1);
          map.set(modPrefix, cleanName);
        }
      });

      // 3. Inspect dynamic XP attributes (e.g. phrasesXp, colorsXp)
      Object.keys(rawDoc).forEach((key) => {
        if (key.endsWith('Xp') && key !== 'weeklyXp' && key !== 'dailyXp' && key !== 'xp') {
          const modKey = key.replace(/Xp$/, '').toLowerCase();
          if (!map.has(modKey)) {
            const formatted = modKey.charAt(0).toUpperCase() + modKey.slice(1);
            map.set(modKey, formatted);
          }
        }
      });
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => { if (s.section) set.add(s.section); });
    return Array.from(set).sort();
  }, [students]);

  // Extract score based on dynamically selected scope or module ID
  const getScoreForScope = (student: Student, scopeKey: string): number => {
    const g = student.gamification;
    const raw = student.rawDoc || {};

    if (scopeKey === 'overall') {
      return typeof g.xp === 'number' ? g.xp : (typeof raw.xp === 'number' ? raw.xp : 0);
    }
    if (scopeKey === 'weekly') {
      return typeof g.weeklyXp === 'number' ? g.weeklyXp : (typeof raw.weeklyXp === 'number' ? raw.weeklyXp : 0);
    }
    if (scopeKey === 'daily') {
      return typeof g.dailyXp === 'number' ? g.dailyXp : (typeof raw.dailyXp === 'number' ? raw.dailyXp : 0);
    }
    if (scopeKey === 'alphabet') {
      return typeof g.alphabetXp === 'number' ? g.alphabetXp : (typeof raw.alphabetXp === 'number' ? raw.alphabetXp : 0);
    }
    if (scopeKey === 'numbers') {
      return typeof g.numbersXp === 'number' ? g.numbersXp : (typeof raw.numbersXp === 'number' ? raw.numbersXp : 0);
    }

    const dynamicKey = `${scopeKey}Xp`;
    if (typeof (raw as any)[dynamicKey] === 'number') {
      return (raw as any)[dynamicKey];
    }

    if (Array.isArray(student.moduleProgress)) {
      const match = student.moduleProgress.find((m) => m.moduleId.toLowerCase() === scopeKey.toLowerCase());
      if (match && typeof match.xp === 'number') return match.xp;
    }

    const progressObj = (raw.progress && typeof raw.progress === 'object') ? raw.progress : {};
    let sumStars = 0;
    Object.entries(progressObj).forEach(([k, v]) => {
      if (k.toLowerCase().startsWith(scopeKey.toLowerCase()) && typeof v === 'number') {
        sumStars += v;
      }
    });

    return sumStars * 100;
  };

  const scopeMeta = useMemo(() => {
    if (activeScope === 'overall') return { label: 'All-Time Total XP', unit: 'Total XP' };
    if (activeScope === 'weekly') return { label: 'Weekly XP', unit: 'Weekly XP' };
    if (activeScope === 'daily') return { label: 'Daily XP', unit: 'Daily XP' };

    const matched = dynamicModules.find((m) => m.id === activeScope);
    const title = matched ? matched.name : activeScope;
    return { label: `${title} Module XP`, unit: `${title} XP` };
  }, [activeScope, dynamicModules]);

  const rankedStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      const matchesGrade = gradeFilter === 'All' || s.gradeLevel === gradeFilter;
      const matchesSection = sectionFilter === 'All' || s.section === sectionFilter;
      const matchesClass = classificationFilter === 'All' || s.type === classificationFilter;

      return matchesGrade && matchesSection && matchesClass;
    });

    const sorted = filtered.map((s) => ({
      ...s,
      calculatedScore: getScoreForScope(s, activeScope),
    })).sort((a, b) => {
      if (b.calculatedScore !== a.calculatedScore) {
        return b.calculatedScore - a.calculatedScore;
      }
      return (a.studentId || '').localeCompare(b.studentId || '');
    });

    let currentRank = 1;
    const finalRanked: RankedStudent[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i - 1];

      if (i > 0 && current.calculatedScore === prev.calculatedScore) {
        finalRanked.push({
          ...current,
          displayRank: finalRanked[i - 1].displayRank,
          isTied: true,
        });
        if (!finalRanked[i - 1].isTied) {
          finalRanked[i - 1].isTied = true;
        }
      } else {
        currentRank = i + 1;
        finalRanked.push({
          ...current,
          displayRank: currentRank,
          isTied: false,
        });
      }
    }

    return finalRanked;
  }, [students, activeScope, gradeFilter, sectionFilter, classificationFilter]);

  const top1 = rankedStudents[0] || null;
  const top2 = rankedStudents[1] || null;
  const top3 = rankedStudents[2] || null;

  const getInitials = (name: string) => {
    return (name || 'ST')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="w-full h-auto md:h-full flex flex-col font-sans gap-4 text-stone-800 dark:text-stone-100 overflow-visible md:overflow-hidden">
      <div className="flex items-center justify-between shrink-0 px-1 pt-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-[#521903] dark:text-[#F0AB31] font-serif">
            STUDENT LEADERBOARD & PERFORMANCE RANKINGS
          </h2>
          <p className="text-xs text-stone-400 font-semibold mt-0.5">
            Dynamic competency leaderboards with automated module discovery and live ranking metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-400">Enrolled Cohort:</span>
          <span className="h-8 px-3.5 rounded-full bg-white dark:bg-[#1A1614] border border-stone-200 dark:border-[#382F2A] font-black text-xs text-[#521903] dark:text-[#F0AB31] shadow-xs flex items-center justify-center">
            {students.length} Learners
          </span>
        </div>
      </div>

      {/* Main Leaderboard Card */}
      <div className="bg-white/90 dark:bg-[#1A1614]/85 backdrop-blur-2xl rounded-3xl p-5 border border-white/70 dark:border-[#382F2A] shadow-xl flex-1 flex flex-col min-h-[560px] md:min-h-0 overflow-hidden space-y-4">
        
        {/* Controls Strip: Dynamic Scope Tabs + Dimensions */}
        <div className="space-y-3 shrink-0 pb-3 border-b border-stone-100 dark:border-[#382F2A]">
          
          {/* Top Row: Dynamic Metric & Module Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 dark:bg-[#0D0B0A] p-1 rounded-full border border-stone-200/80 dark:border-[#382F2A]">
              
              <button
                type="button"
                onClick={() => setActiveScope('overall')}
                className={`h-8 px-3.5 rounded-full transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                  activeScope === 'overall'
                    ? 'bg-[#521903] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>Overall All-Time</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScope('weekly')}
                className={`h-8 px-3.5 rounded-full transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                  activeScope === 'weekly'
                    ? 'bg-[#521903] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Weekly XP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScope('daily')}
                className={`h-8 px-3.5 rounded-full transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                  activeScope === 'daily'
                    ? 'bg-[#521903] text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Daily XP</span>
              </button>

              {dynamicModules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveScope(mod.id)}
                  className={`h-8 px-3.5 rounded-full transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                    activeScope === mod.id
                      ? 'bg-[#521903] text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{mod.name} Module</span>
                </button>
              ))}

            </div>

            <div className="flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-amber-50/80 dark:bg-[#2A231F] border border-amber-200/80 dark:border-amber-900/40 text-[11px] font-extrabold text-[#521903] dark:text-[#F0AB31] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-[#F0AB31]" />
              <span>Ranking by {scopeMeta.label}</span>
            </div>
          </div>

          {/* Bottom Row: Filter Dropdowns */}
          <div className="flex items-center flex-wrap justify-start sm:justify-end gap-2.5 pt-1 border-t border-stone-100 dark:border-[#382F2A]">
            <span className="text-xs font-bold text-stone-400 mr-1">Filter Cohort:</span>
            
            {/* Classification */}
            <div className="relative">
              <select 
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Classifications</option>
                <option value="REGULAR">Regular</option>
                <option value="SNED">SNED</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Grade */}
            <div className="relative">
              <select 
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Grades</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>

            {/* Section */}
            <div className="relative">
              <select 
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-stone-200 dark:border-[#382F2A] bg-white dark:bg-[#0D0B0A] text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F0AB31] shadow-xs cursor-pointer text-center leading-normal"
              >
                <option value="All">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Dynamic Leaderboard Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-[#F0AB31]" />
            <p className="text-xs font-bold">Calculating real-time leaderboards from Firebase records...</p>
          </div>
        ) : rankedStudents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-stone-400 gap-2 border border-dashed border-stone-200 dark:border-[#382F2A] rounded-2xl">
            <Trophy className="h-8 w-8 text-stone-300 dark:text-stone-600" />
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400">No student rankings available for this category.</p>
            <span className="text-[11px] text-stone-400">Student scores will populate dynamically as learners progress through this module.</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 pr-1">
            
            {/* 3D Elevated Podium Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end justify-center pt-8 pb-1 max-w-3xl mx-auto w-full shrink-0">
              
              {/* 2ND PLACE - SILVER PODIUM */}
              <div className="w-full flex flex-col items-center relative order-2 sm:order-1">
                {top2 ? (
                  <>
                    <div 
                      onClick={() => setSelectedStudent(top2)}
                      className="h-10 w-10 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 rounded-full text-slate-700 shadow-md border-2 border-white dark:border-[#1A1614] z-10 translate-y-3.5 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
                    >
                      <Medal className="h-5 w-5" />
                    </div>
                    <div 
                      onClick={() => setSelectedStudent(top2)}
                      className="w-full bg-gradient-to-b from-slate-50/90 to-white/95 dark:from-[#211E1B] dark:to-[#151311] border border-slate-200/80 dark:border-[#382F2A] rounded-3xl pt-6 pb-4 px-4 text-center h-44 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                          <span>#2 Silver</span>
                          {top2.isTied && <span className="text-amber-600 font-extrabold">(Tied)</span>}
                        </div>
                        <h3 className="font-extrabold text-sm text-[#521903] dark:text-[#F3EFEA] truncate">{top2.name}</h3>
                        <p className="text-[10px] text-stone-400 font-bold truncate">{top2.gradeLevel} &bull; {top2.section}</p>
                      </div>

                      <div className="p-2 rounded-2xl bg-white/80 dark:bg-[#0D0B0A] border border-slate-200/60 dark:border-stone-800 space-y-0.5 shadow-xs">
                        <span className="text-xl font-black text-slate-700 dark:text-slate-300 leading-none block">
                          {top2.calculatedScore.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">
                          {scopeMeta.unit}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-44 rounded-3xl border border-dashed border-stone-200 dark:border-[#382F2A] flex items-center justify-center text-xs font-bold text-stone-300">
                    2nd Place Empty
                  </div>
                )}
              </div>

              {/* 1ST PLACE - GOLD CHAMPION PODIUM */}
              <div className="w-full flex flex-col items-center relative order-1 sm:order-2">
                {top1 ? (
                  <>
                    <div 
                      onClick={() => setSelectedStudent(top1)}
                      className="h-12 w-12 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 rounded-full text-white shadow-lg border-2 border-white dark:border-[#1A1614] ring-4 ring-amber-400/20 z-10 translate-y-4 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
                    >
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div 
                      onClick={() => setSelectedStudent(top1)}
                      className="w-full bg-gradient-to-b from-amber-50/90 to-white/95 dark:from-[#2A231F] dark:to-[#151311] border-2 border-amber-300/80 dark:border-amber-500/40 rounded-3xl pt-7 pb-5 px-4 text-center h-52 flex flex-col justify-between shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                          <span>🥇 Top Performer</span>
                          {top1.isTied && <span className="text-amber-600 font-extrabold">(Tied)</span>}
                        </div>
                        <h3 className="font-black text-base text-[#521903] dark:text-[#F3EFEA] truncate">{top1.name}</h3>
                        <p className="text-[10.5px] text-amber-900/60 dark:text-stone-400 font-bold truncate">{top1.gradeLevel} &bull; {top1.section}</p>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-white/90 dark:bg-[#0D0B0A] border border-amber-200/80 dark:border-stone-800 space-y-0.5 shadow-xs">
                        <span className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none block">
                          {top1.calculatedScore.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] font-extrabold text-[#521903]/50 dark:text-stone-400 uppercase tracking-wider block">
                          {scopeMeta.unit}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* 3RD PLACE - BRONZE PODIUM */}
              <div className="w-full flex flex-col items-center relative order-3">
                {top3 ? (
                  <>
                    <div 
                      onClick={() => setSelectedStudent(top3)}
                      className="h-10 w-10 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-full text-amber-100 shadow-md border-2 border-white dark:border-[#1A1614] z-10 translate-y-3.5 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center"
                    >
                      <Award className="h-5 w-5" />
                    </div>
                    <div 
                      onClick={() => setSelectedStudent(top3)}
                      className="w-full bg-gradient-to-b from-amber-50/40 to-white/95 dark:from-[#211E1B] dark:to-[#151311] border border-amber-900/15 dark:border-[#382F2A] rounded-3xl pt-6 pb-4 px-4 text-center h-40 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-800 dark:text-amber-500 uppercase">
                          <span>#3 Bronze</span>
                          {top3.isTied && <span className="text-amber-600 font-extrabold">(Tied)</span>}
                        </div>
                        <h3 className="font-extrabold text-sm text-[#521903] dark:text-[#F3EFEA] truncate">{top3.name}</h3>
                        <p className="text-[10px] text-stone-400 font-bold truncate">{top3.gradeLevel} &bull; {top3.section}</p>
                      </div>

                      <div className="p-2 rounded-2xl bg-white/80 dark:bg-[#0D0B0A] border border-stone-200/60 dark:border-stone-800 space-y-0.5 shadow-xs">
                        <span className="text-xl font-black text-amber-800 dark:text-amber-500 leading-none block">
                          {top3.calculatedScore.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider block">
                          {scopeMeta.unit}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-40 rounded-3xl border border-dashed border-stone-200 dark:border-[#382F2A] flex items-center justify-center text-xs font-bold text-stone-300">
                    3rd Place Empty
                  </div>
                )}
              </div>

            </div>

            {/* Structured Table Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-stone-400 px-3">
                <span>Complete Performance Roster</span>
                <span>Showing {rankedStudents.length} Students Ranked</span>
              </div>

              <div className="border border-stone-100 dark:border-[#382F2A] rounded-2xl bg-white/80 dark:bg-[#151311] shadow-xs overflow-x-auto overflow-y-hidden">
                <div className="w-full min-w-[640px]">
                  
                  {/* Table Header Row */}
                  <div className="border-b border-stone-200/80 dark:border-[#382F2A] py-3.5 px-4 text-[10px] text-slate-400 uppercase tracking-widest grid grid-cols-[70px_1.5fr_1fr_120px_140px] items-center bg-stone-50/60 dark:bg-[#1A1614]/60">
                    <div className="text-center">RANK</div>
                    <div>STUDENT IDENTIFIER</div>
                    <div>ACADEMIC GROUP</div>
                    <div className="text-center">BADGES & STREAKS</div>
                    <div className="text-right pr-2">SCORE METRIC</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-slate-100 dark:divide-[#382F2A] text-[11px] font-semibold text-slate-600 dark:text-stone-300">
                    {rankedStudents.map((stu) => {
                      const isTop1 = stu.displayRank === 1;
                      const isTop2 = stu.displayRank === 2;
                      const isTop3 = stu.displayRank === 3;

                      return (
                        <div
                          key={stu.id}
                          onClick={() => setSelectedStudent(stu)}
                          className={`grid grid-cols-[70px_1.5fr_1fr_120px_140px] items-center py-3.5 px-4 hover:bg-[#F2B33D]/5 dark:hover:bg-[#2A231F] transition-colors cursor-pointer min-h-[58px] ${
                            isTop1 ? 'bg-amber-50/20 dark:bg-amber-950/20' : 
                            isTop2 ? 'bg-slate-50/30 dark:bg-slate-900/20' : 
                            isTop3 ? 'bg-orange-50/20 dark:bg-orange-950/10' : ''
                          }`}
                        >
                          {/* Rank Column */}
                          <div className="flex items-center justify-center">
                            {isTop1 ? (
                              <div className="h-7 w-7 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-xs">
                                <Trophy className="h-4 w-4" />
                              </div>
                            ) : isTop2 ? (
                              <div className="h-7 w-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shadow-xs">
                                <Medal className="h-4 w-4" />
                              </div>
                            ) : isTop3 ? (
                              <div className="h-7 w-7 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center shadow-xs">
                                <Award className="h-4 w-4" />
                              </div>
                            ) : (
                              <span className="text-stone-400 font-mono font-bold">#{stu.displayRank}</span>
                            )}
                          </div>

                          {/* Student Profile Info */}
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            {stu.avatar ? (
                              <img 
                                src={stu.avatar} 
                                alt={stu.name} 
                                className="h-8 w-8 rounded-full object-cover border border-stone-200 shrink-0" 
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[#F5E6C4] dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] font-black text-xs flex items-center justify-center uppercase shrink-0">
                                {getInitials(stu.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-extrabold text-stone-800 dark:text-[#F3EFEA] text-xs truncate flex items-center gap-1.5">
                                <span className="truncate">{stu.name}</span>
                                {stu.isTied && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold shrink-0">Tied</span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 font-mono block truncate">ID: {stu.studentId}</span>
                            </div>
                          </div>

                          {/* Academic Group */}
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-xs text-stone-800 dark:text-stone-200 block truncate">{stu.gradeLevel} - {stu.section}</span>
                            <span className="text-[10px] text-amber-800 dark:text-amber-400 font-extrabold uppercase truncate block">
                              ({stu.type})
                            </span>
                          </div>

                          {/* Gamification Stats: Stars & Streaks */}
                          <div className="flex items-center justify-center gap-3 text-xs">
                            <div className="flex items-center gap-1 font-bold text-amber-600" title="Total Stars">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                              <span>{stu.gamification.stars}</span>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-orange-600" title="Active Streak">
                              <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                              <span>{stu.gamification.streak}d</span>
                            </div>
                          </div>

                          {/* Calculated Metric Score */}
                          <div className="text-right pr-2 font-black">
                            <span className="text-sm text-[#521903] dark:text-[#F0AB31] block">
                              {stu.calculatedScore.toLocaleString()} XP
                            </span>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                              {scopeMeta.unit}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* DETAILED STUDENT PERFORMANCE INSPECTION MODAL */}
      {selectedStudent && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setSelectedStudent(null)}
        >
          <div 
            className="bg-white dark:bg-[#1A1614] rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto my-4 border border-stone-200 dark:border-[#382F2A] shadow-2xl text-stone-800 dark:text-stone-100 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#382F2A] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-xs">
                  Rank #{selectedStudent.displayRank}
                </span>
                <h3 className="font-black text-sm text-[#521903] dark:text-[#F3EFEA]">
                  Student Performance Profile
                </h3>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-stone-50 dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
              {selectedStudent.avatar ? (
                <img 
                  src={selectedStudent.avatar} 
                  alt={selectedStudent.name} 
                  className="h-12 w-12 rounded-full object-cover border-2 border-white shrink-0" 
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[#F5E6C4] dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] font-black text-sm flex items-center justify-center uppercase shrink-0">
                  {getInitials(selectedStudent.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-[#521903] dark:text-[#F3EFEA] truncate">{selectedStudent.name}</h4>
                <p className="text-xs text-stone-400 font-semibold">{selectedStudent.gradeLevel} &bull; {selectedStudent.section} ({selectedStudent.type})</p>
                <span className="text-[10px] text-stone-400 font-mono">ID: {selectedStudent.studentId}</span>
              </div>
            </div>

            {/* Breakdown Score Matrix */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-[#2A231F] border border-amber-200/70 dark:border-stone-800">
                <span className="text-[9.5px] font-bold text-stone-400 uppercase block">Total All-Time</span>
                <strong className="text-sm font-black text-amber-700 dark:text-amber-400">{selectedStudent.gamification.xp} XP</strong>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                <span className="text-[9.5px] font-bold text-stone-400 uppercase block">Weekly XP</span>
                <strong className="text-sm font-black text-stone-800 dark:text-stone-200">{selectedStudent.gamification.weeklyXp} XP</strong>
              </div>
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                <span className="text-[9.5px] font-bold text-stone-400 uppercase block">Daily XP</span>
                <strong className="text-sm font-black text-stone-800 dark:text-stone-200">{selectedStudent.gamification.dailyXp} XP</strong>
              </div>
            </div>

            {/* Dynamic Modules Mastery */}
            <div className="p-3.5 rounded-2xl bg-stone-50/70 dark:bg-[#0D0B0A] border border-stone-200/60 dark:border-[#382F2A] space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-[#F0AB31] block">
                Curriculum Mastery Breakdown
              </span>
              
              {dynamicModules.map((mod) => {
                const score = getScoreForScope(selectedStudent, mod.id);
                return (
                  <div key={mod.id} className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                    <span>FSL {mod.name} XP:</span>
                    <strong>{score} XP</strong>
                  </div>
                );
              })}

              <div className="flex justify-between items-center text-stone-600 dark:text-stone-300 pt-1 border-t border-stone-200/40">
                <span>Completed Lessons:</span>
                <strong>{selectedStudent.gamification.completedLessons} Lessons</strong>
              </div>
            </div>

            <button 
              onClick={() => setSelectedStudent(null)}
              className="w-full h-10 rounded-xl bg-[#111827] hover:bg-black text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-xs"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}

    </div>
  );
}