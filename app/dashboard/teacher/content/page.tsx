'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  X,
  Send,
  Tag,
  Layers,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Type,
  ChevronDown,
  Play,
  Camera,
  VideoOff,
  Zap,
  Smartphone,
  Save,
  BookOpen,
  Trophy,
  ArrowRightLeft,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  PublishedActivityQuestion,
  ActivityCategory,
  ContentSubmission,
  TutorialLesson,
  GestureTrainingData,
  DEFAULT_TUTORIAL_LESSONS,
  CONTENT_CATEGORIES,
  subscribeToAllActivities,
  subscribeToCategories,
  subscribeToGestureTrainingData,
  subscribeToCustomTutorialLessons,
  createTutorialLesson,
  submitGestureParametersForApproval,
  getMyContentSubmissionsRealtime,
  createCategory,
  createContentSubmission,
  updateContentSubmission,
  requestActivityDeletion,
  deleteContentSubmission,
  uploadActivityImage,
} from '@/lib/content-service';

// Real MediaPipe detection + smoothed orientation + take-based LSTM sequence capture/scoring
import { getHandLandmarker, detectHandsInFrame, type Landmark } from '@/lib/hand-landmarker';
import {
  computeHandOrientation,
  computeFramingQuality,
  landmarksToFeatureVector,
  type HandOrientation,
  type FramingQuality,
} from '@/lib/posture-metrics';
import { MultiChannelSmoother } from '@/lib/signal-smoothing';
import {
  loadGestureSequenceModel,
  isGestureModelReady,
  FrameSequenceBuffer,
  predictGesture,
  type GesturePrediction,
} from '@/lib/gesture-sequence-model';
import { matchGestureTemplate, type TemplateMatchResult } from '@/lib/gesture-template-match';
import { GestureRecordingSession } from '@/lib/gesture-recording-session';

type ContentScreen = 'dashboard' | 'wizard_question' | 'wizard_answers';
type CategoryWorkspaceTab = 'tutorials_practice' | 'activity_levels';
type SimulatorMode = 'tutorial' | 'practice' | 'continuous' | 'train';

interface FormState {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  customType?: string;
  level: string;
  question_text: string;
  correctAnswerIndex: number;
  correct_answer?: string;
  options: string[];
  image_url: string;
  activityQuestionId?: string;
  submissionId?: string;
}

const ACTIVITY_TYPES = [
  { id: 'sign_to_text', label: 'Sign to Text (Level 1)' },
  { id: 'text_to_sign', label: 'Text to Sign (Level 2)' },
  { id: 'solve_to_sign', label: 'Math / Word Complete (Level 3)' },
  { id: 'multiple_choice', label: 'Multiple Choice (Standard)' },
  { id: 'fill_in_the_blank', label: 'Fill in the Blanks / Word Completion' },
  { id: 'true_false', label: 'True or False' },
  { id: 'matching_type', label: 'Matching Pairs' },
  { id: 'sequence_order', label: 'Sequence / Ordering' },
  { id: 'pecs', label: 'Picture Exchange (PECS)' },
  { id: 'custom', label: 'Custom Activity Type...' },
];

const EMPTY_FORM: FormState = {
  category: 'alphabet',
  difficulty: 'easy',
  type: 'sign_to_text',
  customType: '',
  level: 'alphabet_easy_1',
  question_text: 'What letter is this sign?',
  correctAnswerIndex: 0,
  correct_answer: '',
  options: ['', '', '', ''],
  image_url: '',
};

