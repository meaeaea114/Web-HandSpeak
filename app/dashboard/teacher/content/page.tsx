'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  Check,
  ChevronRight,
  Sparkles,
  Search,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  X,
  Send,
  Tag,
  HelpCircle,
  Layers,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  CheckCircle,
  Type,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  PublishedActivityQuestion,
  ActivityCategory,
  ContentSubmission,
  subscribeToAllActivities,
  subscribeToCategories,
  getMyContentSubmissionsRealtime,
  createCategory,
  createContentSubmission,
  updateContentSubmission,
  requestActivityDeletion,
  deleteContentSubmission,
  uploadActivityImage,
} from '@/lib/content-service';

type ContentScreen = 'dashboard' | 'wizard_question' | 'wizard_answers';

interface FormState {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  customType?: string;
  level: string;
  question_text: string;
  correct_answer?: string;
  correctAnswerIndex: number;
  options: string[];
  image_url: string;
  activityQuestionId?: string;
  submissionId?: string;
}

const DEFAULT_CATEGORIES: ActivityCategory[] = [
  { id: 'alphabet', name: 'alphabet', label: 'Alphabet', imgUrl: '/images/alphabets.png' },
  { id: 'numbers', name: 'numbers', label: 'Numbers', imgUrl: '/images/numbers.png' },
  { id: 'phrases', name: 'phrases', label: 'Phrases', imgUrl: '/images/phrases.png' },
  { id: 'civic', name: 'civic', label: 'Civic', imgUrl: '/images/civic.png' },
];

const ACTIVITY_TYPES = [
  { id: 'sign_to_text', label: 'Sign to Text' },
  { id: 'text_to_sign', label: 'Text to Sign' },
  { id: 'solve_to_sign', label: 'Solve Math Equation' },
  { id: 'true_false', label: 'True or False' },
  { id: 'pecs', label: 'PECS' },
  { id: 'matching_type', label: 'Matching Type' },
  { id: 'completion', label: 'Sentence Completion' },
  { id: 'custom', label: 'Custom Activity Type...' },
];

const EMPTY_FORM: FormState = {
  category: 'numbers',
  difficulty: 'easy',
  type: 'sign_to_text',
  customType: '',
  level: 'numbers_easy_1',
  question_text: 'What number is this sign?',
  correctAnswerIndex: 0,
  options: ['', '', '', ''],
  image_url: '',
};

