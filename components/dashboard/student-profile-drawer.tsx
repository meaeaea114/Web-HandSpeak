'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  BookOpen, 
  FileText, 
  School, 
  Save, 
  RefreshCw, 
  UserCheck, 
  Star, 
  Flame, 
  CheckCircle2, 
  Archive, 
  RotateCcw, 
  Sparkles, 
  Send,
  Zap,
  Calendar,
  Layers,
  Award,
  Brain,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { 
  Student, 
  getStudentDeepDetails, 
  updateStudentClassAssignment, 
  archiveStudent, 
  restoreStudent, 
  addTeacherNoteToStudent 
} from '@/lib/data-service';
import { useAuth } from '@/lib/auth-context';
import { fetchStudentAIInsight, fetchGestureAndActivitySummary, StudentAIInsight, GestureAccuracySummary } from '@/lib/ai-analytics-client';

interface StudentProfileDrawerProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'modules' | 'levels' | 'ai' | 'notes' | 'admin';

export function StudentProfileDrawer({
  student,
  isOpen,
  onClose,
}: StudentProfileDrawerProps) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [deepStudent, setDeepStudent] = useState<Student | null>(student);

  // Administrative Editable Fields
  const [section, setSection] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Teacher Note Input
  const [newNote, setNewNote] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // AI Insight (fetched on-demand when the AI tab is opened, not on every drawer open)
  const [aiInsight, setAiInsight] = useState<StudentAIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCached, setAiCached] = useState<boolean>(false);
  const [gestureSummary, setGestureSummary] = useState<GestureAccuracySummary | null>(null);

  useEffect(() => {
    if (!student || !isOpen) return;

    setSection(student.section || '');
    setGradeLevel(student.gradeLevel || 'Grade 1');
    setStatus((student.status === 'archived' ? 'archived' : student.status === 'deactivated' ? 'inactive' : 'active'));
    setDeepStudent(student);
    setActiveTab('overview');
    setAiInsight(null);
    setAiError(null);

    getStudentDeepDetails(student.id).then((fullData) => {
      setDeepStudent((prev) => ({ ...(prev || student), ...fullData }));
    });
  }, [student, isOpen]);

  const loadAIInsight = async (forceRefresh = false) => {
    if (!student) return;
    setAiLoading(true);
    setAiError(null);
    const subject = deepStudent || student;
    const gestureResult = await fetchGestureAndActivitySummary([subject.id || subject.uid]);
    const emptyGesture: GestureAccuracySummary = { hasData: false, totalAttempts: 0, overallAccuracy: null, perSign: [], weakSigns: [], signsMastered: 0 };
    const gesture = gestureResult.success ? gestureResult.gesture : emptyGesture;
    setGestureSummary(gesture);
    const result = await fetchStudentAIInsight(subject, gesture, forceRefresh);
    if (result.success) {
      setAiInsight(result.insight);
      setAiCached(result.cached);
    } else {
      setAiError(result.error);
    }
    setAiLoading(false);
  };

  const handleOpenAITab = () => {
    setActiveTab('ai');
    if (!aiInsight && !aiLoading) {
      loadAIInsight(false);
    }
  };

  if (!isOpen || !student) return null;

  const currentData = deepStudent || student;
  const studentName = currentData.name || currentData.fullName || 'Student Dossier';
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  const isArchived = currentData.status === 'archived';

  const formatTimestamp = (val: any) => {
    if (!val) return 'Not recorded';
    try {
      if (typeof val === 'string') return val;
      if (val.toDate) return val.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      if (val.seconds) return new Date(val.seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      return new Date(val).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return 'Not recorded';
    }
  };

  const handleSaveAcademicChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStudentClassAssignment(currentData.id, {
        section: section.trim(),
        gradeLevel: gradeLevel.trim(),
        status,
      });
      setFeedback('Details saved.');
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('Update failed.');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    setIsSaving(true);
    try {
      if (isArchived) {
        await restoreStudent(currentData.id);
        setStatus('active');
        setFeedback('Student restored.');
      } else {
        await archiveStudent(currentData.id);
        setStatus('archived');
        setFeedback('Student archived.');
      }
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('Action failed.');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const added = await addTeacherNoteToStudent(
        currentData.id,
        newNote,
        user?.fullName || user?.name || 'Instructor',
        user?.id || 'teacher'
      );
      setDeepStudent((prev) => prev ? {
        ...prev,
        teacherNotes: [added, ...(prev.teacherNotes || [])],
      } : prev);
      setNewNote('');
      setFeedback('Observation recorded.');
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('Failed to save note.');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-[480px] bg-white/95 dark:bg-[#1A1614]/95 backdrop-blur-2xl h-full shadow-2xl border-l border-stone-200 dark:border-[#382F2A] flex flex-col justify-between p-5 animate-in slide-in-from-right duration-300 overflow-hidden">
        
        {/* Header Bar */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-[#382F2A] pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C29F85] dark:text-[#A0938A]">
              STUDENT PROFILE DOSSIER
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#2A231F] text-stone-400 dark:text-stone-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {feedback && (
            <div className="py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Identity Card with Real Avatar and UID */}
          <div className="bg-stone-50/90 dark:bg-[#2A231F]/50 p-3 rounded-2xl border border-stone-200/60 dark:border-[#382F2A] flex items-center gap-3">
            {currentData.avatar ? (
              <img 
                src={currentData.avatar} 
                alt={studentName} 
                className="h-12 w-12 rounded-xl object-cover border border-amber-900/10 shrink-0 shadow-xs"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-[#F5E6C4] dark:bg-[#3B2810] text-[#521903] dark:text-[#FCD34D] flex items-center justify-center font-black text-sm uppercase shrink-0 border border-amber-900/10">
                {initials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-extrabold text-xs text-[#521903] dark:text-[#F3EFEA] truncate">
                  {studentName}
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-black tracking-wider uppercase border shrink-0 ${
                  currentData.type === 'SNED'
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                }`}>
                  {currentData.type}
                </span>
              </div>
              <p className="text-[10px] font-mono font-bold text-stone-500 dark:text-[#A0938A] truncate mt-0.5">
                ID: {currentData.studentId} • {currentData.gradeLevel} - {currentData.section}
              </p>
              <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400 mt-0.5 truncate">
                <School className="h-3 w-3 shrink-0" />
                <span className="truncate">{currentData.schoolName}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-1 bg-stone-100/70 dark:bg-[#12100E] p-1 rounded-xl border border-stone-200/50 dark:border-[#382F2A] text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                activeTab === 'overview' 
                  ? 'bg-white dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                activeTab === 'modules' 
                  ? 'bg-white dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              Module XP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('levels')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                activeTab === 'levels' 
                  ? 'bg-white dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              Levels
            </button>
            <button
              type="button"
              onClick={handleOpenAITab}
              className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === 'ai' 
                  ? 'bg-white dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              <Brain className="h-3 w-3" />
              AI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                activeTab === 'notes' 
                  ? 'bg-white dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              Notes ({currentData.teacherNotes?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                activeTab === 'admin' 
                  ? 'bg-white dark:bg-[#2A231F] text-[#521903] dark:text-[#F0AB31] shadow-xs' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`}
            >
              Manage
            </button>
          </div>
        </div>

        {/* Tab Views */}
        <div className="flex-1 py-3 overflow-hidden flex flex-col justify-between">
          
          {/* TAB 1: OVERVIEW & REAL GAMIFICATION POINTS */}
          {activeTab === 'overview' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5">
              
              {/* Account Data */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                  <span className="text-[9px] font-black uppercase text-stone-400 block">Email Address</span>
                  <span className="font-mono font-bold text-[10.5px] text-stone-700 dark:text-stone-300 truncate block mt-0.5">
                    {currentData.email}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                  <span className="text-[9px] font-black uppercase text-stone-400 block">Student Status</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    currentData.status === 'active' || currentData.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                      : currentData.status === 'archived'
                      ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    {currentData.status}
                  </span>
                </div>
              </div>

              {/* Progress & Live Curriculum Tracking */}
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-[#2A231F]/30 border border-amber-200/60 dark:border-[#382F2A] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#521903] dark:text-[#F3EFEA] flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-[#F0AB31] fill-[#F0AB31]" /> Overall Learning Mastery
                  </span>
                  <span className="font-black text-xs text-amber-700 dark:text-[#F0AB31]">
                    {currentData.progress}%
                  </span>
                </div>
                
                <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(currentData.progress || 0, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9.5px] text-stone-500 dark:text-stone-400 pt-0.5">
                  <span>Current Module: <strong>{currentData.currentModule}</strong></span>
                  <span>Weekly XP: <strong>{currentData.gamification.weeklyXp.toLocaleString()} XP</strong></span>
                </div>
              </div>

              {/* Real Gamification Stats Matrix */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                  <span className="text-[8.5px] font-black uppercase text-stone-400 block">Total XP</span>
                  <span className="text-xs font-black text-[#521903] dark:text-[#F0AB31] block mt-0.5">
                    {currentData.gamification.xp.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                  <span className="text-[8.5px] font-black uppercase text-stone-400 block">Stars</span>
                  <span className="text-xs font-black text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {currentData.gamification.stars}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                  <span className="text-[8.5px] font-black uppercase text-stone-400 block">Streak</span>
                  <span className="text-xs font-black text-orange-600 flex items-center justify-center gap-0.5 mt-0.5">
                    <Flame className="h-3 w-3 fill-orange-500 text-orange-600" />
                    {currentData.gamification.streak}d
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A]">
                  <span className="text-[8.5px] font-black uppercase text-stone-400 block">Daily XP</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {currentData.gamification.dailyXp}
                  </span>
                </div>
              </div>

              {/* Real Firestore Activity Timestamps */}
              <div className="p-2.5 rounded-xl bg-stone-50/70 dark:bg-[#0D0B0A] border border-stone-200/60 dark:border-[#382F2A] space-y-1 text-[9.5px]">
                <div className="flex justify-between text-stone-500 dark:text-stone-400">
                  <span>Enrolled (Created):</span>
                  <strong className="text-stone-700 dark:text-stone-200">{formatTimestamp(currentData.createdAt)}</strong>
                </div>
                <div className="flex justify-between text-stone-500 dark:text-stone-400">
                  <span>Last Active Session:</span>
                  <strong className="text-stone-700 dark:text-stone-200">{formatTimestamp(currentData.lastActiveDate || currentData.lastActive)}</strong>
                </div>
                {currentData.lastCompletedChallengeDate && (
                  <div className="flex justify-between text-stone-500 dark:text-stone-400">
                    <span>Last Challenge Date:</span>
                    <strong className="text-amber-700 dark:text-[#F0AB31]">{currentData.lastCompletedChallengeDate}</strong>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: MODULE-SPECIFIC XP BREAKDOWN */}
          {activeTab === 'modules' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                MODULE EXPERIENCE & STARS TRACKING
              </span>

              <div className="space-y-2 flex-1">
                {currentData.moduleProgress.map((mod) => (
                  <div key={mod.moduleId} className="p-3 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-[#F0AB31]" />
                        {mod.moduleName}
                      </span>
                      <span className="font-black text-xs text-amber-700 dark:text-[#F0AB31]">
                        {mod.xp.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#F0AB31] rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(mod.progress, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span>Completed Levels: <strong>{mod.completedLevels}/{mod.totalLevels}</strong></span>
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {mod.starsEarned} / {mod.totalPossibleStars} Stars
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12100E] border border-stone-200/60 dark:border-[#382F2A] text-[10px] text-stone-500 flex justify-between">
                <span>Total Mobile Lessons Completed:</span>
                <strong className="text-stone-800 dark:text-stone-200">{currentData.gamification.completedLessons} Lessons</strong>
              </div>
            </div>
          )}

          {/* TAB 3: CURRICULUM LEVEL BREAKDOWN MAP */}
          {activeTab === 'levels' && (
            <div className="flex-1 flex flex-col justify-between gap-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                COMPLETED LEVEL MASTERY (PROGRESS MAP)
              </span>

              <div className="space-y-1.5 flex-1 max-h-[220px] overflow-y-auto pr-1">
                {currentData.moduleProgress.flatMap(m => m.levelDetails).length > 0 ? (
                  currentData.moduleProgress.flatMap(m => m.levelDetails).map((lvl) => (
                    <div key={lvl.key} className="p-2 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] flex items-center justify-between">
                      <span className="font-bold text-[10.5px] text-stone-700 dark:text-stone-300">
                        {lvl.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((starIdx) => (
                          <Star 
                            key={starIdx}
                            className={`h-3 w-3 ${
                              starIdx <= lvl.stars
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-stone-200 dark:text-stone-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-dashed border-stone-200 dark:border-[#382F2A] rounded-xl text-stone-400 text-xs">
                    No individual level data recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: AI-GENERATED STUDENT INSIGHT */}
          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#F0AB31]" />
                  AI-Generated Insight
                </span>
                <button
                  type="button"
                  onClick={() => loadAIInsight(true)}
                  disabled={aiLoading}
                  className="text-[9.5px] font-bold text-amber-700 dark:text-[#F0AB31] hover:underline disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${aiLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {aiLoading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
                  <RefreshCw className="h-5 w-5 animate-spin text-amber-700" />
                  <span className="text-[10px] font-bold text-stone-400">Analyzing student performance data...</span>
                </div>
              )}

              {!aiLoading && aiError && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 px-3 text-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="text-[10.5px] text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{aiError}</p>
                  <button
                    type="button"
                    onClick={() => loadAIInsight(false)}
                    className="mt-1 px-3 py-1 bg-[#521903] dark:bg-[#D98A1C] text-white dark:text-[#110e0c] rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!aiLoading && !aiError && aiInsight && (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 text-xs">
                  {gestureSummary && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                      <span className="text-[9px] font-black uppercase text-stone-400 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Gesture Recognition Accuracy
                        <span className="text-[8px] font-bold normal-case text-emerald-600">real data</span>
                      </span>
                      {gestureSummary.hasData ? (
                        <>
                          <p className="text-[10.5px] text-stone-700 dark:text-stone-300 font-medium">
                            {gestureSummary.overallAccuracy}% overall accuracy across {gestureSummary.totalAttempts} recorded attempts.
                          </p>
                          {gestureSummary.weakSigns.length > 0 && (
                            <p className="text-[10px] text-stone-500">
                              Weakest signs: {gestureSummary.weakSigns.slice(0, 4).map((s) => `${s.sign} (${s.accuracy}%)`).join(', ')}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[10.5px] text-stone-400 italic">
                          Insufficient gesture data — no recognition attempts have been recorded for this student yet.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-stone-700 dark:text-stone-300 font-medium leading-relaxed p-2.5 bg-stone-50 dark:bg-[#0D0B0A] rounded-xl border border-stone-200/70 dark:border-[#382F2A]">
                    {aiInsight.studentSummary}
                  </p>

                  {aiInsight.strengths.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-1">
                      <span className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> Strengths
                      </span>
                      <ul className="space-y-0.5">
                        {aiInsight.strengths.map((s, i) => (
                          <li key={i} className="text-[10.5px] text-emerald-900 dark:text-emerald-200 font-medium">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsight.weaknesses.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 space-y-1">
                      <span className="text-[9px] font-black uppercase text-rose-800 dark:text-rose-300 flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3" /> Weaknesses
                      </span>
                      <ul className="space-y-0.5">
                        {aiInsight.weaknesses.map((s, i) => (
                          <li key={i} className="text-[10.5px] text-rose-900 dark:text-rose-200 font-medium">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                    <span className="text-[9px] font-black uppercase text-stone-400 flex items-center gap-1">
                      <Brain className="h-3 w-3" /> Diagnostic Insight
                    </span>
                    <p className="text-[10.5px] text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                      {aiInsight.diagnosticInsight}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                    <span className="text-[9px] font-black uppercase text-stone-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Predictive Insight
                      <span className="text-[8px] font-bold text-stone-400 normal-case">(estimate, not a guarantee)</span>
                    </span>
                    {aiInsight.predictiveInsight ? (
                      <p className="text-[10.5px] text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                        {aiInsight.predictiveInsight}
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-stone-400 italic font-medium leading-relaxed">
                        {aiInsight.predictiveConfidenceNote || 'Not enough activity history yet to produce a reliable forecast for this student.'}
                      </p>
                    )}
                  </div>

                  {aiInsight.recommendedActivities.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-[#2A231F]/40 border border-amber-200 dark:border-[#382F2A] space-y-1">
                      <span className="text-[9px] font-black uppercase text-amber-800 dark:text-[#F0AB31] flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" /> Recommended Activities
                      </span>
                      <ul className="space-y-0.5">
                        {aiInsight.recommendedActivities.map((s, i) => (
                          <li key={i} className="text-[10.5px] text-amber-900 dark:text-amber-100 font-medium">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsight.recommendedInterventions.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 space-y-1">
                      <span className="text-[9px] font-black uppercase text-sky-800 dark:text-sky-300 flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> Suggested Teacher Interventions
                      </span>
                      <ul className="space-y-0.5">
                        {aiInsight.recommendedInterventions.map((s, i) => (
                          <li key={i} className="text-[10.5px] text-sky-900 dark:text-sky-200 font-medium">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsight.dataLimitations.length > 0 && (
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-[#0D0B0A] border border-dashed border-stone-300 dark:border-[#382F2A]">
                      <span className="text-[8.5px] font-bold text-stone-400 uppercase block mb-0.5">Data Limitations</span>
                      {aiInsight.dataLimitations.map((s, i) => (
                        <p key={i} className="text-[9.5px] text-stone-400 leading-tight">{s}</p>
                      ))}
                    </div>
                  )}

                  <p className="text-[8.5px] text-stone-300 dark:text-stone-600 text-center pt-1">
                    {aiCached ? 'Showing a recent AI analysis' : 'Freshly generated AI analysis'} · grounded in this student's real Firestore data
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEACHER OBSERVATION NOTES */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5">
              
              <div className="space-y-1.5 flex-1 max-h-[160px] overflow-y-auto pr-1">
                {currentData.teacherNotes && currentData.teacherNotes.length > 0 ? (
                  currentData.teacherNotes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-stone-400">
                        <span className="text-[#521903] dark:text-[#F0AB31]">{note.authorName}</span>
                        <span>{formatTimestamp(note.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-tight">
                        {note.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center border border-dashed border-stone-200 dark:border-[#382F2A] rounded-xl text-stone-400 text-[11px]">
                    No observation notes recorded yet.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddNote} className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-[#382F2A]">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log gesture accuracy, sign speed..."
                    className="flex-1 px-3 py-1.5 bg-stone-50 dark:bg-[#151311] border border-stone-200 dark:border-[#382F2A] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#F0AB31]"
                  />
                  <button
                    type="submit"
                    disabled={isAddingNote || !newNote.trim()}
                    className="px-3 py-1.5 bg-[#521903] dark:bg-[#D98A1C] text-white dark:text-[#110e0c] rounded-xl font-bold text-xs disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 5: ADMINISTRATIVE CLASS & STATUS */}
          {activeTab === 'admin' && (
            <form onSubmit={handleSaveAcademicChanges} className="flex-1 flex flex-col justify-between gap-2.5 text-xs">
              
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                  CLASS ASSIGNMENT & ENROLLMENT STATUS
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                    <label className="text-[9px] font-black uppercase text-stone-400 block">Grade Level</label>
                    <input
                      type="text"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      placeholder="e.g. Grade 1"
                      className="w-full bg-transparent font-bold text-stone-800 dark:text-stone-100 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] space-y-1">
                    <label className="text-[9px] font-black uppercase text-stone-400 block">Section</label>
                    <input
                      type="text"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g. Narra"
                      className="w-full bg-transparent font-bold text-stone-800 dark:text-stone-100 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0D0B0A] border border-stone-200/70 dark:border-[#382F2A] flex items-center justify-between">
                  <span className="font-bold text-[10px] text-stone-400 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> Account Status
                  </span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="bg-transparent font-bold text-xs text-[#521903] dark:text-[#F0AB31] focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-100/70 dark:bg-[#2A231F]/30 border border-stone-200 dark:border-[#382F2A] flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-stone-800 dark:text-stone-200">
                    {isArchived ? 'Restore Student Account' : 'Archive Student Account'}
                  </p>
                  <span className="text-[9.5px] text-stone-400 block">
                    {isArchived ? 'Move back to active roster' : 'Retain all scores & remove from active'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  disabled={isSaving}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    isArchived
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {isArchived ? <RotateCcw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                  <span>{isArchived ? 'Restore' : 'Archive'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2 bg-[#521903] hover:bg-[#9F4409] dark:bg-[#D98A1C] dark:hover:bg-[#C27A13] text-white dark:text-[#110e0c] font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Class Assignment</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer Close */}
        <div className="pt-2.5 border-t border-stone-200/60 dark:border-[#382F2A] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-stone-100 dark:bg-[#2A231F] hover:bg-stone-200 dark:hover:bg-[#382F2A] text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
}