const DETECTION_INTERVAL_MS = 120; // ~8 detections/sec — plenty for landmark tracking
const ORIENTATION_SMOOTHING_ALPHA = 0.25; // lower = smoother/slower, higher = more responsive/jittery
const REQUIRED_TAKES = 15; // how many full-sequence repetitions of a sign we want per dataset

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
      <div className="h-32 w-full bg-[#FAF6EE] border border-[#F5E6C4] rounded-2xl flex flex-col items-center justify-center p-3 text-center">
        <div className="h-9 w-9 rounded-full bg-[#F2B33D]/20 text-[#521903] flex items-center justify-center font-black text-base mb-1">
          {correctAnswer || (category ? category.slice(0, 2).toUpperCase() : '?')}
        </div>
        <span className="text-[10px] font-bold text-slate-400 truncate max-w-full px-2">
          {imageUrl ? imageUrl.replace(/^.*[\\/]/, '') : 'No Image'}
        </span>
      </div>
    );
  }

  return (
    <div className="h-32 w-full bg-[#FAF6EE] border border-[#F5E6C4]/60 rounded-2xl flex items-center justify-center p-2 overflow-hidden shadow-inner relative group">
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
        className={`p-2 rounded-xl text-center font-bold text-xs border flex items-center justify-center gap-1 min-h-[38px] transition-all shadow-sm ${
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
      className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 min-h-[60px] h-16 transition-all shadow-sm relative ${
        isCorrect
          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/40'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="h-10 w-full flex items-center justify-center relative">
        <img
          src={currentSrc}
          alt="Choice sign"
          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
          onError={() => setErrorIndex((prev) => prev + 1)}
        />
        {isCorrect && (
          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
            <Check className="h-2.5 w-2.5 stroke-[3]" />
          </div>
        )}
      </div>
      <span className="text-[9px] font-black text-slate-500">Choice {String.fromCharCode(65 + index)}</span>
    </div>
  );
}

function ContentManagementComponent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [screen, setScreen] = useState<ContentScreen>('dashboard');
  const [activeCategory, setActiveCategory] = useState<string>('alphabet');
  const [workspaceTab, setWorkspaceTab] = useState<CategoryWorkspaceTab>('tutorials_practice');
  const [activeTab, setActiveTab] = useState<'live' | 'submissions'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Firestore Live Data
  const [activities, setActivities] = useState<PublishedActivityQuestion[]>([]);
  const [mySubmissions, setMySubmissions] = useState<ContentSubmission[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [gestureTrainingList, setGestureTrainingList] = useState<GestureTrainingData[]>([]);
  const [customLessons, setCustomLessons] = useState<TutorialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile Lesson Simulator & Tracking
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null);
  const [simulatorMode, setSimulatorMode] = useState<SimulatorMode>('tutorial');
  const [cameraActive, setCameraActive] = useState(false);
  const [trainingSaving, setTrainingSaving] = useState(false);

  // Real-time model readiness + smoothed orientation / framing + take-based gesture recording
  const [modelsReady, setModelsReady] = useState({ landmarker: false, gestureModel: false });
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [liveOrientation, setLiveOrientation] = useState<HandOrientation>({ rollDeg: 0, pitchDeg: 0, yawDeg: 0 });
  const [liveFraming, setLiveFraming] = useState<FramingQuality>({ distance: 0, switchHands: 0 });
  const [handDetected, setHandDetected] = useState(false);
  const [isRecordingTake, setIsRecordingTake] = useState(false);
  const [takesCaptured, setTakesCaptured] = useState(0);
  const [captureComplete, setCaptureComplete] = useState(false);
  const [livePrediction, setLivePrediction] = useState<GesturePrediction | null>(null);
  const [templateMatch, setTemplateMatch] = useState<TemplateMatchResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sequenceBufferRef = useRef<FrameSequenceBuffer>(new FrameSequenceBuffer());
  const captureSessionRef = useRef<GestureRecordingSession>(new GestureRecordingSession(REQUIRED_TAKES));
  const orientationSmootherRef = useRef<MultiChannelSmoother<'roll' | 'pitch' | 'yaw'>>(
    new MultiChannelSmoother(['roll', 'pitch', 'yaw'], ORIENTATION_SMOOTHING_ALPHA)
  );

  // Form Wizard State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [optionsMode, setOptionsMode] = useState<'text' | 'image'>('text');
  const [optionFiles, setOptionFiles] = useState<{ [index: number]: File }>({});

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New Tutorial Sign Modal State
  const [showNewSignModal, setShowNewSignModal] = useState(false);
  const [newSignSymbol, setNewSignSymbol] = useState('');
  const [newSignTitle, setNewSignTitle] = useState('');
  const [newSignDesc, setNewSignDesc] = useState('');
  const [newSignImg, setNewSignImg] = useState('');
  const [newSignFile, setNewSignFile] = useState<File | null>(null);
  const [newSignPreviewUrl, setNewSignPreviewUrl] = useState<string | null>(null);
  const [isSignImgDragging, setIsSignImgDragging] = useState(false);
  const [creatingSign, setCreatingSign] = useState(false);

  // Deletion Request Confirmation
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
        setCategories(cats);
      } else {
        setCategories(
          CONTENT_CATEGORIES.map((c) => ({
            id: c.value,
            name: c.value,
            label: c.label,
            imgUrl: c.imgUrl,
          }))
        );
      }
    });

    let unsubSubmissions = () => {};
    if (user?.id) {
      unsubSubmissions = getMyContentSubmissionsRealtime(user.id, (subs) => {
        setMySubmissions(subs);
      });
    }

    const unsubGestureData = subscribeToGestureTrainingData(activeCategory, (list) => {
      setGestureTrainingList(list);
    });

    const unsubCustomLessons = subscribeToCustomTutorialLessons(activeCategory, (list) => {
      setCustomLessons(list);
    });

    return () => {
      unsubActivities();
      unsubCategories();
      unsubSubmissions();
      unsubGestureData();
      unsubCustomLessons();
    };
  }, [user?.id, activeCategory]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const statusParam = searchParams.get('status');
    const submissionIdParam = searchParams.get('submissionId');

    if (tabParam === 'submissions') setActiveTab('submissions');
    if (statusParam && ['all', 'pending', 'approved', 'rejected'].includes(statusParam)) {
      setSubmissionStatusFilter(statusParam as any);
    }
    if (submissionIdParam && mySubmissions.length > 0 && screen === 'dashboard') {
      const target = mySubmissions.find((s) => s.id === submissionIdParam);
      if (target) openEditSubmission(target);
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

  useEffect(() => {
    if (!newSignFile) {
      setNewSignPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(newSignFile);
    setNewSignPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newSignFile]);

  // Load ML Models
  useEffect(() => {
    let cancelled = false;

    getHandLandmarker()
      .then(() => {
        if (!cancelled) setModelsReady((prev) => ({ ...prev, landmarker: true }));
      })
      .catch((err) => {
        console.error('Failed to load hand landmarker:', err);
        if (!cancelled) setModelLoadError('Hand tracking failed to load. Check your connection and refresh.');
      });

    loadGestureSequenceModel()
      .then(() => {
        if (!cancelled) setModelsReady((prev) => ({ ...prev, gestureModel: true }));
      })
      .catch((err) => {
        // Non-fatal: posture guidance still works without the LSTM classifier,
        // it just won't be able to score sign/phrase correctness on its own —
        // the DTW template-match fallback below still provides scoring once a
        // reference sample has been approved.
        console.warn('Gesture LSTM model unavailable — template-match fallback active:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Webcam activation + REAL per-frame detection (smoothed orientation, framing,
  // LSTM prediction, DTW template-match fallback, and take-based gesture recording)
  useEffect(() => {
    if (selectedLessonIndex === null || !(simulatorMode === 'practice' || simulatorMode === 'continuous' || simulatorMode === 'train')) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      sequenceBufferRef.current.clear();
      orientationSmootherRef.current.reset();
      setLivePrediction(null);
      setTemplateMatch(null);
      setHandDetected(false);
      return;
    }

    // Fresh recording session each time Train mode is (re)entered so a
    // previous lesson's progress never bleeds into this one.
    if (simulatorMode === 'train') {
      captureSessionRef.current = new GestureRecordingSession(REQUIRED_TAKES);
      setTakesCaptured(0);
      setCaptureComplete(false);
      setIsRecordingTake(false);
    }

    let detectionInterval: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 400, height: 400, facingMode: 'user' } })
      .then((stream) => {
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);

        detectionInterval = setInterval(async () => {
          if (!videoRef.current || !modelsReady.landmarker) return;
          const targetLesson = currentLessons[selectedLessonIndex];
          if (!targetLesson) return;

          try {
            const landmarker = await getHandLandmarker();
            const result = detectHandsInFrame(landmarker, videoRef.current, performance.now());

            const landmarksPerHand: Landmark[][] = result
              ? result.landmarks.map((hand) => hand.map((p) => ({ x: p.x, y: p.y, z: p.z })))
              : [];

            setHandDetected(landmarksPerHand.length > 0);

            if (landmarksPerHand.length === 0) {
              return;
            }

            const expectedHands = (targetLesson as any).expectedHands ?? 1;
            const framing = computeFramingQuality(landmarksPerHand, expectedHands);
            setLiveFraming(framing);

            // Raw orientation, then smoothed — this is what fixes the
            // "metrics randomly move" jitter: we display/act on the
            // smoothed values, not the raw per-frame estimate.
            const rawOrientation = computeHandOrientation(landmarksPerHand[0]);
            const smoothed = orientationSmootherRef.current.update({
              roll: rawOrientation.rollDeg,
              pitch: rawOrientation.pitchDeg,
              yaw: rawOrientation.yawDeg,
            });
            const orientation: HandOrientation = {
              rollDeg: smoothed.roll,
              pitchDeg: smoothed.pitch,
              yawDeg: smoothed.yaw,
            };
            setLiveOrientation(orientation);

            // Rolling buffer of the last SEQUENCE_LENGTH frames — always
            // tracked regardless of mode, so a "Stop & Save" click during
            // Train mode captures the motion leading up to that moment,
            // and Practice/Continuous can run live LSTM prediction off it.
            const featureVector = landmarksToFeatureVector(landmarksPerHand);
            sequenceBufferRef.current.push(featureVector);

            if (isGestureModelReady()) {
              const prediction = predictGesture(sequenceBufferRef.current, targetLesson.symbol);
              if (prediction) setLivePrediction(prediction);
            }

            // DTW template-match fallback: gives real correctness feedback
            // from the very first approved training sample, no LSTM
            // training required. Runs independently of the LSTM above.
            const referenceSequences = (activeTrainingDoc as any)?.trainingSequences as
              | number[][][]
              | undefined;
            if (sequenceBufferRef.current.isFull() && referenceSequences?.length) {
              const match = matchGestureTemplate(sequenceBufferRef.current.snapshot(), referenceSequences);
              setTemplateMatch(match);
            }
          } catch (err) {
            console.error('Detection frame error:', err);
          }
        }, DETECTION_INTERVAL_MS);
      })
      .catch((err) => {
        console.warn('Camera access unavailable:', err);
        setCameraActive(false);
      });

    return () => {
      disposed = true;
      if (detectionInterval) clearInterval(detectionInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLessonIndex, simulatorMode, modelsReady.landmarker]);

  const currentLessons: TutorialLesson[] = useMemo(() => {
    const defaults = DEFAULT_TUTORIAL_LESSONS[activeCategory] || [];
    const combined = [...defaults];
    customLessons.forEach((custom) => {
      if (!combined.some((item) => item.symbol.toLowerCase() === custom.symbol.toLowerCase() || item.id === custom.id)) {
        combined.push(custom);
      }
    });
    return combined;
  }, [activeCategory, customLessons]);

  const activeLesson = selectedLessonIndex !== null ? currentLessons[selectedLessonIndex] : null;

  const activeTrainingDoc = useMemo(() => {
    if (!activeLesson) return null;
    return gestureTrainingList.find(
      (g) => g.gestureKey.toLowerCase() === activeLesson.symbol.toLowerCase()
    );
  }, [activeLesson, gestureTrainingList]);

  /** Snapshots the current rolling buffer as one completed take. */
  const handleSaveTake = () => {
    if (!sequenceBufferRef.current.isFull()) {
      alert('Keep signing for about a second — not enough frames captured yet.');
      return;
    }
    captureSessionRef.current.addTake(sequenceBufferRef.current.snapshot());
    const newCount = captureSessionRef.current.totalCaptured();
    setTakesCaptured(newCount);
    setCaptureComplete(captureSessionRef.current.isComplete);
    setIsRecordingTake(false);
    sequenceBufferRef.current.clear();
  };

  const handleSaveTrainingSample = async () => {
    if (!activeLesson) return;
    const session = captureSessionRef.current;
    const takes = session.getAllTakes();

    if (takes.length < 1) {
      alert('Record at least one take before submitting.');
      return;
    }
    if (!session.isComplete) {
      if (
        !confirm(
          `Only ${takes.length}/${REQUIRED_TAKES} takes captured. Submit anyway with partial data?`
        )
      ) {
        return;
      }
    }

    setTrainingSaving(true);
    try {
      await submitGestureParametersForApproval(
        activeLesson.symbol,
        activeLesson.category,
        activeLesson.displayTitle,
        activeLesson.imageUrl,
        { rotate: 100, tilt: 100, distance: liveFraming.distance, switchHands: liveFraming.switchHands },
        user?.id || 'teacher',
        user?.fullName || user?.name || 'Faculty Trainer',
        user?.email || '',
        takes // number[][][] — one entry per take, each a full temporal sequence for LSTM retraining
      );
      alert(
        `Gesture training dataset for "${activeLesson.displayTitle}" submitted for Admin Approval! It will sync to the mobile app once approved.`
      );
      captureSessionRef.current = new GestureRecordingSession(REQUIRED_TAKES);
      setTakesCaptured(0);
      setCaptureComplete(false);
      setIsRecordingTake(false);
      setSelectedLessonIndex(null);
      setActiveTab('submissions');
      setWorkspaceTab('activity_levels');
    } catch (err: any) {
      alert(err?.message || 'Failed to submit gesture training parameters.');
    } finally {
      setTrainingSaving(false);
    }
  };

  const handleCreateNewTutorialSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSignSymbol.trim()) return;
    setCreatingSign(true);
    try {
      let finalImgUrl = newSignImg.trim();
      if (newSignFile) {
        finalImgUrl = await uploadActivityImage(newSignFile);
      }

      await createTutorialLesson(
        activeCategory,
        newSignSymbol,
        newSignTitle || newSignSymbol,
        newSignDesc,
        finalImgUrl,
        user?.id || 'teacher',
        user?.fullName || user?.name || 'Faculty Member'
      );
      alert(`Sign '${newSignSymbol}' added to ${activeCategory.toUpperCase()} module! You can now start training its gesture data.`);
      setShowNewSignModal(false);
      setNewSignSymbol('');
      setNewSignTitle('');
      setNewSignDesc('');
      setNewSignImg('');
      setNewSignFile(null);
      setNewSignPreviewUrl(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to create tutorial sign.');
    } finally {
      setCreatingSign(false);
    }
  };

  const categoryActivitiesCount = useMemo(() => {
    return activities.filter((act) => act.category === activeCategory).length;
  }, [activities, activeCategory]);

  const categorySubmissionsCount = useMemo(() => {
    return mySubmissions.filter((sub) => sub.category === activeCategory).length;
  }, [mySubmissions, activeCategory]);

  const submissionCounts = useMemo(() => {
    const catSubs = mySubmissions.filter((s) => s.category === activeCategory);
    return {
      all: catSubs.length,
      pending: catSubs.filter((s) => s.status === 'pending').length,
      approved: catSubs.filter((s) => s.status === 'approved').length,
      rejected: catSubs.filter((s) => s.status === 'rejected').length,
    };
  }, [mySubmissions, activeCategory]);

  const globalSubmissionCounts = useMemo(() => {
    return {
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
        act.level?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = act.category === activeCategory;
      const matchDiff = selectedDifficultyFilter === 'all' || act.level?.toLowerCase().includes(selectedDifficultyFilter.toLowerCase());
      return matchSearch && matchCat && matchDiff;
    });
  }, [activities, searchQuery, activeCategory, selectedDifficultyFilter]);

  const filteredSubmissions = useMemo(() => {
    const catSubs = mySubmissions.filter((s) => s.category === activeCategory);
    return catSubs.filter((sub) => {
      const matchSearch =
        !searchQuery ||
        sub.questionText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.status?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiff = selectedDifficultyFilter === 'all' || sub.difficulty === selectedDifficultyFilter;
      const matchStatus = submissionStatusFilter === 'all' || sub.status === submissionStatusFilter;
      return matchSearch && matchDiff && matchStatus;
    });
  }, [mySubmissions, activeCategory, searchQuery, selectedDifficultyFilter, submissionStatusFilter]);

  // Derived Template Flags for Activity Wizards
  const isMatchingType = formState.type === 'matching_type';
  const isTrueFalse = formState.type === 'true_false';
  const isSequenceOrder = formState.type === 'sequence_order';
  const isFillInBlank = formState.type === 'fill_in_the_blank';
  const isStandardMCQ = !isMatchingType && !isTrueFalse && !isSequenceOrder && !isFillInBlank;

  const openNewQuestion = () => {
    setEditingId(null);
    setFormState({
      ...EMPTY_FORM,
      category: activeCategory,
      level: `${activeCategory}_easy_1`,
      correctAnswerIndex: 0,
      correct_answer: '',
      type: 'sign_to_text',
      options: ['', '', '', ''],
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
      category: item.category || activeCategory,
      difficulty: inferredDifficulty,
      type: item.type || 'sign_to_text',
      customType: '',
      level: item.level || `${item.category || activeCategory}_${inferredDifficulty}_1`,
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
      await createCategory(newCatName, newCatLabel || newCatName);
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
    if (isMatchingType) {
      const parts = formState.options[index]?.split('|||') || ['', ''];
      updateOptionValue(index, `${localBlob}|||${parts[1] || ''}`);
    } else {
      updateOptionValue(index, localBlob);
    }
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

    let finalCorrectAnswer = formState.options[formState.correctAnswerIndex]?.trim();

    if (isMatchingType) {
      const validPairs = formState.options.filter(o => {
        const [l, r] = o.split('|||');
        return l?.trim() && r?.trim();
      });
      if (validPairs.length < 2) {
        setSaveError('Please provide at least two complete matching pairs.');
        return;
      }
      finalCorrectAnswer = 'MATCHING_SET';
    } else if (isSequenceOrder) {
      const validSteps = formState.options.filter(o => o.trim() !== '');
      if (validSteps.length < 2) {
        setSaveError('Please provide at least two steps for the sequence.');
        return;
      }
      finalCorrectAnswer = 'SEQUENCE_SET';
    } else if (isFillInBlank) {
      if (!formState.correct_answer?.trim()) {
        setSaveError('Please provide the Target Word / Pattern for the blanks.');
        return;
      }
      finalCorrectAnswer = formState.correct_answer;
    } else {
      if (!finalCorrectAnswer) {
        setSaveError('Please specify the correct answer.');
        return;
      }
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
          const uploadedOptUrl = await uploadActivityImage(optionFiles[i]);
          if (isMatchingType) {
            const parts = finalOptions[i].split('|||');
            finalOptions[i] = `${uploadedOptUrl}|||${parts[1] || ''}`;
          } else {
            finalOptions[i] = uploadedOptUrl;
          }
        }
      }

      const finalType = formState.type === 'custom' ? formState.customType || 'custom_activity' : formState.type;

      let finalCorrectAnswerVal = finalCorrectAnswer;
      if (isMatchingType) finalCorrectAnswerVal = 'MATCHING_SET';
      if (isSequenceOrder) finalCorrectAnswerVal = 'SEQUENCE_SET';
      if (isFillInBlank) finalCorrectAnswerVal = formState.correct_answer || 'BLANK_SET';
      if (isStandardMCQ || isTrueFalse) finalCorrectAnswerVal = finalOptions[formState.correctAnswerIndex] || finalCorrectAnswer;

      const input = {
        category: formState.category,
        difficulty: formState.difficulty,
        type: finalType,
        level: formState.level,
        questionText: formState.question_text,
        correctAnswer: finalCorrectAnswerVal,
        options: finalOptions.filter((opt) => opt.trim() !== '' && opt.trim() !== '|||'),
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
      setWorkspaceTab('activity_levels');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to submit update for approval.');
    } finally {
      setSaving(false);
    }
  };

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
        setWorkspaceTab('activity_levels');
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
        correct_answer: (isMatchingType || isSequenceOrder || isFillInBlank) ? prev.correct_answer : (index === prev.correctAnswerIndex ? val : (prev.correct_answer || '')),
      };
    });
  };

  const addOptionField = () => {
    if (saving || formState.options.length >= 8) return;
    setFormState((prev) => ({
      ...prev,
      options: [...prev.options, isMatchingType ? '|||' : '']
    }));
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
        correct_answer: (isMatchingType || isSequenceOrder || isFillInBlank) ? prev.correct_answer : (nextOptions[nextCorrectIndex] || ''),
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
      {/* 1. UNIFIED CATEGORY WORKSPACE DASHBOARD */}
      {screen === 'dashboard' && (
        <div className="w-full flex flex-col gap-5 animate-fadeIn pb-6">
          {/* Top Bar */}
          <div className="w-full bg-white rounded-3xl border border-[#F5E6C4] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-[#521903]">
                Module Content Management
              </h1>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                Manage each learning category&apos;s tutorial lessons, real-time practice gestures, and graded activity roadmaps.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1.5 bg-white border-2 border-[#521903] text-[#521903] hover:bg-[#521903] hover:text-white font-black px-4 py-2 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <Tag className="h-3.5 w-3.5" />
                New Category
              </button>
            </div>
          </div>

          {/* GLOBAL SUBMISSIONS OVERVIEW (NEW) */}
          <div className="w-full">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-2">
              <Clock className="h-4 w-4" /> Global Submission Status
            </h2>
            <div className="grid grid-cols-3 gap-3.5">
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
                <Clock className="h-6 w-6 text-amber-500 mb-1" />
                <span className="text-2xl font-black text-amber-700">{globalSubmissionCounts.pending}</span>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Approval</span>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                <span className="text-2xl font-black text-emerald-700">{globalSubmissionCounts.approved}</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Approved Content</span>
              </div>
              <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
                <XCircle className="h-6 w-6 text-rose-500 mb-1" />
                <span className="text-2xl font-black text-rose-700">{globalSubmissionCounts.rejected}</span>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Action Required (Rejected)</span>
              </div>
            </div>
          </div>

          {/* CATEGORIES PICKER */}
          <div className="w-full space-y-2 mt-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Layers className="h-4 w-4" /> Learning Modules
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {categories.map((cat) => {
                const count = activities.filter((a) => a.category === cat.name).length;
                const isSelected = activeCategory === cat.name;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.name);
                      setSelectedLessonIndex(null);
                    }}
                    className={`bg-white rounded-3xl border-2 p-4 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-[#521903] ring-2 ring-[#521903]/20 bg-[#FAF6EE]'
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-14 w-full flex items-center justify-center mb-1">
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
                        <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-[#521903] font-black text-sm uppercase">
                          {cat.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-black text-[#521903] truncate w-full">{cat.label}</span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {count} Activities Available
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!modelsReady.gestureModel && !modelLoadError && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-4 py-2 rounded-2xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading gesture recognition model — sign/phrase scoring will activate automatically once ready.
            </div>
          )}
          {modelLoadError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-4 py-2 rounded-2xl">
              <AlertTriangle className="h-3.5 w-3.5" />
              {modelLoadError}
            </div>
          )}

          {/* ACTIVE CATEGORY WORKSPACE CONTAINER */}
          <div className="bg-white rounded-3xl border border-[#F5E6C4] p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 text-[#521903] rounded-xl text-xs font-black uppercase tracking-wider">
                  {activeCategory.toUpperCase()} Module
                </span>
                <p className="text-xs font-bold text-slate-400">
                  {workspaceTab === 'tutorials_practice' ? 'Tutorials & Practice Gesture Recognition' : 'Graded Activity Roadmap Levels'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setWorkspaceTab('tutorials_practice')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    workspaceTab === 'tutorials_practice' ? 'bg-[#F2B33D] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" /> 1. Tutorials & Practice ({currentLessons.length})
                </button>
                <button
                  onClick={() => setWorkspaceTab('activity_levels')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    workspaceTab === 'activity_levels' ? 'bg-[#521903] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5" /> 2. Activity Quizzes ({categoryActivitiesCount})
                </button>
              </div>
            </div>

            {/* TAB 1: TUTORIALS & PRACTICE GESTURES */}
            {workspaceTab === 'tutorials_practice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-[#F2B33D]" /> Mobile Tutorial List & Real-time Practice ({currentLessons.length} Signs)
                  </h3>

                  <button
                    onClick={() => setShowNewSignModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#521903] hover:bg-[#3B1102] text-white font-black px-4 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Tutorial Sign
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {currentLessons.map((lesson, idx) => {
                    const trainingInfo = gestureTrainingList.find(
                      (g) => g.gestureKey.toLowerCase() === lesson.symbol.toLowerCase()
                    );

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setSelectedLessonIndex(idx);
                          setSimulatorMode('tutorial');
                        }}
                        className="bg-white rounded-3xl border-2 border-[#F5E6C4] p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-[#F2B33D] transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-12 w-12 rounded-2xl bg-[#FAF6EE] border border-[#F5E6C4] flex items-center justify-center font-black text-xl text-[#521903] shadow-inner group-hover:scale-105 transition-transform flex-shrink-0">
                            {lesson.symbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-[#521903] truncate">{lesson.displayTitle}</h4>
                              {trainingInfo && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200 flex items-center gap-0.5 flex-shrink-0">
                                  <Check className="h-2.5 w-2.5" /> Trained
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-semibold truncate">{lesson.description || 'Instructional gesture'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLessonIndex(idx);
                              setSimulatorMode('train');
                            }}
                            className="px-2.5 py-1.5 bg-[#521903] hover:bg-[#3B1102] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Calibrate / Train Gesture Data"
                          >
                            <Camera className="h-3 w-3" /> Train
                          </button>

                          <div className="h-9 w-9 rounded-full bg-amber-50 border border-amber-200 text-[#F2B33D] group-hover:bg-[#F2B33D] group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: ACTIVITY ROADMAP QUIZZES */}
            {workspaceTab === 'activity_levels' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('live')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        activeTab === 'live' ? 'bg-[#521903] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Live Mobile Road ({categoryActivitiesCount})
                    </button>
                    <button
                      onClick={() => setActiveTab('submissions')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        activeTab === 'submissions'
                          ? 'bg-[#521903] text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Approval Submissions ({categorySubmissionsCount})
                    </button>
                  </div>

                  <button
                    onClick={openNewQuestion}
                    className="px-4 py-2 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Road Level Question
                  </button>
                </div>

                {/* Sub-Filters for Search & Difficulty within Activities tab */}
                <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                   <div className="relative flex-1 md:max-w-xs">
                     <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input
                       type="text"
                       placeholder="Search activities..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/30"
                     />
                   </div>
                   {activeTab === 'submissions' && (
                     <div className="flex items-center gap-1.5">
                       {['all', 'pending', 'approved', 'rejected'].map(st => (
                         <button
                           key={st}
                           onClick={() => setSubmissionStatusFilter(st as any)}
                           className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${submissionStatusFilter === st ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                         >
                           {st}
                         </button>
                       ))}
                     </div>
                   )}
                </div>

                {activeTab === 'live' && (
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
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                {item.type === 'matching_type' ? 'Match Pairs' : item.type === 'sequence_order' ? 'Sequence Items' : item.type === 'fill_in_the_blank' ? 'Word Pattern Options' : 'Options'}
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {item.type === 'matching_type' ? (
                                  <div className="col-span-2 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    {item.options.length} Matching Pairs configured
                                  </div>
                                ) : item.type === 'sequence_order' ? (
                                  <div className="col-span-2 text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    {item.options.length} Ordered Steps
                                  </div>
                                ) : (
                                  item.options?.map((opt, i) => (
                                    <OptionDisplay key={i} index={i} option={opt} isCorrect={item.type === 'fill_in_the_blank' ? false : opt === item.correct_answer} />
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => openEditLiveQuestion(item)}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-[#521903] hover:underline cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-[#F2B33D]" />
                              Edit Level
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
                    {filteredActivities.length === 0 && (
                       <div className="col-span-full py-12 text-center text-slate-400 font-bold text-xs border-2 border-dashed border-slate-200 rounded-3xl">
                         No activities found in this module.
                       </div>
                    )}
                  </div>
                )}

                {activeTab === 'submissions' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredSubmissions.map((sub) => {
                      const isPending = sub.status === 'pending';
                      const isApproved = sub.status === 'approved';
                      const isRejected = sub.status === 'rejected';
                      const isDeleteAction = sub.submissionType === 'delete';
                      const isModelTraining = sub.submissionType === 'train_parameters';
                      const diffMeta = parseDifficultyLabel(sub.level || sub.difficulty);

                      return (
                        <div key={sub.id} className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-50 border text-slate-600">
                                {sub.category}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isModelTraining && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                                    Calibration
                                  </span>
                                )}
                                {isDeleteAction && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300">
                                    Deletion
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
                            {!isApproved && !isDeleteAction && !isModelTraining ? (
                              <button onClick={() => openEditSubmission(sub)} className="text-xs font-black text-[#521903] hover:underline cursor-pointer">
                                Edit & Resubmit
                              </button>
                            ) : isModelTraining ? (
                              <span className="text-xs font-bold text-blue-700">Model Calibration</span>
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
                    {filteredSubmissions.length === 0 && (
                       <div className="col-span-full py-12 text-center text-slate-400 font-bold text-xs border-2 border-dashed border-slate-200 rounded-3xl">
                         No submissions found.
                       </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. REAL-TIME MOBILE APP SIMULATOR & GESTURE GUIDANCE MODAL */}
      {selectedLessonIndex !== null && activeLesson && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#FAF6EE] border-4 border-[#F2B33D] w-full max-w-[340px] sm:max-w-[390px] rounded-[36px] shadow-2xl overflow-hidden flex flex-col justify-between my-auto relative select-none">
            {/* Top Bar */}
            <div className="bg-[#FAF6EE] px-4 py-3 flex items-center justify-between border-b border-[#F5E6C4]/60">
              <button
                onClick={() => setSelectedLessonIndex(null)}
                className="p-1.5 bg-white border border-[#F5E6C4] rounded-full text-[#521903] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <h3 className="text-xs font-black text-[#521903] uppercase tracking-wider">
                {simulatorMode === 'tutorial'
                  ? 'Tutorial'
                  : simulatorMode === 'practice'
                  ? 'Practice Mode'
                  : simulatorMode === 'train'
                  ? 'Train Dataset Guidance'
                  : 'Continuous Practice'}
              </h3>

              <div className="flex items-center gap-1 bg-[#F2B33D]/20 px-2.5 py-1 rounded-full text-[10px] font-black text-[#B4790C]">
                <Zap className="h-3 w-3 fill-current" />
                <span>0 XP</span>
              </div>
            </div>

            {/* Mobile Screen Body */}
            <div className="p-4 sm:p-5 flex flex-col items-center justify-center space-y-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{activeLesson.displayTitle}</h1>

              <div className="h-36 w-36 bg-white rounded-3xl border border-slate-150 p-2 shadow-md flex items-center justify-center overflow-hidden">
                <ActivityImageCard
                  imageUrl={activeLesson.imageUrl}
                  correctAnswer={activeLesson.symbol}
                  category={activeLesson.category}
                />
              </div>

              {/* MODE 1: TUTORIAL */}
              {simulatorMode === 'tutorial' && (
                <div className="w-full space-y-3 pt-1">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${((selectedLessonIndex + 1) / currentLessons.length) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between px-2 text-xs font-black text-slate-700">
                    <button
                      onClick={() => setSelectedLessonIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))}
                      disabled={selectedLessonIndex === 0}
                      className="inline-flex items-center gap-1 hover:text-[#F2B33D] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <button
                      onClick={() =>
                        setSelectedLessonIndex((prev) =>
                          prev !== null && prev < currentLessons.length - 1 ? prev + 1 : prev
                        )
                      }
                      disabled={selectedLessonIndex === currentLessons.length - 1}
                      className="inline-flex items-center gap-1 hover:text-[#F2B33D] disabled:opacity-30 cursor-pointer"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setSimulatorMode('practice')}
                      className="w-full py-2.5 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black text-xs rounded-2xl shadow transition-transform active:scale-95 cursor-pointer uppercase tracking-wider"
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => setSimulatorMode('train')}
                      className="w-full py-2.5 bg-[#521903] hover:bg-[#3B1102] text-white font-black text-xs rounded-2xl shadow transition-transform active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      <Camera className="h-3.5 w-3.5" /> Train Data
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: WEBCAM PRACTICE — real LSTM prediction, with DTW template-match fallback */}
              {(simulatorMode === 'practice' || simulatorMode === 'continuous') && (
                <div className="w-full flex flex-col items-center space-y-2.5">
                  <div className="h-40 w-40 bg-black rounded-3xl overflow-hidden relative shadow-inner border-2 border-slate-900 flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="h-28 w-28 rounded-full border-2 border-white/60 flex items-center justify-center text-center p-2">
                        <span className="text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow">
                          Position Hand
                        </span>
                      </div>
                    </div>

                    {!cameraActive && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-3 text-white/60">
                        <VideoOff className="h-6 w-6 mb-1" />
                        <span className="text-[10px] font-bold">Webcam Ready</span>
                      </div>
                    )}
                  </div>

                  {livePrediction ? (
                    <div
                      className={`px-4 py-1.5 rounded-full border shadow-sm text-xs font-black flex items-center gap-1.5 ${
                        livePrediction.isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-amber-50 border-amber-300 text-amber-700'
                      }`}
                    >
                      {livePrediction.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      Detected: {livePrediction.label} ({Math.round(livePrediction.confidence * 100)}%)
                    </div>
                  ) : templateMatch ? (
                    <div
                      className={`px-4 py-1.5 rounded-full border shadow-sm text-xs font-black flex items-center gap-1.5 ${
                        templateMatch.isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-amber-50 border-amber-300 text-amber-700'
                      }`}
                    >
                      {templateMatch.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {templateMatch.isCorrect
                        ? 'Correct sign ✓'
                        : `Keep adjusting (${Math.round(templateMatch.confidence * 100)}% match)`}
                    </div>
                  ) : (
                    <div className="px-4 py-1 rounded-full bg-white border border-[#F5E6C4] shadow-sm text-xs font-black text-slate-500">
                      {modelsReady.gestureModel
                        ? 'Watching for your sign…'
                        : (activeTrainingDoc as any)?.trainingSequences?.length
                        ? 'Watching for your sign…'
                        : 'No approved reference sample yet for this sign'}
                    </div>
                  )}

                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => setSimulatorMode('tutorial')}
                      className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
                    >
                      Tutorial
                    </button>
                    <button
                      onClick={() => setSimulatorMode('train')}
                      className="flex-1 py-2 bg-[#521903] text-white font-black text-xs rounded-xl shadow hover:bg-[#3B1102]"
                    >
                      Train Guidance
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 3: TAKE-BASED GESTURE TRAINING — record the full moving sign, one take at a time, for LSTM training */}
              {simulatorMode === 'train' && (
                <div className="w-full flex flex-col items-center space-y-3">
                  <div
                    className={`h-40 w-40 bg-black rounded-3xl overflow-hidden relative shadow-inner border-2 transition-all duration-300 flex items-center justify-center ${
                      captureComplete
                        ? 'border-emerald-500 ring-4 ring-emerald-500/30'
                        : isRecordingTake
                        ? 'border-rose-500 ring-2 ring-rose-500/30'
                        : 'border-amber-400'
                    }`}
                  >
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

                    {isRecordingTake && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">
                        <span className="h-1.5 w-1.5 bg-white rounded-full" /> REC
                      </div>
                    )}

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div
                        className={`h-28 w-28 rounded-full border-2 flex items-center justify-center text-center p-2 transition-all ${
                          isRecordingTake ? 'border-rose-400 bg-rose-500/10' : 'border-white/70'
                        }`}
                      >
                        <span className="text-[10px] font-black text-white uppercase tracking-wider drop-shadow">
                          {captureComplete
                            ? 'All Takes Captured ✓'
                            : !handDetected
                            ? 'No Hand Detected'
                            : isRecordingTake
                            ? 'Perform the sign…'
                            : 'Ready to record'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-amber-50 border border-amber-200 p-2 rounded-xl text-center">
                    <p className="text-[11px] font-black text-amber-800 flex items-center justify-center gap-1">
                      {isRecordingTake
                        ? 'Perform the full sign naturally, then tap Stop & Save.'
                        : 'Press Record, sign the gesture from start to finish, then Stop & Save.'}
                    </p>
                  </div>

                  <div className="w-full space-y-1 text-center">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 px-1">
                      <span>Takes Captured</span>
                      <span className="font-mono">{takesCaptured} / {REQUIRED_TAKES}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (takesCaptured / REQUIRED_TAKES) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full pt-1">
                    <button
                      onClick={() => setSimulatorMode('practice')}
                      disabled={trainingSaving || isRecordingTake}
                      className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 disabled:opacity-40"
                    >
                      Back
                    </button>

                    {!isRecordingTake ? (
                      <button
                        onClick={() => {
                          sequenceBufferRef.current.clear();
                          setIsRecordingTake(true);
                        }}
                        disabled={trainingSaving || !handDetected}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                      >
                        <Camera className="h-3.5 w-3.5" /> Record Take
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveTake}
                        className="flex-1 py-2 bg-[#F2B33D] hover:bg-[#D99A26] text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" /> Stop & Save
                      </button>
                    )}
                  </div>

                  {takesCaptured >= 1 && !isRecordingTake && (
                    <button
                      onClick={handleSaveTrainingSample}
                      disabled={trainingSaving}
                      className="w-full py-2.5 bg-[#521903] hover:bg-[#3B1102] disabled:opacity-50 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                    >
                      {trainingSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {captureComplete ? 'Submit for Approval' : `Submit Partial Data (${takesCaptured})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL: ADD NEW TUTORIAL & PRACTICE SIGN */}
      {showNewSignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#521903]">
                Add Sign to {activeCategory.toUpperCase()} Module
              </h3>
              <button
                onClick={() => setShowNewSignModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTutorialSign} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Sign Symbol / Word
                </label>
                <input
                  type="text"
                  placeholder="e.g. Z, 11, Kumusta, Salamat"
                  value={newSignSymbol}
                  onChange={(e) => setNewSignSymbol(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Display Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kumusta / Hello"
                  value={newSignTitle}
                  onChange={(e) => setNewSignTitle(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Instruction / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. FSL hand sign demonstration"
                  value={newSignDesc}
                  onChange={(e) => setNewSignDesc(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Illustration Image (Upload or Drag & Drop)
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!creatingSign) setIsSignImgDragging(true);
                  }}
                  onDragLeave={() => setIsSignImgDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsSignImgDragging(false);
                    if (creatingSign) return;
                    if (e.dataTransfer.files?.[0]) setNewSignFile(e.dataTransfer.files[0]);
                  }}
                  className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-4 transition-all ${
                    isSignImgDragging
                      ? 'border-[#F2B33D] bg-[#FFFBEB]'
                      : newSignPreviewUrl
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  {newSignPreviewUrl ? (
                    <div className="flex flex-col items-center space-y-1.5">
                      <div className="h-24 w-24 bg-white border border-emerald-400 rounded-2xl p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
                        <img src={newSignPreviewUrl} alt="Staged" className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" /> Picture Staged
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1">
                      <ImageIcon className="h-6 w-6 text-slate-400 mb-0.5" />
                      <p className="font-black text-slate-700 text-xs">Drag & drop picture here</p>
                      <p className="text-[10px] text-slate-400">or click browse below</p>
                    </div>
                  )}

                  <label className="mt-2.5 inline-flex items-center justify-center bg-white border border-slate-200 hover:border-[#521903] text-[#521903] font-black px-4 py-1.5 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer shadow-xs">
                    {newSignPreviewUrl ? 'Change Picture' : 'Browse Picture'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={creatingSign}
                      accept=".jpeg,.png,.jpg,.webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setNewSignFile(e.target.files[0]);
                      }}
                    />
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Or enter path: e.g. /assets/pictures/A.jpg"
                  value={newSignImg}
                  onChange={(e) => setNewSignImg(e.target.value)}
                  className="w-full px-3.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSignModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSign || !newSignSymbol.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#521903] hover:bg-[#3B1102] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {creatingSign && <Loader2 className="h-3 w-3 animate-spin" />} Create Sign & Tutorial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. WIZARD STEP 1: QUESTION BASE */}
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

                      let defaultOptions = formState.options;
                      if (selected === 'true_false') {
                        defaultOptions = ['True', 'False'];
                      } else if (selected === 'matching_type') {
                        defaultOptions = ['|||', '|||', '|||'];
                      } else if (selected === 'sequence_order') {
                        defaultOptions = ['', '', ''];
                      } else if (['true_false', 'matching_type', 'sequence_order'].includes(formState.type)) {
                        defaultOptions = ['', '', '', ''];
                      }

                      setFormState({ ...formState, type: selected, options: defaultOptions, correctAnswerIndex: 0, correct_answer: '' });

                      if (selected === 'text_to_sign' || selected === 'solve_to_sign' || selected === 'fill_in_the_blank') {
                        setOptionsMode('image');
                      } else {
                        setOptionsMode('text');
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
                placeholder={formState.type === 'fill_in_the_blank' ? "e.g. I-type ang mga kulang na letra upang mabuo ang salita:" : "e.g. What number is this sign? or Solve: 3 - 1 = ?"}
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
                      <ActivityImageCard imageUrl={formState.image_url} correctAnswer={formState.correct_answer || ''} category={formState.category} />
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

      {/* 5. WIZARD STEP 2: OPTIONS */}
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

            {/* Template Specific Headers */}
            {formState.type === 'fill_in_the_blank' && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl mb-2 space-y-4 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Type className="h-4 w-4" /> Word / Sentence Completion Setup
                </span>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Word / Pattern</label>
                  <p className="text-[10px] text-slate-500 font-semibold mb-1">
                    Use underscores <span className="font-mono bg-white px-1 border rounded">_</span> to represent the missing blanks the student needs to fill in.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. S_GN L_NGU_GE"
                    value={formState.correct_answer || ''}
                    onChange={(e) => setFormState({ ...formState, correct_answer: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300/50 text-slate-800 font-bold text-sm tracking-widest shadow-inner uppercase"
                  />
                </div>
              </div>
            )}

            {formState.type === 'matching_type' && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block mb-1">Matching Type Setup</span>
                <p className="text-xs text-blue-800">
                  Define the correct matching pairs below. The student application will automatically shuffle the items on the left and right sides during the activity.
                </p>
              </div>
            )}

            {formState.type === 'sequence_order' && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block mb-1">Sequence / Ordering Setup</span>
                <p className="text-xs text-purple-800">
                  Define the items in their correct, chronological order below. The student app will shuffle them for the user to arrange.
                </p>
              </div>
            )}

            {/* Mode Switcher for Applicable Templates */}
            {formState.type !== 'true_false' && formState.type !== 'matching_type' && formState.type !== 'sequence_order' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <label className="text-slate-700 text-xs font-black uppercase tracking-wider block">
                    {formState.type === 'fill_in_the_blank' ? 'Choice Pool Format' : 'Multiple Choice Options Format'}
                  </label>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {formState.type === 'fill_in_the_blank' ? 'Select the format for the choices bank (e.g., keyboard images).' : 'Click the circle checkmark to designate the CORRECT answer.'}
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
            )}

            {formState.type !== 'matching_type' && formState.type !== 'true_false' && formState.type !== 'sequence_order' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {formState.type === 'fill_in_the_blank' ? 'Choice Pool Layout Preview:' : 'Live Choice Layout Preview:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {formState.options.map((opt, i) => (
                    <OptionDisplay key={i} index={i} option={opt} isCorrect={formState.type === 'fill_in_the_blank' ? false : i === formState.correctAnswerIndex} />
                  ))}
                </div>
              </div>
            )}

            {formState.type === 'true_false' && (
              <div className="space-y-3 pt-2">
                {formState.options.slice(0, 2).map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center gap-3.5 transition-all ${
                      idx === formState.correctAnswerIndex
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300/40'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setFormState({ ...formState, correctAnswerIndex: idx, correct_answer: opt })}
                      className={`flex-shrink-0 h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
                        idx === formState.correctAnswerIndex
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300/40'
                          : 'border-slate-300 bg-white hover:border-slate-400 text-transparent'
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>
                    <span className="text-sm font-black text-slate-700">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {formState.type === 'matching_type' && (
              <div className="space-y-4">
                {formState.options.map((opt, idx) => {
                  const parts = opt.split('|||');
                  const leftVal = parts[0] || '';
                  const rightVal = parts[1] || '';
                  const isLeftImage = leftVal.startsWith('blob:') || leftVal.startsWith('http') || leftVal.includes('assets/');

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl border bg-slate-50/70 border-slate-200 flex flex-col sm:flex-row gap-3 items-center relative">
                      <div className="flex-1 w-full relative">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-3 bg-slate-50 px-1.5 z-10">Left Item</span>
                        <div className="flex items-center gap-2 mt-1">
                          {isLeftImage && (
                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
                              <img src={resolveImagePath(leftVal)[0] || leftVal} className="max-h-full max-w-full object-contain" alt="" />
                            </div>
                          )}
                          <input
                            type="text"
                            value={leftVal.startsWith('blob:') ? `Image Uploaded` : leftVal}
                            onChange={(e) => updateOptionValue(idx, `${e.target.value}|||${rightVal}`)}
                            placeholder="Text or Image URL"
                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/30 text-slate-800 font-bold text-xs"
                          />
                          <label className="p-2 bg-white border border-slate-200 hover:border-[#521903] text-slate-700 rounded-xl cursor-pointer shadow-sm flex-shrink-0" title="Upload Image for Left Item">
                            <Upload className="h-3.5 w-3.5 text-[#F2B33D]" />
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpeg,.png,.jpg,.webp"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleOptionFileUpload(idx, e.target.files[0]);
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-slate-300">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>

                      <div className="flex-1 w-full relative">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-3 bg-slate-50 px-1.5 z-10">Right Match</span>
                        <div className="mt-1">
                          <input
                            type="text"
                            value={rightVal}
                            onChange={(e) => updateOptionValue(idx, `${leftVal}|||${e.target.value}`)}
                            placeholder="Matching Text Value"
                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/30 text-slate-800 font-bold text-xs"
                          />
                        </div>
                      </div>

                      {formState.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="p-2 absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-full shadow-sm cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {formState.type === 'sequence_order' && (
              <div className="space-y-3">
                {formState.options.map((opt, idx) => {
                  return (
                    <div key={idx} className="p-3 rounded-2xl border bg-slate-50/70 border-slate-200 flex items-center gap-3.5 relative">
                      <div className="flex-shrink-0 h-9 w-9 rounded-full border-2 border-purple-200 bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shadow-sm">
                        {idx + 1}
                      </div>

                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          disabled={saving}
                          placeholder={`Sequence Item ${idx + 1}`}
                          value={opt}
                          onChange={(e) => updateOptionValue(idx, e.target.value)}
                          className="w-full px-4 py-2 border-2 border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2B33D]/30 text-slate-800 font-bold text-xs disabled:opacity-50"
                        />
                      </div>

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
                  )
                })}
              </div>
            )}

            {/* Standard MCQ and Fill in Blank Choice Pool List */}
            {formState.type !== 'true_false' && formState.type !== 'matching_type' && formState.type !== 'sequence_order' && (
              <div className="space-y-3">
                {formState.type === 'fill_in_the_blank' && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Choice Pool (Options Bank)</span>
                )}
                {formState.options.map((opt, idx) => {
                  const isChecked = formState.type === 'fill_in_the_blank' ? false : idx === formState.correctAnswerIndex;
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
                      {formState.type !== 'fill_in_the_blank' && (
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
                      )}

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
            )}

            {formState.options.length < 12 && formState.type !== 'true_false' && (
              <button
                type="button"
                disabled={saving}
                onClick={addOptionField}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#521903] uppercase tracking-wider hover:opacity-80 cursor-pointer pt-0.5 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                {formState.type === 'matching_type' ? 'Add Pair' : formState.type === 'sequence_order' ? 'Add Step' : formState.type === 'fill_in_the_blank' ? 'Add Distractor / Choice' : 'Add Choice Option'}
              </button>
            )}

            {saveError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 mt-4">
                <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-600">{saveError}</p>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => !saving && setScreen('wizard_question')}
                disabled={saving}
                className="bg-white border-2 border-slate-200 text-slate-600 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40"
              >
                Back to Image Setup
              </button>

              <button
                onClick={handleSubmitForApproval}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#52B788] hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {editingId ? 'Update & Submit' : 'Submit for Admin Approval'}
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

      {/* DELETION REQUEST MODAL */}
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