'use client';

import React from 'react';
import { 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  TrendingUp, 
  BarChart2, 
  Clock 
} from 'lucide-react';

export default function TeacherDashboardTelemetryOverviewPage() {
  const stats = [
    { 
      title: 'Total Students', 
      value: '15', 
      sub: '5 SNED, 10 Regular', 
      icon: Users, 
      color: 'text-amber-800 bg-amber-50' 
    },
    { 
      title: 'Avg Mastery Level', 
      value: '63.7/5', 
      sub: 'Across all active modules', 
      icon: GraduationCap, 
      color: 'text-[#521903] bg-amber-50' 
    },
    { 
      title: 'At-Risk Students', 
      value: '5', 
      sub: 'Require immediate attention', 
      icon: AlertTriangle, 
      color: 'text-rose-700 bg-rose-50' 
    },
  ];

  const recentActivities = [
    {
      initials: 'M',
      name: 'Maria Santos',
      action: 'completed Alphabet Module A',
      score: '91%',
      time: 'Apr 20, 10:13 AM'
    },
    {
      initials: 'J',
      name: 'Juan dela Cruz',
      action: 'scored 95% on Gesture Task',
      score: '90%',
      time: 'Apr 20, 9:58 AM'
    }
  ];

  const classMastery = [
    { className: 'Grade 7-A', value: 90 },
    { className: 'Grade 7-B', value: 65 },
    { className: 'Grade 8-A', value: 55 },
    { className: 'Grade 8-B', value: 95 },
  ];

  return (
    <div className="space-y-6 p-2 max-w-7xl mx-auto pb-6">
      
      {/* SECTION 1: TOP 3D TELEMETRY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title} 
              className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05),_inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[4px_6px_20px_rgba(82,25,3,0.08)] hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#521903]/60 uppercase tracking-wider">{stat.title}</span>
                <h3 className={`text-3xl font-black ${stat.title === 'At-Risk Students' ? 'text-rose-700' : 'text-[#521903]'} tracking-tight`}>
                  {stat.value}
                </h3>
                <p className="text-[11px] text-[#521903]/50 font-semibold">{stat.sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.color} shadow-inner`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: GRAPH MONITORING CORE DATA MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        
        {/* LINE GRAPH: FSL App Telemetry Progress */}
        <div className="bg-white/80 backdrop-blur-md p-7 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] lg:col-span-3 flex flex-col justify-between min-h-[320px]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-amber-700" />
            <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Progress Over Time</h4>
          </div>
          
          <div className="flex-1 w-full min-h-[180px] relative mt-2">
            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
              <line x1="40" y1="20" x2="40" y2="150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />
              <line x1="40" y1="150" x2="480" y2="150" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />
              <line x1="40" y1="85" x2="480" y2="85" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3" />

              <text x="10" y="25" className="text-[10px] font-bold fill-[#521903]/40">100</text>
              <text x="15" y="90" className="text-[10px] font-bold fill-[#521903]/40">50</text>
              <text x="20" y="155" className="text-[10px] font-bold fill-[#521903]/40">0</text>

              <text x="40" y="170" className="text-[10px] font-bold fill-[#521903]/40">0</text>
              <text x="185" y="170" className="text-[10px] font-bold fill-[#521903]/40">1</text>
              <text x="330" y="170" className="text-[10px] font-bold fill-[#521903]/40">2</text>
              <text x="475" y="170" className="text-[10px] font-bold fill-[#521903]/40">3</text>

              <path d="M 40,65 L 185,55 L 330,45 L 475,38" fill="none" stroke="#F2B33D" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 40,75 L 185,65 L 330,52 L 475,44" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
              <path d="M 40,88 L 185,82 L 330,75 L 475,68" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

              <circle cx="40" cy="65" r="3.5" fill="white" stroke="#F2B33D" strokeWidth="2" />
              <circle cx="185" cy="55" r="3.5" fill="white" stroke="#F2B33D" strokeWidth="2" />
              <circle cx="330" cy="45" r="3.5" fill="white" stroke="#F2B33D" strokeWidth="2" />
              <circle cx="475" cy="38" r="3.5" fill="white" stroke="#F2B33D" strokeWidth="2" />
              <circle cx="40" cy="88" r="3" fill="white" stroke="#94A3B8" strokeWidth="1.5" />
              <circle cx="475" cy="68" r="3" fill="white" stroke="#94A3B8" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="flex items-center gap-5 justify-center mt-3 border-t border-slate-100 pt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#521903]/70">
              <span className="h-2 w-2 rounded-full bg-[#D97706]"></span> Completion Rate
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#521903]/70">
              <span className="h-2 w-2 rounded-full bg-[#94A3B8]"></span> Mastery Level
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#521903]/70">
              <span className="h-2 w-2 rounded-full bg-[#F2B33D]"></span> Engagement
            </div>
          </div>
        </div>

        {/* BAR CHART: Classroom Mastery Profiles */}
        <div className="bg-white/80 backdrop-blur-md p-7 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] lg:col-span-2 flex flex-col justify-between min-h-[320px]">
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-amber-700" />
              <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Mastery per Class</h4>
            </div>
            <p className="text-[10px] text-[#521903]/50 font-bold">Average mastery level by class group</p>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-4 py-2">
            {classMastery.map((item) => (
              <div key={item.className} className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-[#521903]">
                  <span>{item.className}</span>
                  <span className="opacity-60">{item.value}%</span>
                </div>
                <div className="w-full bg-[#F5E6C4]/40 h-7 rounded-lg overflow-hidden border border-[#F5E6C4]/60 p-0.5">
                  <div 
                    className="bg-[#F2B33D] h-full rounded-md shadow-sm transition-all"
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[9px] font-bold text-[#521903]/40 border-t border-slate-100 pt-3 px-1">
            <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>74.7</span>
          </div>
        </div>

      </div>

      {/* SECTION 3: RECENT ACTIVITIES LOG */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/70 shadow-[4px_4px_16px_rgba(82,25,3,0.05)] space-y-4">
        <div className="space-y-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-700" />
            <h4 className="text-xs font-bold text-[#521903] uppercase tracking-wider">Recent Activity</h4>
          </div>
          <p className="text-[10px] text-[#521903]/50 font-bold">Latest student actions</p>
        </div>

        <div className="divide-y divide-slate-100/70">
          {recentActivities.map((act, i) => (
            <div key={i} className="flex items-center justify-between py-3.5 px-2 rounded-xl hover:bg-neutral-50/50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-[#F5E6C4]/70 flex items-center justify-center text-[#521903] font-black text-xs shadow-inner">
                  {act.initials}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-[#521903] truncate">{act.name}</h5>
                  <p className="text-[11px] text-[#521903]/60 truncate font-medium">{act.action}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <span className="text-xs font-black text-amber-600 block">{act.score}</span>
                <span className="text-[10px] font-semibold text-[#521903]/40 block">{act.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}