'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  ChevronDown, 
  Filter,
  Search,
  X,
  Target,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface Student {
  rank: number;
  name: string;
  classGroup: string;
  points: number;
  engagement: number;
  stars: number;
  badges: string[];
  streak: number;
  accuracy: number;
}

export default function TeacherLeaderboardPage() {
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const allStudents: Student[] = [
    { rank: 1, name: 'Carol White', classGroup: 'Class A', points: 3120, engagement: 95, stars: 3, badges: ['Outstanding', 'Perfect Score', 'Quick Learner'], streak: 12, accuracy: 96 },
    { rank: 2, name: 'Frank Miller', classGroup: 'Class C', points: 2680, engagement: 90, stars: 2, badges: ['Outstanding', 'Perfect Score'], streak: 8, accuracy: 91 },
    { rank: 3, name: 'Alice Johnson', classGroup: 'Class A', points: 2450, engagement: 88, stars: 2, badges: ['Quick Learner', 'Perfect Score'], streak: 9, accuracy: 89 },
    { rank: 4, name: 'Emma Davis', classGroup: 'Class B', points: 2100, engagement: 82, stars: 3, badges: ['Consistent', 'Team Player'], streak: 15, accuracy: 85 },
    { rank: 5, name: 'Bob Smith', classGroup: 'Class A', points: 1620, engagement: 68, stars: 1, badges: ['Consistent'], streak: 4, accuracy: 74 },
    { rank: 6, name: 'David Brown', classGroup: 'Class B', points: 980, engagement: 48, stars: 1, badges: ['Quick Learner'], streak: 2, accuracy: 62 },
  ];

  const filteredStudents = useMemo(() => {
    return allStudents
      .filter(student => {
        const matchesClass = selectedClass === 'All Classes' || student.classGroup === selectedClass;
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesClass && matchesSearch;
      })
      .sort((a, b) => b.points - a.points)
      .map((student, index) => ({ ...student, rank: index + 1 }));
  }, [selectedClass, searchQuery]);

  const top1 = filteredStudents[0];
  const top2 = filteredStudents[1];
  const top3 = filteredStudents[2];

  return (
    <div className="space-y-8 p-3 max-w-7xl mx-auto pb-12">
      
      {/* PROFESSIONAL CONTROLS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white/80 shadow-[0_4px_20_rgba(82,25,3,0.02)]">
        <div className="md:col-span-2 relative flex items-center">
          <Search className="h-5 w-5 absolute left-4 text-[#521903]/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student profile name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5E6C4]/40 border border-[#F5E6C4] hover:bg-white text-sm font-bold text-[#521903] pl-12 pr-4 py-3 rounded-xl placeholder-[#521903]/40 focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/50 focus:bg-white transition-all shadow-inner"
          />
        </div>

        <div className="relative flex items-center">
          <Filter className="h-4 w-4 absolute left-4 text-[#521903]/60 pointer-events-none" />
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full appearance-none bg-[#F5E6C4]/40 border border-[#F5E6C4] hover:bg-white text-sm font-bold text-[#521903] pl-12 pr-10 py-3 rounded-xl focus:outline-none transition-all cursor-pointer shadow-inner"
          >
            <option>All Classes</option>
            <option>Class A</option>
            <option>Class B</option>
            <option>Class C</option>
          </select>
          <ChevronDown className="h-4 w-4 absolute right-4 pointer-events-none text-[#521903]/60" />
        </div>
      </div>

      {/* 3D ELEVATED METALLIC PODIUM BLOCKS ARCHITECTURE */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 pt-16 pb-4 max-w-4xl mx-auto">
        
        {/* 2ND PLACE - SILVER PLATFORM */}
        <div className="w-full md:w-1/3 flex flex-col items-center relative">
          {top2 ? (
            <>
              <div className="p-3.5 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 rounded-full text-slate-700 shadow-[0_8px_20px_rgba(148,163,184,0.35),_inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-slate-200 z-10 translate-y-4 transform hover:scale-110 transition-transform cursor-pointer" onClick={() => setSelectedStudent(top2)}>
                <Medal className="h-7 w-7 filter drop-shadow-sm" />
              </div>
              <div 
                className="w-full bg-white/90 backdrop-blur-md pt-8 pb-6 px-5 rounded-t-3xl border-t border-x border-white shadow-[0_-4px_24px_rgba(82,25,3,0.03)] text-center h-40 flex flex-col justify-between hover:shadow-[0_-4px_30px_rgba(82,25,3,0.06)] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedStudent(top2)}
              >
                <div className="space-y-1">
                  <h3 className="text-base font-black text-[#521903] truncate tracking-tight">{top2.name}</h3>
                  <p className="text-xs font-bold text-[#521903]/40 uppercase tracking-wider">{top2.classGroup}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-2xl font-black text-slate-600 tracking-tight">{top2.points}</span>
                  <p className="text-[10px] font-bold text-[#521903]/40 uppercase tracking-widest">FSL Points</p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full bg-white/20 rounded-t-3xl border border-dashed border-[#521903]/10 h-40 flex items-center justify-center text-xs font-bold text-[#521903]/30">2nd Place Empty</div>
          )}
        </div>

        {/* 1ST PLACE - GOLD CHAMPION PRESTIGE PLATFORM */}
        <div className="w-full md:w-1/3 flex flex-col items-center relative">
          {top1 ? (
            <>
              <div className="p-4 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 rounded-full text-white shadow-[0_10px_24px_rgba(217,119,6,0.35),_inset_0_-3px_5px_rgba(0,0,0,0.25)] border border-amber-300 ring-4 ring-amber-400/10 z-10 translate-y-5 transform hover:scale-110 transition-transform cursor-pointer" onClick={() => setSelectedStudent(top1)}>
                <Trophy className="h-8 w-8 filter drop-shadow-md" />
              </div>
              <div 
                className="w-full bg-gradient-to-b from-amber-50/50 to-white/95 backdrop-blur-md pt-10 pb-6 px-5 rounded-t-3xl border-t-2 border-x border-amber-400/30 shadow-[0_-6px_32px_rgba(82,25,3,0.06)] text-center h-52 flex flex-col justify-between hover:shadow-[0_-6px_40px_rgba(82,25,3,0.1)] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedStudent(top1)}
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#521903] truncate tracking-tight">{top1.name}</h3>
                  <p className="text-xs font-bold text-[#521903]/50 uppercase tracking-wider">{top1.classGroup}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-3xl font-black text-amber-600 tracking-tight">{top1.points}</span>
                  <p className="text-[10px] font-bold text-[#521903]/40 uppercase tracking-widest">FSL Points</p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full bg-white/20 rounded-t-3xl border border-dashed border-[#521903]/10 h-52 flex items-center justify-center text-xs font-bold text-[#521903]/30">1st Place Empty</div>
          )}
        </div>

        {/* 3RD PLACE - BRONZE PLATFORM */}
        <div className="w-full md:w-1/3 flex flex-col items-center relative">
          {top3 ? (
            <>
              <div className="p-3.5 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-500 rounded-full text-orange-950 shadow-[0_8px_20px_rgba(249,115,22,0.35),_inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-orange-300 z-10 translate-y-4 transform hover:scale-110 transition-transform cursor-pointer" onClick={() => setSelectedStudent(top3)}>
                <Award className="h-7 w-7 filter drop-shadow-sm" />
              </div>
              <div 
                className="w-full bg-white/90 backdrop-blur-md pt-8 pb-6 px-5 rounded-t-3xl border-t border-x border-white shadow-[0_-4px_24px_rgba(82,25,3,0.03)] text-center h-32 flex flex-col justify-between hover:shadow-[0_-4px_30px_rgba(82,25,3,0.06)] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedStudent(top3)}
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#521903] truncate tracking-tight">{top3.name}</h3>
                  <p className="text-[10px] font-bold text-[#521903]/40 uppercase tracking-wider">{top3.classGroup}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-2xl font-black text-orange-700 tracking-tight">{top3.points}</span>
                  <p className="text-[10px] font-bold text-[#521903]/40 uppercase tracking-widest">FSL Points</p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full bg-white/20 rounded-t-3xl border border-dashed border-[#521903]/10 h-32 flex items-center justify-center text-xs font-bold text-[#521903]/30">3rd Place Empty</div>
          )}
        </div>

      </div>

      {/* RANKINGS TABLE */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/70 shadow-[0_4px_24px_rgba(82,25,3,0.04)] overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-[#521903]/60 uppercase tracking-wider bg-neutral-50/60">
                  <th className="py-5 px-6 text-center w-24">Rank</th>
                  <th className="py-5 px-5 text-sm">Student Name</th>
                  <th className="py-5 px-5 text-sm w-36">Total Points</th>
                  <th className="py-5 px-5 text-sm">Earned Badges</th>
                  <th className="py-5 px-6 text-sm w-52">Engagement Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.name}
                    onClick={() => setSelectedStudent(student)}
                    className={`transition-all duration-150 cursor-pointer text-sm font-medium text-[#521903] hover:bg-[#F2B33D]/5 ${
                      student.rank === 1 ? 'bg-amber-50/15' : 
                      student.rank === 2 ? 'bg-slate-50/15' : 
                      student.rank === 3 ? 'bg-orange-50/10' : ''
                    }`}
                  >
                    <td className="py-5 px-6 text-center font-black">
                      {student.rank === 1 ? (
                        <div className="flex justify-center text-amber-500" title="1st Place Champion"><Trophy className="h-5 w-5 filter drop-shadow-sm" /></div>
                      ) : student.rank === 2 ? (
                        <div className="flex justify-center text-slate-400" title="2nd Place Silver"><Medal className="h-5 w-5 filter drop-shadow-sm" /></div>
                      ) : student.rank === 3 ? (
                        <div className="flex justify-center text-orange-500" title="3rd Place Bronze"><Award className="h-5 w-5 filter drop-shadow-sm" /></div>
                      ) : (
                        <span className="opacity-50 block text-xs font-bold">{student.rank}</span>
                      )}
                    </td>

                    <td className="py-5 px-5">
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-sm font-black tracking-tight">{student.name}</h4>
                        <p className="text-xs font-bold text-[#521903]/40 tracking-wide uppercase">{student.classGroup}</p>
                      </div>
                    </td>

                    <td className="py-5 px-5 font-black text-sm text-amber-700 tracking-wide">
                      {student.points.toLocaleString()}
                    </td>

                    <td className="py-5 px-5">
                      <div className="flex flex-wrap gap-2">
                        {student.badges.map((badge, idx) => (
                          <span 
                            key={idx}
                            className={`text-[10px] font-extrabold px-3 py-1 rounded-md border shadow-[1px_1px_2px_rgba(0,0,0,0.02)] select-none ${
                              badge === 'Outstanding' ? 'bg-amber-500/10 text-amber-800 border-amber-400/30' :
                              badge === 'Perfect Score' ? 'bg-orange-500/10 text-orange-800 border-orange-400/30' :
                              badge === 'Quick Learner' ? 'bg-blue-500/10 text-blue-800 border-blue-400/30' :
                              badge === 'Consistent' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-400/30' :
                              'bg-slate-500/10 text-slate-800 border-slate-400/20'
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-full bg-[#F5E6C4]/50 h-3 rounded-full p-0.5 border border-[#F5E6C4]/70 shadow-inner overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#F2B33D] transition-all duration-500"
                            style={{ width: `${student.engagement}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-black opacity-80 min-w-10 text-right">
                          {student.engagement}%
                        </span>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-sm font-black text-[#521903]/40 uppercase tracking-widest">
            No matching student data profiles captured.
          </div>
        )}
      </div>

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white p-7 w-full max-w-md rounded-[28px] border border-white shadow-2xl text-[#521903] space-y-6 relative" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setSelectedStudent(null)}
              className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200/70 transition-colors absolute top-5 right-5 text-[#521903]/60 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Student Performance Core Metrics
              </span>
              <h3 className="text-2xl font-black tracking-tight">{selectedStudent.name}</h3>
              <p className="text-xs font-bold text-[#521903]/50 uppercase tracking-wide">{selectedStudent.classGroup}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F5E6C4]/30 border border-[#F5E6C4]/60 p-4 rounded-xl text-center shadow-inner space-y-1">
                <Zap className="h-5 w-5 text-amber-600 mx-auto" />
                <span className="text-[9px] font-bold text-[#521903]/40 uppercase block">Day Streak</span>
                <span className="text-sm font-black text-[#521903]">{selectedStudent.streak} Days</span>
              </div>
              <div className="bg-[#F5E6C4]/30 border border-[#F5E6C4]/60 p-4 rounded-xl text-center shadow-inner space-y-1">
                <Target className="h-5 w-5 text-rose-600 mx-auto" />
                <span className="text-[9px] font-bold text-[#521903]/40 uppercase block">FSL Accuracy</span>
                <span className="text-sm font-black text-[#521903]">{selectedStudent.accuracy}%</span>
              </div>
              <div className="bg-[#F5E6C4]/30 border border-[#F5E6C4]/60 p-4 rounded-xl text-center shadow-inner space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                <span className="text-[9px] font-bold text-[#521903]/40 uppercase block">Engagement</span>
                <span className="text-sm font-black text-[#521903]">{selectedStudent.engagement}%</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#521903]/50 block">Mobile App Accolades</span>
              <div className="flex flex-wrap gap-2">
                {selectedStudent.badges.map((b, i) => (
                  <span key={i} className="text-xs font-bold bg-[#F2B33D]/10 border border-[#F2B33D]/30 px-3 py-1.5 rounded-full shadow-sm text-[#521903]">
                    🏆 {b}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}