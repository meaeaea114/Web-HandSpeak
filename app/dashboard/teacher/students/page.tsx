'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  X, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  FolderLock
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  section: string;
  type: 'Regular' | 'SNED';
  activeModule: 'Alphabet' | 'Numbers' | 'Phrases' | 'Common Signs' | 'General';
  activityType: string;
  performanceScore: number | null;
  competencyLevel: 'Beginning' | 'Developing' | 'Proficiency' | 'Not Applicable';
  overallProgress: number;
}

export default function StudentManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedType, setSelectedType] = useState('All Types');
  const [activeProfile, setActiveProfile] = useState<Student | null>(null);

  // CORE DATA FEED Matrix
  const initialStudents: Student[] = useMemo(() => [
    { id: '1', name: 'Maria Santos', section: 'Section A', type: 'Regular', activeModule: 'General', activityType: 'Bulk Evaluation', performanceScore: null, competencyLevel: 'Not Applicable', overallProgress: 82 },
    { id: '2', name: 'Juan dela Cruz', section: 'Section A', type: 'SNED', activeModule: 'Numbers', activityType: 'Sign Production Quiz', performanceScore: 48, competencyLevel: 'Beginning', overallProgress: 45 },
    { id: '3', name: 'Ana Reyes', section: 'Section A', type: 'Regular', activeModule: 'Alphabet', activityType: 'Sign Production Quiz', performanceScore: 82, competencyLevel: 'Proficiency', overallProgress: 78 },
    { id: '4', name: 'Carlos Mendoza', section: 'Section B', type: 'Regular', activeModule: 'Numbers', activityType: 'Gesture Recognition', performanceScore: 65, competencyLevel: 'Developing', overallProgress: 68 },
    { id: '5', name: 'Lea Villanueva', section: 'Section B', type: 'SNED', activeModule: 'Alphabet', activityType: 'Finger Spelling', performanceScore: 35, competencyLevel: 'Beginning', overallProgress: 38 },
    { id: '6', name: 'Miguel Torres', section: 'Section B', type: 'Regular', activeModule: 'Common Signs', activityType: 'Gesture Recognition', performanceScore: 58, competencyLevel: 'Developing', overallProgress: 60 },
    { id: '7', name: 'Sofia Garcia', section: 'Section A', type: 'Regular', activeModule: 'Alphabet', activityType: 'Gesture Recognition', performanceScore: 85, competencyLevel: 'Proficiency', overallProgress: 89 },
    { id: '8', name: 'Jose Ramirez', section: 'Section A', type: 'SNED', activeModule: 'Numbers', activityType: 'Sign Production Quiz', performanceScore: 50, competencyLevel: 'Developing', overallProgress: 52 }
  ], []);

  // COMPUTATION ENGINE
  const filteredStudents = useMemo(() => {
    return initialStudents.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection = selectedSection === 'All Sections' || student.section === selectedSection;
      const matchesModule = selectedModule === 'All Modules' || student.activeModule === selectedModule;
      const matchesType = selectedType === 'All Types' || student.type === selectedType;
      return matchesSearch && matchesSection && matchesModule && matchesType;
    });
  }, [searchQuery, selectedSection, selectedModule, selectedType, initialStudents]);

  const summaryMetrics = useMemo(() => {
    const total = filteredStudents.length;
    const scoredStudents = filteredStudents.filter(s => s.performanceScore !== null);
    const avgScore = scoredStudents.length > 0 
      ? Math.round(scoredStudents.reduce((acc, curr) => acc + (curr.performanceScore || 0), 0) / scoredStudents.length)
      : 65;
    const proficientCount = filteredStudents.filter(s => s.competencyLevel === 'Proficiency').length;
    const proficiencyRate = total > 0 ? Math.round((proficientCount / total) * 100) : 30;
    const needsAttention = filteredStudents.filter(s => s.competencyLevel === 'Beginning' || (s.performanceScore && s.performanceScore < 50)).length;

    return { total, avgScore, proficiencyRate, needsAttention };
  }, [filteredStudents]);

  return (
    <div className="space-y-8 p-1 max-w-7xl mx-auto pb-12 font-sans text-slate-800 selection:bg-[#F2B33D]/30">
      
      {/* 1. GLASSMORPHISM HIGH-CONTRAST FILTER CONSOLE */}
      <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white shadow-[0_10px_30px_-15px_rgba(82,25,3,0.05)] flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="h-4 w-4 absolute left-4 text-[#521903]/40 pointer-events-none" />
          <input 
            type="text"
            placeholder="Filter profiles by query search keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 pl-12 border border-[#F5E6C4] rounded-xl text-xs bg-[#F5E6C4]/10 font-bold text-[#521903] placeholder-[#521903]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#F2B33D]/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto md:min-w-[480px]">
          <div className="relative">
            <select 
              value={selectedSection} 
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full appearance-none px-4 py-3 border border-[#F5E6C4] bg-white rounded-xl text-xs font-black text-[#521903] focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/40 transition-all cursor-pointer shadow-sm pr-10"
            >
              <option>All Sections</option>
              <option>Section A</option>
              <option>Section B</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-3.5 top-3.5 pointer-events-none text-[#521903]/50" />
          </div>

          <div className="relative">
            <select 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full appearance-none px-4 py-3 border border-[#F5E6C4] bg-white rounded-xl text-xs font-black text-[#521903] focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/40 transition-all cursor-pointer shadow-sm pr-10"
            >
              <option>All Modules</option>
              <option>Alphabet</option>
              <option>Numbers</option>
              <option>Phrases</option>
              <option>Common Signs</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-3.5 top-3.5 pointer-events-none text-[#521903]/50" />
          </div>

          <div className="relative">
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full appearance-none px-4 py-3 border border-[#F5E6C4] bg-white rounded-xl text-xs font-black text-[#521903] focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/40 transition-all cursor-pointer shadow-sm pr-10"
            >
              <option>All Types</option>
              <option>Regular</option>
              <option>SNED</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-3.5 top-3.5 pointer-events-none text-[#521903]/50" />
          </div>
        </div>
      </div>

      {/* 2. GLOSSY COUNTER DECK MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(82,25,3,0.02)] flex items-center gap-4 group hover:-translate-y-0.5 transition-transform duration-200">
          <div className="p-3 bg-blue-50/70 text-blue-600 rounded-xl"><Users className="h-5 w-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Cohort</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{summaryMetrics.total}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(82,25,3,0.02)] flex items-center gap-4 group hover:-translate-y-0.5 transition-transform duration-200">
          <div className="p-3 bg-amber-50/70 text-amber-600 rounded-xl"><GraduationCap className="h-5 w-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class Avg Score</span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{summaryMetrics.avgScore}<span className="text-xs font-bold text-slate-300">/100</span></h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(82,25,3,0.02)] flex items-center gap-4 group hover:-translate-y-0.5 transition-transform duration-200">
          <div className="p-3 bg-emerald-50/70 text-emerald-600 rounded-xl"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proficiency Rate</span>
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{summaryMetrics.proficiencyRate}%</h3>
          </div>
        </div>
        <div className="bg-rose-50/30 border border-rose-100 p-5 rounded-2xl shadow-[0_4px_20px_rgba(225,29,72,0.01)] flex items-center gap-4 group hover:-translate-y-0.5 transition-transform duration-200">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <span className="text-[10px] font-black text-rose-700/60 uppercase tracking-wider block">Needs Attention</span>
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">{summaryMetrics.needsAttention}</h3>
          </div>
        </div>
      </div>

      {/* 3. PREMIUM SMART DATA GRID */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-white shadow-[0_12px_40px_-20px_rgba(82,25,3,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-bold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-[#521903]/50 uppercase tracking-wider bg-neutral-50/50">
                <th className="py-4.5 px-6">Student Profiling Ledger</th>
                <th className="py-4.5 px-4 w-28">Type Tag</th>
                <th className="py-4.5 px-4">Current Module Tracking</th>
                <th className="py-4.5 px-4 w-44">Performance Metrics</th>
                <th className="py-4.5 px-6 w-48 text-right">App Action Deck</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredStudents.map((student) => {
                const isUrgent = student.competencyLevel === 'Beginning';
                return (
                  <tr 
                    key={student.id} 
                    className="hover:bg-[#F2B33D]/4 transition-all duration-150 group"
                  >
                    <td className="py-4.5 px-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-800 tracking-tight group-hover:text-[#521903] transition-colors">{student.name}</span>
                          {isUrgent && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Remediation Flag Triggered" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">{student.section}</p>
                      </div>
                    </td>
                    <td className="py-4.5 px-4">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase border ${
                        student.type === 'SNED' ? 'bg-indigo-50/60 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200/60'
                      }`}>{student.type}</span>
                    </td>
                    <td className="py-4.5 px-4">
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-slate-800">{student.activeModule}</h5>
                        <p className="text-[11px] text-slate-400 font-medium">{student.activityType}</p>
                      </div>
                    </td>
                    <td className="py-4.5 px-4">
                      <div className="space-y-1 max-w-[130px]">
                        <span className={`text-xs font-black tracking-wide ${student.performanceScore ? (student.performanceScore >= 75 ? 'text-emerald-600' : student.performanceScore >= 50 ? 'text-amber-600' : 'text-rose-600') : 'text-slate-400 font-medium italic'}`}>
                          {student.performanceScore ? `${student.performanceScore}%` : 'Not evaluated'}
                        </span>
                        {student.performanceScore && (
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-200/20 shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-500 ${student.performanceScore >= 75 ? 'bg-emerald-500' : student.performanceScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${student.performanceScore}%` }}></div>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* ENHANCED ACTION BUTTON */}
                    <td className="py-4.5 px-6 text-right">
                      <button 
                        onClick={() => setActiveProfile(student)}
                        className="inline-flex items-center gap-1.5 bg-white border-2 border-[#521903]/10 text-[#521903] font-black px-4 py-2 rounded-xl text-[11px] uppercase tracking-wide hover:bg-[#521903] hover:text-white hover:border-[#521903] active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-[2px_2px_0_rgba(82,25,3,0.03)]"
                      >
                        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. HIGH-FIDELITY MODERN PROFILE OVERLAY MODAL */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setActiveProfile(null)}>
          <div className="bg-white p-6 w-full max-w-lg rounded-[28px] shadow-2xl border border-white space-y-6 relative animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setActiveProfile(null)} 
              className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-[#521903] transition-colors absolute top-4 right-4 cursor-pointer border border-slate-100"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Profile Meta Header Block */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="h-14 w-14 rounded-full bg-[#F2B33D]/15 text-[#521903] flex items-center justify-center font-black text-xl shadow-[inset_0_2px_4px_rgba(82,25,3,0.05)] border border-[#F2B33D]/20">
                {activeProfile.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#521903] tracking-tight">{activeProfile.name}</h3>
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase border ${
                    activeProfile.type === 'SNED' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>{activeProfile.type}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grade 7 — {activeProfile.section.replace('Section ', '')}</p>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Progress</span>
                <h4 className="text-3xl font-black text-slate-800 tracking-tight">{activeProfile.overallProgress}%</h4>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1 p-0.5 shadow-inner">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${activeProfile.overallProgress}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Mastery Index</span>
                <h4 className="text-sm font-black text-[#521903] uppercase tracking-wide leading-tight mt-1">
                  {activeProfile.competencyLevel === 'Proficiency' ? '🏅 Proficient Level' : 
                   activeProfile.competencyLevel === 'Developing' ? '⚡ Developing Level' : 
                   activeProfile.competencyLevel === 'Beginning' ? '⚠️ Beginning Level' : '⏳ Unrated'}
                </h4>
                <p className="text-[11px] text-slate-400 font-semibold pt-1">FSL Score: {activeProfile.performanceScore || '0'} / 100</p>
              </div>
            </div>

            {/* Module Bars Stack */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#521903]/50 border-b border-slate-100 pb-2">FSL Module Progress Framework</h4>
              
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Alphabet Lesson Matrices</span>
                    <span className="text-slate-400 font-bold">{activeProfile.overallProgress >= 75 ? '82% (Proficiency)' : '65% (Developing)'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/30 shadow-inner">
                    <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: activeProfile.overallProgress >= 75 ? '82%' : '65%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Numbers & Ordering Signs</span>
                    <span className="text-slate-400 font-bold">{activeProfile.overallProgress >= 75 ? '72% (Developing)' : '48% (Beginning)'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/30 shadow-inner">
                    <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: activeProfile.overallProgress >= 75 ? '72%' : '48%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Contextual Phrases System</span>
                    <span className="text-slate-400 font-bold">{activeProfile.overallProgress >= 75 ? '62% (Developing)' : '35% (Beginning)'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/30 shadow-inner">
                    <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: activeProfile.overallProgress >= 75 ? '62%' : '35%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Civic Observance Vocabulary</span>
                    <span className="text-slate-400 font-bold">{activeProfile.overallProgress >= 75 ? '52% (Beginning)' : '20% (Beginning)'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/30 shadow-inner">
                    <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: activeProfile.overallProgress >= 75 ? '52%' : '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* DIRECT ACTION BUTTON FOOTER */}
            <div className="pt-2">
              <button 
                onClick={() => { alert(`Assigning custom FSL study reinforcement package to: ${activeProfile.name}`); setActiveProfile(null); }}
                className="w-full bg-[#521903] hover:bg-[#3D1202] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-md shadow-amber-950/10 cursor-pointer"
              >
                Assign Custom Lesson Buffer Path
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}