function parseDifficultyLabel(levelStr?: string): { label: string; color: string } {
  if (!levelStr) return { label: 'Easy', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const lower = levelStr.toLowerCase();
  if (lower.includes('hard')) return { label: 'Hard', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (lower.includes('medium')) return { label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Easy', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

function resolveImagePath(rawPath?: string): string[] {
  if (!rawPath) return [];
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('blob:') || rawPath.startsWith('data:')) {
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

function ActivityImageCard({
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
      <div className="h-36 w-full bg-[#FAF6EE] border border-[#F5E6C4] rounded-2xl flex flex-col items-center justify-center p-3 text-center">
        <div className="h-10 w-10 rounded-full bg-[#F2B33D]/20 text-[#521903] flex items-center justify-center font-black text-lg mb-1">
          {correctAnswer || (category ? category.slice(0, 2).toUpperCase() : '?')}
        </div>
        <span className="text-[10px] font-bold text-slate-400 truncate max-w-full px-2">
          {imageUrl ? imageUrl.replace(/^.*[\\/]/, '') : 'No Image'}
        </span>
      </div>
    );
  }

  return (
    <div className="h-36 w-full bg-[#FAF6EE] border border-[#F5E6C4]/60 rounded-2xl flex items-center justify-center p-2 overflow-hidden shadow-inner relative group">
      <img
        src={currentSrc}
        alt="Activity Sign"
        className="max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
        onError={() => setErrorIndex((prev) => prev + 1)}
      />
    </div>
  );
}

function OptionDisplay({
  option,
  index,
  isCorrect,
}: {
  option: string;
  index: number;
  isCorrect: boolean;
}) {
  const [errorIndex, setErrorIndex] = useState(0);

  const isImageOption = useMemo(() => {
    if (!option) return false;
    const lower = option.toLowerCase();
    return (
      lower.includes('assets/') ||
      lower.includes('pictures/') ||
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('blob:') ||
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
    const displayText = isImageOption ? `Choice ${String.fromCharCode(65 + index)}` : option;

    return (
      <div
        className={`p-2.5 rounded-2xl text-center font-bold text-xs border flex items-center justify-center gap-1.5 min-h-[44px] transition-all shadow-sm ${
          isCorrect
            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-black ring-2 ring-emerald-400/30'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3] flex-shrink-0" />}
        <span className="truncate">{displayText || `Option ${index + 1}`}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 min-h-[76px] h-20 transition-all shadow-sm relative ${
        isCorrect
          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/40'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="h-12 w-full flex items-center justify-center relative">
        <img
          src={currentSrc}
          alt="Choice sign"
          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
          onError={() => setErrorIndex((prev) => prev + 1)}
        />
        {isCorrect && (
          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        )}
      </div>
      <span className="text-[10px] font-black text-slate-500">Choice {String.fromCharCode(65 + index)}</span>
    </div>
  );
}

function ContentManagementComponent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [screen, setScreen] = useState<ContentScreen>('dashboard');
  const [activeTab, setActiveTab] = useState<'live' | 'submissions'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Firestore Data
  const [activities, setActivities] = useState<PublishedActivityQuestion[]>([]);
  const [mySubmissions, setMySubmissions] = useState<ContentSubmission[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wizard State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [optionsMode, setOptionsMode] = useState<'text' | 'image'>('text');
  const [optionFiles, setOptionFiles] = useState<{ [index: number]: File }>({});

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deletion Request Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    item?: PublishedActivityQuestion;
    submissionId?: string;
    type: 'live_request' | 'submission';
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    setLoading(true);

    const unsubActivities = subscribeToAllActivities(
      (data) => {
        setActivities(data);
        setLoading(false);
      },
      (err) => {
        setError(err?.message || 'Failed to load live activities.');
        setLoading(false);
      }
    );

    const unsubCategories = subscribeToCategories((cats) => {
      if (cats && cats.length > 0) {
        const combined = [...DEFAULT_CATEGORIES];
        cats.forEach((c) => {
          if (!combined.some((item) => item.name === c.name)) {
            combined.push(c);
          }
        });
        setCategories(combined);
      }
    });

    let unsubSubmissions = () => {};
    if (user?.id) {
      unsubSubmissions = getMyContentSubmissionsRealtime(user.id, (subs) => {
        setMySubmissions(subs);
      });
    }

    return () => {
      unsubActivities();
      unsubCategories();
      unsubSubmissions();
    };
  }, [user?.id]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const statusParam = searchParams.get('status');
    const submissionIdParam = searchParams.get('submissionId');

    if (tabParam === 'submissions') {
      setActiveTab('submissions');
    }
    if (statusParam && ['all', 'pending', 'approved', 'rejected'].includes(statusParam)) {
      setSubmissionStatusFilter(statusParam as any);
    }

    if (submissionIdParam && mySubmissions.length > 0 && screen === 'dashboard') {
      const target = mySubmissions.find((s) => s.id === submissionIdParam);
      if (target) {
        openEditSubmission(target);
      }
    }
  }, [searchParams, mySubmissions, screen]);

  useEffect(() => {
    if (!uploadedFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  const submissionCounts = useMemo(() => {
    return {
      all: mySubmissions.length,
      pending: mySubmissions.filter((s) => s.status === 'pending').length,
      approved: mySubmissions.filter((s) => s.status === 'approved').length,
      rejected: mySubmissions.filter((s) => s.status === 'rejected').length,
    };
  }, [mySubmissions]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchSearch =
        !searchQuery ||
        act.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.level?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategoryFilter === 'all' || act.category === selectedCategoryFilter;
      const matchDiff = selectedDifficultyFilter === 'all' || act.level?.toLowerCase().includes(selectedDifficultyFilter.toLowerCase());
      return matchSearch && matchCat && matchDiff;
    });
  }, [activities, searchQuery, selectedCategoryFilter, selectedDifficultyFilter]);

  const filteredSubmissions = useMemo(() => {
    return mySubmissions.filter((sub) => {
      const matchSearch =
        !searchQuery ||
        sub.questionText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.status?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategoryFilter === 'all' || sub.category === selectedCategoryFilter;
      const matchDiff = selectedDifficultyFilter === 'all' || sub.difficulty === selectedDifficultyFilter;
      const matchStatus = submissionStatusFilter === 'all' || sub.status === submissionStatusFilter;
      return matchSearch && matchCat && matchDiff && matchStatus;
    });
  }, [mySubmissions, searchQuery, selectedCategoryFilter, selectedDifficultyFilter, submissionStatusFilter]);

  const openNewQuestion = (prefillCat?: string) => {
    setEditingId(null);
    const cat = prefillCat || categories[0]?.name || 'numbers';
    setFormState({
      ...EMPTY_FORM,
      category: cat,
      level: `${cat}_easy_1`,
      correctAnswerIndex: 0,
    });
    setUploadedFile(null);
    setOptionFiles({});
    setOptionsMode('text');
    setSaveError(null);
    setScreen('wizard_question');
  };

  const openEditLiveQuestion = (item: PublishedActivityQuestion) => {
    setEditingId(item.id);
    const inferredDifficulty = item.level?.includes('hard')
      ? 'hard'
      : item.level?.includes('medium')
      ? 'medium'
      : 'easy';

    const optionsList = item.options?.length ? item.options : ['', '', '', ''];
    let correctIdx = optionsList.findIndex((opt) => opt === item.correct_answer);
    if (correctIdx === -1) correctIdx = 0;

    const hasImageOptions = optionsList.some(
      (opt) => opt.includes('assets/') || opt.includes('http') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('blob:')
    );

    setOptionsMode(hasImageOptions ? 'image' : 'text');
    setOptionFiles({});
    setFormState({
      category: item.category || 'numbers',
      difficulty: inferredDifficulty,
      type: item.type || 'sign_to_text',
      customType: '',
      level: item.level || `${item.category || 'numbers'}_${inferredDifficulty}_1`,
      question_text: item.question_text || '',
      correct_answer: item.correct_answer || optionsList[0] || '',
      correctAnswerIndex: correctIdx,
      options: optionsList,
      image_url: item.image_url || '',
      activityQuestionId: item.id,
    });
    setUploadedFile(null);
    setSaveError(null);
    setScreen('wizard_question');
  };

  const openEditSubmission = (sub: ContentSubmission) => {
    setEditingId(sub.id);
    const optionsList = sub.options?.length ? sub.options : ['', '', '', ''];
    let correctIdx = optionsList.findIndex((opt) => opt === sub.correctAnswer);
    if (correctIdx === -1) correctIdx = 0;

    const hasImageOptions = optionsList.some(
      (opt) => opt.includes('assets/') || opt.includes('http') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('blob:')
    );

    setOptionsMode(hasImageOptions ? 'image' : 'text');
    setOptionFiles({});
    setFormState({
      category: sub.category,
      difficulty: sub.difficulty,
      type: sub.type || 'sign_to_text',
      customType: '',
      level: sub.level || `${sub.category}_${sub.difficulty}_1`,
      question_text: sub.questionText,
      correct_answer: sub.correctAnswer || optionsList[0] || '',
      correctAnswerIndex: correctIdx,
      options: optionsList,
      image_url: sub.imageUrl || '',
      activityQuestionId: sub.activityQuestionId,
      submissionId: sub.id,
    });
    setUploadedFile(null);
    setSaveError(null);
    setScreen('wizard_question');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const label = newCatLabel.trim() || newCatName.trim();
      await createCategory(newCatName, label);
      setNewCatName('');
      setNewCatLabel('');
      setShowCategoryModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleOptionFileUpload = (index: number, file: File) => {
    setOptionFiles((prev) => ({ ...prev, [index]: file }));
    const localBlob = URL.createObjectURL(file);
    updateOptionValue(index, localBlob);
  };

  const handleSubmitForApproval = async () => {
    if (!formState.category) {
      setSaveError('Please select a category.');
      return;
    }
    if (!formState.question_text.trim()) {
      setSaveError('Please provide question text.');
      return;
    }

    const resolvedCorrectAnswer = formState.options[formState.correctAnswerIndex]?.trim();
    if (!resolvedCorrectAnswer) {
      setSaveError('Please mark a valid choice as the correct answer.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      let finalImageUrl = formState.image_url;

      if (uploadedFile) {
        finalImageUrl = await uploadActivityImage(uploadedFile);
      }

      const finalOptions = [...formState.options];
      for (let i = 0; i < finalOptions.length; i++) {
        if (optionFiles[i]) {
          finalOptions[i] = await uploadActivityImage(optionFiles[i]);
        }
      }

      const finalType = formState.type === 'custom' ? formState.customType || 'custom_activity' : formState.type;
      const finalCorrectAnswer = finalOptions[formState.correctAnswerIndex] || resolvedCorrectAnswer;

      const input = {
        category: formState.category,
        difficulty: formState.difficulty,
        type: finalType,
        level: formState.level,
        questionText: formState.question_text,
        correctAnswer: finalCorrectAnswer,
        options: finalOptions.filter((opt) => opt.trim() !== ''),
        imageUrl: finalImageUrl,
        activityQuestionId: formState.activityQuestionId,
      };

      if (formState.submissionId) {
        await updateContentSubmission(formState.submissionId, input, true);
      } else {
        await createContentSubmission(
          input,
          user?.id || 'teacher',
          user?.fullName || user?.name || 'Faculty Instructor',
          user?.email || '',
          true
        );
      }

      alert('Activity submitted! It is now pending Admin Approval.');
      setScreen('dashboard');
      setActiveTab('submissions');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to submit update for approval.');
    } finally {
      setSaving(false);
    }
  };

  // Submit Deletion Request to Admin Approval
  const handleConfirmDeleteRequest = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'live_request' && deleteTarget.item) {
        await requestActivityDeletion(
          deleteTarget.item,
          user?.id || 'teacher',
          user?.fullName || user?.name || 'Faculty Instructor',
          user?.email || ''
        );
        alert('Deletion request submitted! It is now pending Admin Approval.');
        setActiveTab('submissions');
      } else if (deleteTarget.type === 'submission' && deleteTarget.submissionId) {
        await deleteContentSubmission(deleteTarget.submissionId);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit deletion request.');
    } finally {
      setDeleting(false);
    }
  };

  const updateOptionValue = (index: number, val: string) => {
    if (saving) return;
    setFormState((prev) => {
      const next = [...prev.options];
      next[index] = val;
      return {
        ...prev,
        options: next,
        correct_answer: index === prev.correctAnswerIndex ? val : prev.correct_answer,
      };
    });
  };

  const addOptionField = () => {
    if (saving || formState.options.length >= 6) return;
    setFormState((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOptionField = (index: number) => {
    if (saving || formState.options.length <= 2) return;
    setFormState((prev) => {
      const nextOptions = prev.options.filter((_, i) => i !== index);
      let nextCorrectIndex = prev.correctAnswerIndex;
      if (nextCorrectIndex >= nextOptions.length) {
        nextCorrectIndex = nextOptions.length - 1;
      }
      return {
        ...prev,
        options: nextOptions,
        correctAnswerIndex: nextCorrectIndex,
        correct_answer: nextOptions[nextCorrectIndex] || '',
      };
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!saving) setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (saving) return;
    if (e.dataTransfer.files?.[0]) setUploadedFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="w-full flex flex-col p-2 lg:p-4 font-sans text-[#521903]">
      {/* 1. DASHBOARD VIEW */}
      {screen === 'dashboard' && (
        <div className="w-full flex flex-col gap-5 animate-fadeIn pb-6">
          {/* TOP BAR */}
          <div className="w-full bg-white rounded-3xl border border-[#F5E6C4] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-[#521903]">Activity Content Management</h1>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                Configure sign activities, edit questions, and submit changes for Admin review.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex items-center flex-1 md:w-60">
                <Search className="h-4 w-4 absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-[#F5E6C4] rounded-full text-xs bg-[#F5E6C4]/10 focus:outline-none focus:bg-white font-bold text-[#521903]"
                />
              </div>

              <button
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1.5 bg-white border-2 border-[#521903] text-[#521903] hover:bg-[#521903] hover:text-white font-black px-4 py-2 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <Tag className="h-3.5 w-3.5" />
                New Category
              </button>

              <button
                onClick={() => openNewQuestion()}
                className="inline-flex items-center gap-1.5 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black px-5 py-2.5 rounded-full text-xs uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                New Activity
              </button>
            </div>
          </div>

          {/* CATEGORIES GRID */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> Categories
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat) => {
                const count = activities.filter((a) => a.category === cat.name).length;
                const isSelected = selectedCategoryFilter === cat.name;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.name)}
                    className={`bg-white rounded-2xl border p-3 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-[#521903] ring-2 ring-[#521903]/20 bg-[#F5E6C4]/10'
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-12 w-full flex items-center justify-center mb-1">
                      {cat.imgUrl ? (
                        <img
                          src={cat.imgUrl}
                          alt={cat.label}
                          className="max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-[#521903] font-black text-xs uppercase">
                          {cat.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-black text-[#521903] truncate w-full">{cat.label}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {count} {count === 1 ? 'Activity' : 'Activities'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABS & DIFFICULTY FILTERS */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'live' ? 'bg-[#521903] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Live in App ({activities.length})
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'submissions'
                    ? 'bg-[#521903] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Approval Submissions ({mySubmissions.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Difficulty:</span>
              {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficultyFilter(diff)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                    selectedDifficultyFilter === diff
                      ? 'bg-[#F2B33D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: LIVE IN APP QUESTIONS */}
          {activeTab === 'live' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Published Mobile Questions ({filteredActivities.length})
                </h3>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  <p className="text-xs font-bold text-rose-700">{error}</p>
                </div>
              )}

              {!loading && filteredActivities.length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-100">
                  <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">No activity questions found.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredActivities.map((item) => {
                  const diffMeta = parseDifficultyLabel(item.level);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-200 text-[#B4790C]">
                            {item.category}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${diffMeta.color}`}>
                            {diffMeta.label}
                          </span>
                        </div>

                        <ActivityImageCard imageUrl={item.image_url} correctAnswer={item.correct_answer} category={item.category} />

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Prompt</span>
                          <p className="text-xs font-black text-[#521903]">{item.question_text || 'Solve:'}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Options</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {item.options?.map((opt, i) => (
                              <OptionDisplay key={i} index={i} option={opt} isCorrect={opt === item.correct_answer} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => openEditLiveQuestion(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-black text-[#521903] hover:underline cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[#F2B33D]" />
                          Edit Question
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ item, type: 'live_request' })}
                          className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Request Deletion from Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TEACHER SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> Status:
                  </span>
                  <button
                    onClick={() => setSubmissionStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      submissionStatusFilter === 'all' ? 'bg-[#521903] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({submissionCounts.all})
                  </button>
                  <button
                    onClick={() => setSubmissionStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      submissionStatusFilter === 'pending' ? 'bg-[#F2B33D] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Clock className="h-3 w-3" /> Pending ({submissionCounts.pending})
                  </button>
                  <button
                    onClick={() => setSubmissionStatusFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      submissionStatusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approved ({submissionCounts.approved})
                  </button>
                  <button
                    onClick={() => setSubmissionStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      submissionStatusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <XCircle className="h-3 w-3" /> Rejected ({submissionCounts.rejected})
                  </button>
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 text-xs font-bold text-slate-400">
                  No submissions matching the selected status.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredSubmissions.map((sub) => {
                    const isPending = sub.status === 'pending';
                    const isApproved = sub.status === 'approved';
                    const isRejected = sub.status === 'rejected';
                    const isDeleteAction = sub.submissionType === 'delete';
                    const diffMeta = parseDifficultyLabel(sub.level || sub.difficulty);

                    return (
                      <div key={sub.id} className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-50 border text-slate-600">
                              {sub.category}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isDeleteAction && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300">
                                  Deletion Request
                                </span>
                              )}
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
                                {isPending && <Clock className="h-3 w-3" />}
                                {isApproved && <CheckCircle2 className="h-3 w-3" />}
                                {isRejected && <XCircle className="h-3 w-3" />}
                                {sub.status}
                              </span>
                            </div>
                          </div>

                          <ActivityImageCard imageUrl={sub.imageUrl} correctAnswer={sub.correctAnswer} category={sub.category} />

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Prompt</span>
                            <p className="text-xs font-black text-[#521903]">{sub.questionText}</p>
                          </div>

                          {isRejected && sub.rejectionReason && (
                            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-700 font-medium">
                              <span className="font-bold block uppercase tracking-wider text-[9px] text-rose-500 mb-0.5">Admin Feedback:</span>
                              {sub.rejectionReason}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          {!isApproved && !isDeleteAction ? (
                            <button onClick={() => openEditSubmission(sub)} className="text-xs font-black text-[#521903] hover:underline cursor-pointer">
                              Edit & Resubmit
                            </button>
                          ) : isDeleteAction ? (
                            <span className="text-xs font-bold text-rose-600">Pending Admin Removal</span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600">Live in Mobile App</span>
                          )}
                          <button onClick={() => setDeleteTarget({ submissionId: sub.id, type: 'submission' })} className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. WIZARD STEP 1: BASE QUESTION */}
      {screen === 'wizard_question' && (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 animate-fadeIn pb-6">
          <div className="w-full bg-[#F2B33D] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => !saving && setScreen('dashboard')}
                disabled={saving}
                className="p-2 bg-white/20 hover:bg-white text-white hover:text-[#521903] rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4 stroke-[3]" />
              </button>
              <h2 className="text-sm font-black uppercase tracking-wider font-serif">
                {editingId ? 'Edit Activity Question' : 'Create Activity Question'}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black bg-black/10 px-3 py-1.5 rounded-xl border border-black/5">
              <span className="text-white underline underline-offset-4 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-200" /> 1. Question Base & Image
              </span>
              <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="opacity-60">2. Answer Options</span>
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl border border-slate-150 p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">Category</label>
                <div className="relative">
                  <select
                    value={formState.category}
                    disabled={saving}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        category: e.target.value,
                        level: `${e.target.value}_${formState.difficulty}_1`,
                      })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 pr-8 border-2 border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-bold text-xs disabled:opacity-50 capitalize cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">Difficulty</label>
                <div className="relative">
                  <select
                    value={formState.difficulty}
                    disabled={saving}
                    onChange={(e) => {
                      const diff = e.target.value as 'easy' | 'medium' | 'hard';
                      setFormState({
                        ...formState,
                        difficulty: diff,
                        level: `${formState.category}_${diff}_1`,
                      });
                    }}
                    className="w-full appearance-none px-3.5 py-2.5 pr-8 border-2 border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-bold text-xs capitalize disabled:opacity-50 cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">Activity Type</label>
                <div className="relative">
                  <select
                    value={formState.type}
                    disabled={saving}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const defaultOptions = selected === 'true_false' ? ['True', 'False'] : formState.options;
                      setFormState({ ...formState, type: selected, options: defaultOptions });
                      if (selected === 'text_to_sign' || selected === 'solve_to_sign') {
                        setOptionsMode('image');
                      }
                    }}
                    className="w-full appearance-none px-3.5 py-2.5 pr-8 border-2 border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {formState.type === 'custom' && (
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">
                  Specify Custom Activity Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. gesture_match, audio_to_sign"
                  value={formState.customType}
                  disabled={saving}
                  onChange={(e) => setFormState({ ...formState, customType: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-bold text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">
                Question Prompt Text
              </label>
              <input
                type="text"
                placeholder="e.g. What number is this sign? or Solve: 3 - 1 = ?"
                value={formState.question_text}
                disabled={saving}
                onChange={(e) => setFormState({ ...formState, question_text: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white text-slate-800 font-bold text-xs disabled:opacity-50"
              />
            </div>

            {/* Banner/Problem Image */}
            <div className="space-y-2">
              <label className="text-slate-400 uppercase tracking-widest text-[10px] font-black block">
                Problem / Banner Picture (Formula, Illustration, or Sign)
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-5 transition-all ${
                  isDragging
                    ? 'border-[#F2B33D] bg-[#FFFBEB]'
                    : filePreviewUrl
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                {filePreviewUrl ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="h-44 w-44 bg-white border-2 border-emerald-400 rounded-2xl p-2 shadow-lg flex items-center justify-center overflow-hidden">
                      <img src={filePreviewUrl} alt="New upload preview" className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full font-black text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> New Picture Staged
                    </span>
                  </div>
                ) : formState.image_url ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="h-44 w-44 bg-[#FAF6EE] border border-[#F5E6C4] rounded-2xl p-2 shadow-sm flex items-center justify-center overflow-hidden">
                      <ActivityImageCard imageUrl={formState.image_url} correctAnswer={formState.correct_answer} category={formState.category} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">Current Image Loaded</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <ImageIcon className="h-8 w-8 text-slate-400 mb-1" />
                    <p className="font-black text-slate-700 text-xs">Upload Banner / Problem Picture</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG, WEBP formats</p>
                  </div>
                )}

                <label className="mt-3.5 inline-flex items-center justify-center bg-white border-2 border-[#521903]/20 hover:border-[#521903] text-[#521903] font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm">
                  {filePreviewUrl ? 'Change Picture' : 'Browse Picture'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={saving}
                    accept=".jpeg,.png,.jpg,.webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setUploadedFile(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center w-full">
              <button
                onClick={() => setScreen('dashboard')}
                disabled={saving}
                className="bg-white border-2 border-slate-200 text-slate-600 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => setScreen('wizard_answers')}
                disabled={saving || !formState.category || !formState.question_text.trim()}
                className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-sm cursor-pointer"
              >
                Configure Answers
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. WIZARD STEP 2: ANSWER OPTIONS */}
      {screen === 'wizard_answers' && (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 animate-fadeIn pb-6">
          <div className="w-full bg-[#F2B33D] text-white p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => !saving && setScreen('wizard_question')}
                disabled={saving}
                className="p-2 bg-white/20 hover:bg-white text-white hover:text-[#521903] rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4 stroke-[3]" />
              </button>
              <h2 className="text-sm font-black uppercase tracking-wider font-serif">Configure Options & Answer</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black bg-black/10 px-3 py-1.5 rounded-xl border border-black/5">
              <span>1. Question Base & Image</span> <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="text-white underline underline-offset-4 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-200" /> 2. Answer Options
              </span>
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl border border-slate-150 p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <label className="text-slate-700 text-xs font-black uppercase tracking-wider block">
                  Multiple Choice Options Format
                </label>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Click the circle checkmark to designate the CORRECT answer.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setOptionsMode('text')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    optionsMode === 'text' ? 'bg-white text-[#521903] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Type className="h-3.5 w-3.5" /> Text Choices
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setOptionsMode('image')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    optionsMode === 'image' ? 'bg-white text-[#521903] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Image / Sign Choices
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Live Choice Layout Preview:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {formState.options.map((opt, i) => (
                  <OptionDisplay key={i} index={i} option={opt} isCorrect={i === formState.correctAnswerIndex} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {formState.options.map((opt, idx) => {
                const isChecked = idx === formState.correctAnswerIndex;
                const isImage = optionsMode === 'image' || opt.startsWith('blob:') || opt.startsWith('http') || opt.includes('assets/');

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-3.5 transition-all ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300/40'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setFormState({ ...formState, correctAnswerIndex: idx, correct_answer: opt })}
                      title="Set as correct answer"
                      className={`flex-shrink-0 h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300/40'
                          : 'border-slate-300 bg-white hover:border-slate-400 text-transparent'
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>

                    {isImage && (
                      <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
                        {opt ? (
                          <img
                            src={resolveImagePath(opt)[0] || opt}
                            alt={`Option ${idx + 1}`}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 w-full flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          disabled={saving}
                          placeholder={isImage ? `Option ${idx + 1} Image Identifier or Label` : `Option ${idx + 1} Text Value`}
                          value={opt.startsWith('blob:') ? `Choice ${String.fromCharCode(65 + idx)} (Uploaded File)` : opt}
                          onChange={(e) => updateOptionValue(idx, e.target.value)}
                          className="w-full px-4 py-2 border-2 border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/30 text-slate-800 font-bold text-xs disabled:opacity-50"
                        />
                      </div>

                      {isImage && (
                        <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-slate-200 hover:border-[#521903] text-slate-700 font-black text-xs rounded-xl cursor-pointer shadow-sm flex-shrink-0">
                          <Upload className="h-3.5 w-3.5 text-[#F2B33D]" />
                          <span>{opt ? 'Replace Image' : 'Upload Image'}</span>
                          <input
                            type="file"
                            className="hidden"
                            disabled={saving}
                            accept=".jpeg,.png,.jpg,.webp"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleOptionFileUpload(idx, e.target.files[0]);
                            }}
                          />
                        </label>
                      )}

                      {formState.options.length > 2 && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeOptionField(idx)}
                          className="p-2 text-slate-300 hover:text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer disabled:opacity-40"
                          title="Remove option"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {formState.options.length < 6 && formState.type !== 'true_false' && (
              <button
                type="button"
                disabled={saving}
                onClick={addOptionField}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#521903] uppercase tracking-wider hover:opacity-80 cursor-pointer pt-0.5 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Add Choice Option
              </button>
            )}

            {saveError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-600">{saveError}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => !saving && setScreen('wizard_question')}
                disabled={saving}
                className="bg-white border-2 border-slate-200 text-slate-600 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40"
              >
                Back to Image Setup
              </button>

              <button
                onClick={handleSubmitForApproval}
                disabled={saving || !formState.options[formState.correctAnswerIndex]?.trim()}
                className="inline-flex items-center gap-2 bg-[#52B788] hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {editingId ? 'Update & Submit for Approval' : 'Submit for Admin Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#521903]">Add New Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. colors, animals, math"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Label</label>
                <input
                  type="text"
                  placeholder="e.g. Colors & Shapes"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={creatingCat || !newCatName.trim()} className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#F2B33D] hover:bg-[#D99A26] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {creatingCat && <Loader2 className="h-3 w-3 animate-spin" />}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETION REQUEST CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-sm rounded-3xl shadow-2xl text-center space-y-4 border border-slate-100">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                {deleteTarget.type === 'live_request' ? 'Request Deletion from Admin' : 'Delete Submission Draft'}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                {deleteTarget.type === 'live_request'
                  ? 'This question will be submitted to the Admin for approval before it is removed from the mobile app.'
                  : 'Are you sure you want to delete this submission?'}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-xs font-black text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteRequest}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleteTarget.type === 'live_request' ? 'Submit Deletion Request' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentManagementPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-96 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#521903]" />
        </div>
      }
    >
      <ContentManagementComponent />
    </Suspense>
  );
}