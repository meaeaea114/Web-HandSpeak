'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  BookOpen,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  AlertCircle,
  Loader2,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  ArchiveRestore,
  Trash2,
  Sliders,
  Cpu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  CONTENT_CATEGORIES,
  ContentSubmission,
  PublishedActivityQuestion,
  getAllContentSubmissionsRealtime,
  approveContentSubmission,
  rejectContentSubmission,
  setSubmissionArchivedStatus,
  deleteContentSubmission,
  getPublishedActivityQuestions,
} from '@/lib/content-service';

function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  const date = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function categoryLabel(value: string): string {
  return CONTENT_CATEGORIES.find((c) => c.value === value)?.label || value;
}

function parseDifficultyLabel(levelStr?: string): { label: string; color: string } {
  if (!levelStr) return { label: 'Easy', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const lower = levelStr.toLowerCase();
  if (lower.includes('hard')) return { label: 'Hard', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (lower.includes('medium')) return { label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Easy', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

function resolveImagePath(rawPath?: string): string[] {
  if (!rawPath) return [];
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('data:') || rawPath.startsWith('blob:')) {
    return [rawPath];
  }
  const clean = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  const filename = clean.split(/[\\/]/).pop() || '';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  return [
    `/${clean}`,
    `/assets/pictures/${filename}`,
    `/assets/pictures/${nameWithoutExt}.jpg`,
    `/assets/pictures/${nameWithoutExt}.png`,
    `/assets/pictures/${nameWithoutExt.toUpperCase()}.jpg`,
    `/assets/pictures/${nameWithoutExt.toUpperCase()}.png`,
    `/assets/${clean}`,
    `/images/${filename}`,
  ];
}

function SubmissionImagePreview({
  imageUrl,
  correctAnswer,
  category,
}: {
  imageUrl?: string;
  correctAnswer?: string;
  category?: string;
}) {
  const [errorIndex, setErrorIndex] = useState(0);
  const candidateUrls = useMemo(() => resolveImagePath(imageUrl), [imageUrl]);

  useEffect(() => {
    setErrorIndex(0);
  }, [imageUrl]);

  const currentSrc = candidateUrls[errorIndex];

  if (!currentSrc || errorIndex >= candidateUrls.length) {
    return (
      <div className="h-28 w-28 bg-[#FAF6EE] border border-[#F5E6C4] rounded-2xl flex flex-col items-center justify-center p-2 text-center flex-shrink-0">
        <div className="h-9 w-9 rounded-full bg-[#F2B33D]/20 text-[#521903] flex items-center justify-center font-black text-base mb-1">
          {correctAnswer || (category ? category.slice(0, 2).toUpperCase() : '?')}
        </div>
        <span className="text-[9px] font-bold text-slate-400">No Image</span>
      </div>
    );
  }

  return (
    <div className="h-28 w-28 bg-[#FAF6EE] border border-[#F5E6C4] rounded-2xl flex items-center justify-center p-2 overflow-hidden shadow-inner flex-shrink-0">
      <img
        src={currentSrc}
        alt="Question Asset"
        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
        onError={() => setErrorIndex((prev) => prev + 1)}
      />
    </div>
  );
}

function OptionItem({ option, isCorrect }: { option: string; isCorrect: boolean }) {
  const [errorIndex, setErrorIndex] = useState(0);

  const isImageOption = useMemo(() => {
    if (!option) return false;
    const lower = option.toLowerCase();
    return (
      lower.includes('assets/') ||
      lower.includes('pictures/') ||
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('data:') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp')
    );
  }, [option]);

  const candidateUrls = useMemo(() => {
    if (!isImageOption) return [];
    return resolveImagePath(option);
  }, [option, isImageOption]);

  useEffect(() => {
    setErrorIndex(0);
  }, [option]);

  const currentSrc = candidateUrls[errorIndex];

  if (!isImageOption || !currentSrc || errorIndex >= candidateUrls.length) {
    const displayText = isImageOption
      ? option.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '')
      : option;

    return (
      <div
        className={`px-3 py-1.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 ${
          isCorrect
            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-black ring-1 ring-emerald-300'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />}
        <span>{displayText}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 h-16 w-16 ${
        isCorrect
          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/50'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="h-10 w-full flex items-center justify-center">
        <img
          src={currentSrc}
          alt="Option sign"
          className="max-h-full max-w-full object-contain"
          onError={() => setErrorIndex((prev) => prev + 1)}
        />
      </div>
      <span className="text-[8px] font-black text-slate-500 truncate">
        {option.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '')}
      </span>
    </div>
  );
}

export default function ContentApprovalPage() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('Pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const [publishedQuestions, setPublishedQuestions] = useState<PublishedActivityQuestion[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(true);

  useEffect(() => {
    setSubmissionsLoading(true);
    const unsubscribe = getAllContentSubmissionsRealtime(
      (items) => {
        setSubmissions(items);
        setSubmissionsLoading(false);
        setSubmissionsError(null);
      },
      (err) => {
        setSubmissionsError(err?.message || 'Failed to load submissions.');
        setSubmissionsLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadPublished = async () => {
    setPublishedLoading(true);
    try {
      const items = await getPublishedActivityQuestions();
      setPublishedQuestions(items);
    } catch (err: any) {
      console.error(err);
    } finally {
      setPublishedLoading(false);
    }
  };

  useEffect(() => {
    loadPublished();
  }, []);

  const publishedCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    publishedQuestions.forEach((q) => {
      const cat = q.category || 'uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [publishedQuestions]);

  const countsByStatus = useMemo(() => {
    return {
      all: submissions.length,
      pending: submissions.filter((s) => s.status === 'pending' && !s.isArchived).length,
      approved: submissions.filter((s) => s.status === 'approved' && !s.isArchived).length,
      rejected: submissions.filter((s) => s.status === 'rejected' && !s.isArchived).length,
      archived: submissions.filter((s) => s.isArchived).length,
    };
  }, [submissions]);

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    setBusyId(id);
    setActionError(null);
    try {
      await approveContentSubmission(
        id,
        user.id,
        user.fullName || user.name || 'Administrator',
        user.email || ''
      );
      await loadPublished();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve this content.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string, reason: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    if (!reason.trim()) {
      setActionError('Please specify a rejection reason.');
      return;
    }
    setBusyId(id);
    setActionError(null);
    try {
      await rejectContentSubmission(
        id,
        user.id,
        user.fullName || user.name || 'Administrator',
        reason,
        user.email || ''
      );
      setActiveRevisionId(null);
      setNotesInput('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reject this content.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleArchive = async (id: string, currentArchivedStatus: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;
    setBusyId(id);
    setActionError(null);
    try {
      await setSubmissionArchivedStatus(
        id,
        !currentArchivedStatus,
        user.id,
        user.fullName || user.name || 'Administrator',
        user.email || ''
      );
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update archive status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId || !user?.id) return;
    setBusyId(deleteTargetId);
    try {
      await deleteContentSubmission(
        deleteTargetId,
        user.id,
        user.fullName || user.name || 'Administrator',
        user.email || ''
      );
      setDeleteTargetId(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete submission.');
    } finally {
      setBusyId(null);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesSearch =
        item.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.createdByName || '').toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (filterStatus === 'Archived') {
        matchesStatus = !!item.isArchived;
      } else if (filterStatus === 'All') {
        matchesStatus = !item.isArchived;
      } else {
        matchesStatus = !item.isArchived && item.status === filterStatus.toLowerCase();
      }

      const matchesCategory =
        categoryFilter === 'All' ? true : item.category === categoryFilter.toLowerCase();

      const matchesDifficulty =
        difficultyFilter === 'All' ? true : item.difficulty === difficultyFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCategory && matchesDifficulty;
    });
  }, [submissions, searchTerm, filterStatus, categoryFilter, difficultyFilter]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full p-1 text-[#521903]">
      {/* 1. Live Mobile Question Count Strip */}
      <div className="bg-white rounded-3xl border border-[#F5E6C4] p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#F2B33D]" />
            <h3 className="text-xs font-black text-[#521903] uppercase tracking-wider">
              Live Mobile Activity Questions (activity_questions)
            </h3>
          </div>
          <button
            onClick={loadPublished}
            disabled={publishedLoading}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-600 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Live Count"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${publishedLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {publishedLoading ? (
          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading published counts...
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {CONTENT_CATEGORIES.map((c) => (
              <span key={c.value} className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 capitalize">
                {c.label}: {publishedCountsByCategory[c.value] || 0}
              </span>
            ))}
            <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 border border-emerald-200 text-emerald-800">
              Total Live: {publishedQuestions.length}
            </span>
          </div>
        )}
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-[#F5E6C4] shadow-sm space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterStatus('Pending')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              filterStatus === 'Pending'
                ? 'bg-[#F2B33D] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pending ({countsByStatus.pending})
          </button>

          <button
            onClick={() => setFilterStatus('Approved')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              filterStatus === 'Approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved ({countsByStatus.approved})
          </button>

          <button
            onClick={() => setFilterStatus('Rejected')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              filterStatus === 'Rejected'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejected ({countsByStatus.rejected})
          </button>

          <button
            onClick={() => setFilterStatus('Archived')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              filterStatus === 'Archived'
                ? 'bg-[#521903] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            Archived ({countsByStatus.archived})
          </button>

          <button
            onClick={() => setFilterStatus('All')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              filterStatus === 'All'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Active ({submissions.length - countsByStatus.archived})
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-2.5 md:items-center justify-between pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by prompt, category, faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-200 focus:outline-none focus:bg-white text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none bg-slate-50 text-[#521903] font-bold pl-3 pr-7 py-1.5 rounded-xl border border-slate-200 focus:outline-none text-xs cursor-pointer"
              >
                <option value="All">All Categories</option>
                {CONTENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#521903] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="appearance-none bg-slate-50 text-[#521903] font-bold pl-3 pr-7 py-1.5 rounded-xl border border-slate-200 focus:outline-none text-xs cursor-pointer capitalize"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#521903] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-rose-600">{actionError}</p>
        </div>
      )}

      {submissionsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-amber-700">{submissionsError}</p>
        </div>
      )}

      {/* 3. Submissions Accordion List */}
      <div className="space-y-3">
        {filteredSubmissions.map((content) => {
          const isExpanded = expandedCardId === content.id;
          const isBusy = busyId === content.id;
          const isPending = content.status === 'pending';
          const isApproved = content.status === 'approved';
          const isRejected = content.status === 'rejected';
          const isArchived = !!content.isArchived;
          const isDeletionRequest = content.submissionType === 'delete';
          const isModelCalibration = content.submissionType === 'train_parameters';
          const diffMeta = parseDifficultyLabel(content.level || content.difficulty);

          return (
            <div
              key={content.id}
              className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden ${
                isArchived
                  ? 'border-slate-200 bg-slate-50/70 opacity-80'
                  : isDeletionRequest
                  ? 'border-rose-300 ring-2 ring-rose-300/30'
                  : isModelCalibration
                  ? 'border-blue-300 ring-2 ring-blue-300/30'
                  : isExpanded
                  ? 'border-[#F2B33D] ring-2 ring-[#F2B33D]/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* COMPACT SUMMARY ROW */}
              <div
                onClick={() => setExpandedCardId(isExpanded ? null : content.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                      isModelCalibration
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : isDeletionRequest
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-amber-50 border-amber-200 text-[#B4790C]'
                    }`}
                  >
                    {isModelCalibration ? <Sliders className="h-4 w-4" /> : isDeletionRequest ? <Trash2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {isModelCalibration && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                          Model Calibration
                        </span>
                      )}
                      {isDeletionRequest && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300">
                          Deletion Request
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-[#B4790C]">
                        {categoryLabel(content.category)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${diffMeta.color}`}>
                        {diffMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isPending
                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                            : isApproved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-rose-50 border-rose-200 text-rose-600'
                        }`}
                      >
                        {isPending && <Clock className="h-2.5 w-2.5" />}
                        {isApproved && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {isRejected && <XCircle className="h-2.5 w-2.5" />}
                        {content.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-800 truncate" title={content.questionText}>
                      {content.questionText || 'Solve:'}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="hidden sm:block text-right text-[11px] text-slate-400 font-bold">
                    <p className="text-slate-700 truncate max-w-[140px]">{content.createdByName || 'Faculty'}</p>
                    <p>{formatTimestamp(content.submittedAt || content.createdAt)}</p>
                  </div>

                  <button
                    type="button"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* EXPANDED FULL DETAILS PANEL */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-4 animate-fadeIn bg-slate-50/30">
                  <div className="flex flex-col md:flex-row gap-5 items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          {isModelCalibration ? 'Target Gesture Definition:' : 'Full Question Prompt:'}
                        </span>
                        <p className="text-sm font-black text-slate-800">
                          {content.questionText || 'Solve:'}
                        </p>
                      </div>

                      {/* Render Model Tolerances if Gesture Training submission */}
                      {isModelCalibration && content.toleranceBounds ? (
                        <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                            Requested Recognition Tolerance Parameters:
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                            <div className="p-2 bg-slate-50 rounded-xl border">Rotate: <span className="text-[#521903] font-mono">{content.toleranceBounds.rotate}%</span></div>
                            <div className="p-2 bg-slate-50 rounded-xl border">Tilt: <span className="text-[#521903] font-mono">{content.toleranceBounds.tilt}%</span></div>
                            <div className="p-2 bg-slate-50 rounded-xl border">Distance: <span className="text-[#521903] font-mono">{content.toleranceBounds.distance}%</span></div>
                            <div className="p-2 bg-slate-50 rounded-xl border">Switch Hands: <span className="text-[#521903] font-mono">{content.toleranceBounds.switchHands}%</span></div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Answer Options:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {content.options?.map((opt, idx) => (
                              <OptionItem key={idx} option={opt} isCorrect={opt === content.correctAnswer} />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 font-bold pt-2 border-t border-slate-100">
                        <p>Submitted by: <span className="text-slate-700">{content.createdByName || 'Faculty Member'}</span></p>
                        <p>Submission Date: <span className="text-slate-700">{formatTimestamp(content.submittedAt || content.createdAt)}</span></p>
                      </div>

                      {isRejected && content.rejectionReason && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 font-medium">
                          <span className="font-black block uppercase tracking-wider text-[9px] text-rose-600 mb-0.5">
                            Admin Rejection Feedback:
                          </span>
                          {content.rejectionReason}
                        </div>
                      )}
                    </div>

                    <SubmissionImagePreview
                      imageUrl={content.imageUrl}
                      correctAnswer={content.correctAnswer}
                      category={content.category}
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={(e) => handleToggleArchive(content.id, isArchived, e)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#521903] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {isArchived ? 'Restore to Active' : 'Archive Submission'}
                    </button>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRevisionId(activeRevisionId === content.id ? null : content.id);
                            }}
                            disabled={isBusy}
                            className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-black text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>

                          <button
                            onClick={(e) => handleApprove(content.id, e)}
                            disabled={isBusy}
                            className={`px-4 py-1.5 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                              isModelCalibration
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : isDeletionRequest
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : 'bg-[#4CAF50] hover:bg-[#43A047]'
                            }`}
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            {isModelCalibration
                              ? 'Approve Parameters & Sync to Mobile App'
                              : isDeletionRequest
                              ? 'Approve Deletion & Remove'
                              : 'Approve & Publish'}
                          </button>
                        </>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(content.id);
                        }}
                        disabled={isBusy}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rejection Field */}
                  {activeRevisionId === content.id && (
                    <div className="pt-3 border-t border-slate-100 space-y-2 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Specify reason for rejection:
                      </label>
                      <div className="flex gap-2 flex-col sm:flex-row">
                        <input
                          type="text"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="e.g. Rotate or distance boundary is too loose for accurate sign recognition..."
                          className="flex-1 px-3 py-1.5 bg-white text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        />
                        <button
                          onClick={(e) => handleReject(content.id, notesInput, e)}
                          disabled={isBusy}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl active:scale-[0.98] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!submissionsLoading && filteredSubmissions.length === 0 && (
          <div className="text-center py-10 text-slate-400 bg-white border border-dashed border-slate-200 rounded-3xl">
            <p className="font-bold text-xs">No submissions found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-sm rounded-3xl shadow-2xl text-center space-y-4 border border-slate-100">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Confirm Deletion</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Are you sure you want to delete this submission? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-xs font-black text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busyId === deleteTargetId}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {busyId === deleteTargetId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}