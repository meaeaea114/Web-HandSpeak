'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, AlertCircle, Zap, RefreshCw, Info } from 'lucide-react';
import { getStudentsRealtime, Student } from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { fetchGestureAndActivitySummary, GestureAccuracySummary } from '@/lib/ai-analytics-client';

export default function GesturePerformancePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<GestureAccuracySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStudentsLoading(true);
    const unsubscribe = getStudentsRealtime(
      (data) => {
        setStudents(data);
        setStudentsLoading(false);
      },
      () => setStudentsLoading(false)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Respect the same teacher grade/section scope as the Analytics page —
  // a teacher must never see gesture data for students outside their scope.
  const scopedStudents = useMemo(() => {
    if (!user || user.role !== 'teacher') return students;
    const gradeIsAll = !user.assignedGrade || user.assignedGrade === 'All';
    const sectionsAreAll = !user.assignedSections || user.assignedSections.length === 0 || user.assignedSections.includes('All');
    if (gradeIsAll && sectionsAreAll) return students;
    return students.filter((s) => {
      const studentGrade = (s.gradeLevel || '').toLowerCase().startsWith('grade') ? s.gradeLevel : `Grade ${s.gradeLevel}`;
      const gradeMatches = gradeIsAll || studentGrade === user.assignedGrade;
      const sectionMatches = sectionsAreAll || (user.assignedSections || []).includes(s.section);
      return gradeMatches && sectionMatches;
    });
  }, [students, user]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    const studentIds = scopedStudents.map((s) => s.id || s.uid).filter(Boolean);
    const result = await fetchGestureAndActivitySummary(studentIds);
    if (result.success) {
      setSummary(result.gesture);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (studentsLoading) return;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentsLoading, scopedStudents.length]);

  const sortedSigns = summary ? [...summary.perSign].sort((a, b) => b.accuracy - a.accuracy) : [];
  const lowestPerforming = summary ? [...summary.perSign].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3) : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gesture Performance</h1>
          <p className="mt-2 text-muted-foreground">
            Real gesture-recognition accuracy from recorded student attempts — never estimated or fabricated.
          </p>
        </div>
        <button
          onClick={loadSummary}
          disabled={loading}
          className="px-3 py-2 bg-[#521903] hover:bg-[#3d1202] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-700" />
          <span className="text-sm font-medium text-muted-foreground">Loading gesture-recognition data from Firestore...</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{error}</p>
            <button onClick={loadSummary} className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-300 underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && summary && !summary.hasData && (
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-2 text-center">
          <Info className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="text-base font-bold text-foreground">Insufficient Gesture Data</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No gesture-recognition attempts have been recorded yet for students in your scope. This page will
            populate automatically with real accuracy figures once the student-facing HandSpeak app starts
            recording practice attempts to the <code className="text-xs bg-muted px-1 py-0.5 rounded">gesture_attempts</code> collection.
          </p>
        </div>
      )}

      {!loading && !error && summary && summary.hasData && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Recognition Rate</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{summary.overallAccuracy}%</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sign Attempts</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{summary.totalAttempts}</p>
                </div>
                <div className="rounded-xl bg-secondary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Signs Mastered</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{summary.signsMastered}</p>
                </div>
                <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-3">
                  <span className="text-2xl">👑</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Performance Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Sign Recognition Performance</h3>
              <p className="mt-1 text-sm text-muted-foreground">Computed from real recorded attempts for students in your scope</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Sign</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Module</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Recognition Rate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Attempts</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Avg Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSigns.map((sign) => (
                    <tr key={`${sign.module}-${sign.sign}`} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{sign.sign}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground capitalize">{sign.module}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                sign.accuracy >= 85 ? 'bg-green-500' : sign.accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${sign.accuracy}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{sign.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{sign.attempts}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {sign.avgConfidence !== null ? `${sign.avgConfidence}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Needs Improvement */}
          {lowestPerforming.length > 0 && (
            <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-3">Signs Needing Practice</h3>
                  <div className="space-y-2">
                    {lowestPerforming.map((sign) => (
                      <div key={`${sign.module}-${sign.sign}`} className="flex items-center justify-between text-sm">
                        <span className="text-yellow-800 dark:text-yellow-300">{sign.sign} ({sign.module})</span>
                        <span className="font-medium text-yellow-600 dark:text-yellow-400">{sign.accuracy}% accuracy</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
