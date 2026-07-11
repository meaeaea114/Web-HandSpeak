'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  HelpCircle, 
  Activity, 
  Lightbulb, 
  Filter, 
  Search,
  CheckCircle,
  AlertTriangle,
  Flame,
  User,
  Zap
} from 'lucide-react';

interface FslTelemetryRow {
  studentName: string;
  classGroup: string;
  moduleName: 'Alphabet' | 'Numbers' | 'Phrases' | 'Common Greetings';
  successfulMatches: number;
  totalAttempts: number;
  incorrectOrientationCount: number;
  fingerMismatchCount: number;
  speedTooFastCount: number;
  streakDays: number;
  lastActiveWeeksAgo: number;
}

export default function FslAnalyticsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('All Classes');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // DATA REPOSITORY HUB (DATABASE INTEGRATION READY)
  const fslDatabaseFeed: FslTelemetryRow[] = useMemo(() => [
    { studentName: 'Juan dela Cruz', classGroup: 'Class A', moduleName: 'Alphabet', successfulMatches: 85, totalAttempts: 100, incorrectOrientationCount: 8, fingerMismatchCount: 5, speedTooFastCount: 2, streakDays: 14, lastActiveWeeksAgo: 0 },
    { studentName: 'Juan dela Cruz', classGroup: 'Class A', moduleName: 'Numbers', successfulMatches: 45, totalAttempts: 80, incorrectOrientationCount: 22, fingerMismatchCount: 10, speedTooFastCount: 3, streakDays: 14, lastActiveWeeksAgo: 0 },
    { studentName: 'Pedro Bautista', classGroup: 'Class B', moduleName: 'Alphabet', successfulMatches: 40, totalAttempts: 90, incorrectOrientationCount: 30, fingerMismatchCount: 15, speedTooFastCount: 5, streakDays: 2, lastActiveWeeksAgo: 1 },
    { studentName: 'Pedro Bautista', classGroup: 'Class B', moduleName: 'Numbers', successfulMatches: 30, totalAttempts: 85, incorrectOrientationCount: 38, fingerMismatchCount: 12, speedTooFastCount: 5, streakDays: 2, lastActiveWeeksAgo: 1 },
    { studentName: 'Luz Villanueva', classGroup: 'Class A', moduleName: 'Alphabet', successfulMatches: 92, totalAttempts: 95, incorrectOrientationCount: 2, fingerMismatchCount: 1, speedTooFastCount: 0, streakDays: 21, lastActiveWeeksAgo: 0 },
    { studentName: 'Maria Santos', classGroup: 'Class B', moduleName: 'Phrases', successfulMatches: 70, totalAttempts: 110, incorrectOrientationCount: 15, fingerMismatchCount: 18, speedTooFastCount: 7, streakDays: 8, lastActiveWeeksAgo: 0 }
  ], []);

  // MATRIX CALCULATION ENGINE
  const fslAnalyticsEngine = useMemo(() => {
    const baseFiltered = fslDatabaseFeed.filter(row => {
      const matchClass = selectedClass === 'All Classes' || row.classGroup === selectedClass;
      const matchSearch = row.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });

    if (baseFiltered.length === 0) return null;

    // DESCRIPTIVE
    const totalAttempts = baseFiltered.reduce((sum, r) => sum + r.totalAttempts, 0);
    const totalSuccess = baseFiltered.reduce((sum, r) => sum + r.successfulMatches, 0);
    const avgAccuracy = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;
    const totalActiveStudents = Array.from(new Set(baseFiltered.map(r => r.studentName))).length;

    // DIAGNOSTIC
    const orientation = baseFiltered.reduce((sum, r) => sum + r.incorrectOrientationCount, 0);
    const finger = baseFiltered.reduce((sum, r) => sum + r.fingerMismatchCount, 0);
    const speed = baseFiltered.reduce((sum, r) => sum + r.speedTooFastCount, 0);
    const maxErr = Math.max(orientation, finger, speed);
    const topErrorType = maxErr === orientation ? 'Hand Orientation' : maxErr === finger ? 'Finger State Mismatch' : 'Gesture Pace Velocity';

    // PREDICTIVE / PRESCRIPTIVE
    const riskForecast: any[] = [];
    const studentNames = Array.from(new Set(baseFiltered.map(r => r.studentName)));

    studentNames.forEach(name => {
      const records = baseFiltered.filter(r => r.studentName === name);
      const success = records.reduce((sum, r) => sum + r.successfulMatches, 0);
      const attempts = records.reduce((sum, r) => sum + r.totalAttempts, 0);
      const acc = attempts > 0 ? (success / attempts) * 100 : 100;
      const maxInactivity = Math.max(...records.map(r => r.lastActiveWeeksAgo));

      if (acc < 65) {
        riskForecast.push({ name, type: 'Critical Accuracy Risk', level: 'High', action: 'Deploy targeted 3D hand spatial positioning drills' });
      } else if (maxInactivity >= 1) {
        riskForecast.push({ name, type: 'Retention Decay Risk', level: 'Medium', action: 'Trigger automated performance notification streak boost' });
      }
    });

    return { totalAttempts, avgAccuracy, totalActiveStudents, orientation, finger, speed, topErrorType, maxErr, riskForecast };
  }, [selectedClass, searchQuery, fslDatabaseFeed]);

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6 text-[#521903]">
      
      {/* FILTER CONTROL DECK */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/70 shadow-sm">
        <div className="relative w-full sm:max-w-md flex items-center">
          <Search className="h-4 w-4 absolute left-4 text-[#521903]/40" />
          <input 
            type="text"
            placeholder="Search student profile name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-11 border border-[#F5E6C4] rounded-xl text-xs bg-[#F5E6C4]/10 focus:outline-none focus:bg-white font-bold text-[#521903]"
          />
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 border border-[#F5E6C4] rounded-xl text-xs bg-white font-bold text-[#521903] cursor-pointer shadow-sm"
        >
          <option>All Classes</option>
          <option>Class A</option>
          <option>Class B</option>
        </select>
      </div>

      {fslAnalyticsEngine ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ================= DESCRIPTIVE CARD (WHAT HAPPENED) ================= */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-widest">Descriptive Summary</h3>
              </div>
              <span className="text-[10px] font-bold bg-[#F5E6C4]/30 px-2 py-0.5 rounded-md">{fslAnalyticsEngine.totalActiveStudents} Active Users</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <span className="text-[28px] font-black tracking-tight">{fslAnalyticsEngine.totalAttempts}</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sign Attempts</p>
              </div>
              {/* Target Radial Circle Visual Overlay */}
              <div className="relative h-18 w-18 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-[#F2B33D] text-white font-black text-base shadow-md">
                {fslAnalyticsEngine.avgAccuracy}%
                <span className="absolute -bottom-5 text-[9px] font-bold text-[#521903]/60 uppercase tracking-wider whitespace-nowrap">Avg Match</span>
              </div>
            </div>
          </div>

          {/* ================= DIAGNOSTIC CARD (WHY IT HAPPENED) ================= */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-widest">Diagnostic Logs (Friction Root)</h3>
            </div>
            
            <div className="space-y-3 py-1">
              {/* Orientation Error Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Hand Orientation</span>
                  <span className="text-slate-500">{fslAnalyticsEngine.orientation} errors</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full" style={{ width: `${Math.min(100, (fslAnalyticsEngine.orientation / fslAnalyticsEngine.totalAttempts) * 300)}%` }}></div>
                </div>
              </div>

              {/* Finger Mismatch Error Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Finger Configuration Mismatch</span>
                  <span className="text-slate-500">{fslAnalyticsEngine.finger} errors</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (fslAnalyticsEngine.finger / fslAnalyticsEngine.totalAttempts) * 300)}%` }}></div>
                </div>
              </div>

              {/* Velocity Pace Speed Error Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Gesture Motion Speed</span>
                  <span className="text-slate-500">{fslAnalyticsEngine.speed} errors</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (fslAnalyticsEngine.speed / fslAnalyticsEngine.totalAttempts) * 300)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= PREDICTIVE CARD (WHAT WILL HAPPEN NEXT) ================= */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-widest">Predictive Risk Forecast</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-2">
              {fslAnalyticsEngine.riskForecast.slice(0, 2).map((risk: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-3.5 w-3.5 opacity-40 flex-shrink-0" />
                    <span className="text-xs font-bold truncate">{risk.name}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${
                    risk.level === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                  }`}>{risk.level} Risk</span>
                </div>
              ))}
              {fslAnalyticsEngine.riskForecast.length === 0 && (
                <p className="text-xs font-bold text-emerald-600 text-center py-2">🎉 Stability baseline parameters normal.</p>
              )}
            </div>
          </div>

          {/* ================= PRESCRIPTIVE CARD (HOW TO RESOLVE IT) ================= */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-white/60 shadow-sm lg:col-span-3 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-1">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-widest">Prescriptive Intervention Blueprints</h3>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {fslAnalyticsEngine.riskForecast.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs font-bold text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-wider bg-neutral-50/60">
                      <th className="py-3 px-4 w-24">Priority</th>
                      <th className="py-3 px-4 w-40">Target Scope</th>
                      <th className="py-3 px-4">Remedial Action Directive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fslAnalyticsEngine.riskForecast.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F2B33D]/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            item.level === 'High' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'
                          }`}>{item.level === 'High' ? 'Urgent' : 'Standard'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#521903] font-black">{item.name}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-sm">{item.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-xs font-bold text-emerald-600 flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Zero systemic intervention protocols currently required.
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white p-16 text-center text-xs font-black text-slate-400 uppercase tracking-widest rounded-2xl border border-[#F5E6C4]">
          Zero telemetry rows captured for this criteria query.
        </div>
      )}
    </div>
  );
}