import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export type ContentCategory = 'alphabet' | 'numbers' | 'phrases' | 'civic' | string;
export type ContentDifficulty = 'easy' | 'medium' | 'hard';
export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
export type SubmissionActionType = 'create' | 'update' | 'delete' | 'train_parameters';

export interface ActivityCategory {
  id: string;
  name: string;
  label: string;
  imgUrl?: string;
}

export interface ToleranceBounds {
  rotate: number;
  tilt: number;
  distance: number;
  switchHands: number;
}

export interface ContentSubmission {
  id: string;
  category: string;
  difficulty: ContentDifficulty;
  type: string;
  submissionType?: SubmissionActionType;
  level: string;
  questionText: string;
  question_text?: string;
  correctAnswer: string;
  correct_answer?: string;
  options: string[];
  imageUrl: string;
  image_url?: string;
  toleranceBounds?: ToleranceBounds;
  trainingSequences?: number[][][];
  sequenceLength?: number;
  frameLength?: number;
  gestureKey?: string;
  contentId?: string;
  status: SubmissionStatus;
  isArchived?: boolean;
  archivedAt?: any;
  archivedById?: string;
  archivedByName?: string;
  createdById: string;
  createdByName: string;
  createdByEmail?: string;
  createdAt: any;
  submittedAt?: any;
  updatedAt?: any;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: any;
  rejectionReason?: string;
  publishedLevel?: string;
  activityQuestionId?: string;
}

export interface ContentSubmissionInput {
  category: string;
  difficulty: ContentDifficulty;
  type: string;
  submissionType?: SubmissionActionType;
  level?: string;
  questionText: string;
  correctAnswer: string;
  options: string[];
  imageUrl: string;
  toleranceBounds?: ToleranceBounds;
  trainingSequences?: number[][][];
  gestureKey?: string;
  activityQuestionId?: string;
}

export interface PublishedActivityQuestion {
  id: string;
  category: string;
  level: string;
  type: string;
  question_text: string;
  questionText?: string;
  image_url: string;
  imageUrl?: string;
  options: string[];
  correct_answer: string;
  correctAnswer?: string;
  createdAt?: any;
  isArchived?: boolean;
  archivedAt?: any;
}

// Sequence shape captured by the real MediaPipe/landmark pipeline
// (see lib/posture-metrics.ts + lib/gesture-sequence-model.ts):
// one sample = TRAINING_SEQUENCE_LENGTH frames, each frame a
// TRAINING_FEATURE_LENGTH-length flattened landmark feature vector.
// Keep these in sync with SEQUENCE_LENGTH (gesture-sequence-model.ts) and
// FEATURE_VECTOR_LENGTH (posture-metrics.ts) — duplicated here as plain
// constants so this file never has to import the TF.js/MediaPipe client libs.
export const TRAINING_SEQUENCE_LENGTH = 30;
export const TRAINING_FEATURE_LENGTH = 126;

export type TrainingDatasetStatus =
  | 'no_dataset'
  | 'collecting'
  | 'dataset_ready'
  | 'pending_approval'
  | 'approved_awaiting_model';

export interface GestureTrainingData {
  id: string;
  gestureKey: string;
  label: string;
  category: string;
  contentId?: string;
  sampleCount: number;
  accuracyThreshold: number;
  landmarksVector?: number[];
  toleranceBounds: ToleranceBounds;
  /** Real captured landmark sequences merged in on approval — used for DTW
   *  matching in Practice and as the export source for offline LSTM training.
   *  Capped (see MAX_STORED_SEQUENCES) to stay under Firestore's 1MB/doc limit. */
  trainingSequences?: number[][][];
  sequenceLength?: number;
  frameLength?: number;
  trainingStatus?: TrainingDatasetStatus;
  lastTrainedAt?: any;
  lastTrainedBy?: string;
}

export interface TutorialLesson {
  id: string;
  category: string;
  symbol: string;
  displayTitle: string;
  imageUrl: string;
  gestureKey: string;
  description?: string;
  expectedHands?: number;
  createdAt?: any;
  createdById?: string;
  createdByName?: string;
}

export const CONTENT_CATEGORIES = [
  { value: 'alphabet', label: 'Alphabet', imgUrl: '/images/alphabets.png' },
  { value: 'numbers', label: 'Numbers', imgUrl: '/images/numbers.png' },
  { value: 'phrases', label: 'Phrases', imgUrl: '/images/phrases.png' },
  { value: 'civic', label: 'Civic', imgUrl: '/images/civic.png' },
];

export const CONTENT_DIFFICULTIES: ContentDifficulty[] = ['easy', 'medium', 'hard'];

export const DEFAULT_TUTORIAL_LESSONS: Record<string, TutorialLesson[]> = {
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => ({
    id: `alpha_${char.toLowerCase()}`,
    category: 'alphabet',
    symbol: char,
    displayTitle: `${char}${char.toLowerCase()}`,
    imageUrl: `/assets/pictures/${char}.jpg`,
    gestureKey: char,
    description: `FSL Finger spelling sign for letter ${char}`,
    expectedHands: 1,
  })),
  numbers: Array.from({ length: 10 }, (_, i) => i + 1).map((num) => ({
    id: `num_${num}`,
    category: 'numbers',
    symbol: num.toString(),
    displayTitle: `Number ${num}`,
    imageUrl: `/assets/pictures/${num}.png`,
    gestureKey: num.toString(),
    description: `FSL Counting hand sign representation for number ${num}`,
    expectedHands: 1,
  })),
  phrases: [
    { id: 'ph_hello', category: 'phrases', symbol: 'Hello', displayTitle: 'Hello / Kamusta', imageUrl: '/assets/pictures/hello.jpg', gestureKey: 'hello', description: 'Greeting sign', expectedHands: 1 },
    { id: 'ph_thanks', category: 'phrases', symbol: 'Thank You', displayTitle: 'Thank You / Salamat', imageUrl: '/assets/pictures/thankyou.jpg', gestureKey: 'thank_you', description: 'Gratitude gesture', expectedHands: 1 },
    { id: 'ph_yes', category: 'phrases', symbol: 'Yes', displayTitle: 'Yes / Oo', imageUrl: '/assets/pictures/yes.jpg', gestureKey: 'yes', description: 'Affirmation sign', expectedHands: 1 },
    { id: 'ph_no', category: 'phrases', symbol: 'No', displayTitle: 'No / Hindi', imageUrl: '/assets/pictures/no.jpg', gestureKey: 'no', description: 'Negation sign', expectedHands: 1 },
  ],
  civic: [
    { id: 'cv_help', category: 'civic', symbol: 'Help', displayTitle: 'Help / Saklolo', imageUrl: '/assets/pictures/help.jpg', gestureKey: 'help', description: 'Emergency sign', expectedHands: 2 },
    { id: 'cv_police', category: 'civic', symbol: 'Police', displayTitle: 'Police / Pulis', imageUrl: '/assets/pictures/police.jpg', gestureKey: 'police', description: 'Public safety sign', expectedHands: 1 },
    { id: 'cv_doctor', category: 'civic', symbol: 'Doctor', displayTitle: 'Doctor / Doktor', imageUrl: '/assets/pictures/doctor.jpg', gestureKey: 'doctor', description: 'Healthcare sign', expectedHands: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Firestore does not support arrays that directly contain other arrays
// (a "nested array" — e.g. number[][]). Our captured training data is
// naturally number[][][] (samples x frames x features), which trips that
// restriction two layers deep. These helpers wrap each frame in a plain
// object so Firestore only ever sees "array of maps," never "array of
// arrays," and unwrap it back to plain numeric arrays on read so every
// other consumer (DTW matching, offline export, etc.) keeps working with
// ordinary number[][][] and never has to know about this storage quirk.
// ---------------------------------------------------------------------------
function serializeSequences(sequences: number[][][]): any[] {
  return sequences.map((sample) => ({
    frames: sample.map((frame) => ({ f: frame })),
  }));
}

function deserializeSequences(stored: any[] | undefined | null): number[][][] {
  if (!stored || !Array.isArray(stored)) return [];
  return stored.map((sample: any) => {
    const frames = sample?.frames;
    if (!Array.isArray(frames)) return [];
    return frames.map((fr: any) => (Array.isArray(fr?.f) ? fr.f : []));
  });
}

// 1. Audit / Activity Logging
export async function logAdminAction(
  adminId: string,
  adminName: string,
  adminEmail: string,
  action: string,
  details: Record<string, any>
) {
  try {
    const logData = {
      userId: adminId,
      userName: adminName,
      userEmail: adminEmail,
      role: 'admin',
      action,
      details,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Dashboard',
    };

    await addDoc(collection(db, 'activity_logs'), logData);
    await addDoc(collection(db, 'login_activity'), { ...logData, type: 'content_management' });
  } catch (err) {
    console.warn('Could not record activity audit log:', err);
  }
}

// 2. Dispatch in-app notification to teacher
export async function sendTeacherNotification(
  teacherId: string,
  teacherEmail: string,
  title: string,
  message: string,
  type: 'approval' | 'rejection' | 'announcement' | 'feedback',
  metadata: Record<string, any> = {}
) {
  try {
    if (!teacherId && !teacherEmail) return;
    await addDoc(collection(db, 'notifications'), {
      userId: teacherId || '',
      recipientId: teacherId || '',
      userEmail: teacherEmail || '',
      recipientEmail: teacherEmail || '',
      title,
      message,
      type,
      read: false,
      isRead: false,
      metadata,
      createdAt: serverTimestamp(),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not write notification document:', err);
  }
}

// 3. Realtime listener for custom tutorial lessons created in Firestore
export function subscribeToCustomTutorialLessons(
  category: string,
  callback: (lessons: TutorialLesson[]) => void
) {
  const q = query(
    collection(db, 'tutorial_lessons'),
    where('category', '==', category)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as TutorialLesson[];
    callback(list);
  });
}

// 4. Create new Tutorial Lesson / Practice Sign
export async function createTutorialLesson(
  category: string,
  symbol: string,
  displayTitle: string,
  description: string,
  imageUrl: string,
  userId: string,
  userName: string,
  expectedHands = 1
) {
  const cleanId = `${category}_${symbol.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const docRef = doc(db, 'tutorial_lessons', cleanId);
  await setDoc(
    docRef,
    {
      category,
      symbol: symbol.trim(),
      displayTitle: displayTitle.trim() || symbol.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() || '',
      gestureKey: symbol.trim(),
      expectedHands,
      createdById: userId,
      createdByName: userName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return cleanId;
}

// 5. Realtime listener for teacher submissions
export function getMyContentSubmissionsRealtime(
  userId: string,
  callback: (submissions: ContentSubmission[]) => void,
  errorCallback?: (err: any) => void
) {
  const q = query(
    collection(db, 'content_submissions'),
    where('createdById', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          submissionType: data.submissionType || (data.activityQuestionId ? 'update' : 'create'),
          questionText: data.questionText || data.question_text || '',
          correctAnswer: data.correctAnswer || data.correct_answer || '',
          imageUrl: data.imageUrl || data.image_url || '',
          trainingSequences: data.trainingSequences ? deserializeSequences(data.trainingSequences) : undefined,
        } as ContentSubmission;
      });
      callback(items);
    },
    errorCallback
  );
}

// 6. Realtime listener for all submissions (Admin View)
export function getAllContentSubmissionsRealtime(
  callback: (submissions: ContentSubmission[]) => void,
  errorCallback?: (err: any) => void
) {
  const q = query(collection(db, 'content_submissions'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          submissionType: data.submissionType || (data.activityQuestionId ? 'update' : 'create'),
          questionText: data.questionText || data.question_text || '',
          correctAnswer: data.correctAnswer || data.correct_answer || '',
          imageUrl: data.imageUrl || data.image_url || '',
          trainingSequences: data.trainingSequences ? deserializeSequences(data.trainingSequences) : undefined,
        } as ContentSubmission;
      });
      callback(items);
    },
    errorCallback
  );
}

// 7. Realtime listener for live activity questions
export function subscribeToAllActivities(
  callback: (activities: PublishedActivityQuestion[]) => void,
  errorCallback?: (err: any) => void
) {
  const q = query(collection(db, 'activity_questions'));
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => {
        const item = d.data();
        return {
          id: d.id,
          ...item,
          question_text: item.question_text || item.questionText || '',
          correct_answer: item.correct_answer || item.correctAnswer || '',
          image_url: item.image_url || item.imageUrl || '',
        };
      }) as PublishedActivityQuestion[];
      callback(data);
    },
    errorCallback
  );
}

// 8. Realtime listener for categories
export function subscribeToCategories(
  callback: (categories: ActivityCategory[]) => void,
  errorCallback?: (err: any) => void
) {
  const q = query(collection(db, 'activity_categories'));
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ActivityCategory[];
      callback(data);
    },
    errorCallback
  );
}

// 9. Realtime listener for Gesture Training Data
export function subscribeToGestureTrainingData(
  category: string,
  callback: (data: GestureTrainingData[]) => void
) {
  const q = query(
    collection(db, 'gesture_training_data'),
    where('category', '==', category)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        trainingSequences: deserializeSequences(data.trainingSequences),
      } as GestureTrainingData;
    });
    callback(list);
  });
}

// Deterministic doc id for a gesture's training dataset. Kept as a plain
// helper (rather than inlined in two places) so submission + approval always
// agree on where a given content's dataset lives.
export function buildGestureTrainingDocId(category: string, gestureKey: string): string {
  return `${category}_${gestureKey.toLowerCase()}`;
}

/**
 * Validates a set of captured training samples before they're allowed to be
 * submitted. This is the guard that keeps a dataset from being accidentally
 * saved empty, malformed, or short of the required sample count — see
 * "CONTENT-SPECIFIC TRAINING" requirement: a dataset must belong to exactly
 * one content item and must contain real, correctly-shaped sequences.
 */
export function validateTrainingSamples(
  trainingSequences: number[][][] | undefined,
  requiredSampleCount: number,
  sequenceLength: number = TRAINING_SEQUENCE_LENGTH,
  featureLength: number = TRAINING_FEATURE_LENGTH
): { valid: boolean; error?: string } {
  if (!trainingSequences || trainingSequences.length === 0) {
    return { valid: false, error: 'No training samples were captured.' };
  }
  if (trainingSequences.length < requiredSampleCount) {
    return {
      valid: false,
      error: `Only ${trainingSequences.length}/${requiredSampleCount} valid samples captured.`,
    };
  }
  for (const sample of trainingSequences) {
    if (!Array.isArray(sample) || sample.length !== sequenceLength) {
      return { valid: false, error: `A captured sample does not have ${sequenceLength} frames.` };
    }
    for (const frame of sample) {
      if (!Array.isArray(frame) || frame.length !== featureLength) {
        return { valid: false, error: `A captured frame does not have ${featureLength} landmark features.` };
      }
      if (frame.some((v) => typeof v !== 'number' || Number.isNaN(v))) {
        return { valid: false, error: 'A captured frame contains invalid (non-numeric) landmark data.' };
      }
    }
  }
  return { valid: true };
}

// 10. Submit Gesture Model Parameters to Admin for Approval (Persisting raw sequences for offline LSTM training)
// contentId ties this dataset to the exact tutorial/content item it was
// captured from (e.g. the "Kamusta" TutorialLesson.id), so the resulting
// gesture_training_data document can never be confused with another sign's
// dataset even if two signs happen to share a display symbol.
export async function submitGestureParametersForApproval(
  gestureKey: string,
  category: string,
  displayTitle: string,
  imageUrl: string,
  toleranceBounds: ToleranceBounds,
  userId: string,
  userName: string,
  userEmail = '',
  trainingSequences?: number[][][],
  contentId?: string
) {
  return await addDoc(collection(db, 'content_submissions'), {
    category,
    difficulty: 'medium',
    type: 'gesture_model_training',
    submissionType: 'train_parameters',
    level: `${category}_training_${gestureKey.toLowerCase()}`,
    questionText: `Calibrate Model: ${displayTitle} (${gestureKey.toUpperCase()})`,
    question_text: `Calibrate Model: ${displayTitle} (${gestureKey.toUpperCase()})`,
    correctAnswer: gestureKey,
    correct_answer: gestureKey,
    options: ['Rotate', 'Tilt', 'Distance', 'Switch Hands'],
    imageUrl,
    image_url: imageUrl,
    gestureKey,
    contentId: contentId || null,
    toleranceBounds,
    // Firestore rejects arrays-of-arrays, so raw number[][][] is wrapped
    // into array-of-maps form before being written — see serializeSequences.
    trainingSequences: serializeSequences(trainingSequences ?? []),
    sequenceLength: TRAINING_SEQUENCE_LENGTH,
    frameLength: TRAINING_FEATURE_LENGTH,
    status: 'pending',
    isArchived: false,
    createdById: userId,
    createdByName: userName,
    createdByEmail: userEmail,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// 10b. Fetch the training dataset for one specific content item (one-time read).
// This answers "give me the training dataset for Kamusta" precisely, without
// relying on realtime listeners or category-wide scans.
export async function getGestureTrainingDataForContent(
  contentId: string
): Promise<GestureTrainingData | null> {
  const q = query(collection(db, 'gesture_training_data'), where('contentId', '==', contentId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    trainingSequences: deserializeSequences(data.trainingSequences),
  } as GestureTrainingData;
}

// 11. Create dynamic category
export async function createCategory(name: string, label: string, imgUrl = '') {
  const slug = name.toLowerCase().trim().replace(/\s+/g, '_');
  const catRef = doc(db, 'activity_categories', slug);
  await setDoc(catRef, {
    name: slug,
    label,
    imgUrl,
    createdAt: serverTimestamp(),
  });
}

// 12. Submit Activity Quiz for Admin Approval
export async function createContentSubmission(
  input: ContentSubmissionInput,
  userId: string,
  userName: string,
  userEmail = '',
  submitNow = true
) {
  const status: SubmissionStatus = submitNow ? 'pending' : 'draft';
  const level = input.level || `${input.category}_${input.difficulty}_1`;

  return await addDoc(collection(db, 'content_submissions'), {
    category: input.category,
    difficulty: input.difficulty,
    type: input.type,
    submissionType: input.submissionType || (input.activityQuestionId ? 'update' : 'create'),
    level,
    questionText: input.questionText,
    question_text: input.questionText,
    correctAnswer: input.correctAnswer,
    correct_answer: input.correctAnswer,
    options: input.options,
    imageUrl: input.imageUrl,
    image_url: input.imageUrl,
    activityQuestionId: input.activityQuestionId || null,
    status,
    isArchived: false,
    createdById: userId,
    createdByName: userName,
    createdByEmail: userEmail,
    createdAt: serverTimestamp(),
    submittedAt: submitNow ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

// 13. Request Activity Deletion from Admin Approval
export async function requestActivityDeletion(
  activity: PublishedActivityQuestion,
  userId: string,
  userName: string,
  userEmail = ''
) {
  const inferredDifficulty: ContentDifficulty = activity.level?.includes('hard')
    ? 'hard'
    : activity.level?.includes('medium')
    ? 'medium'
    : 'easy';

  return await addDoc(collection(db, 'content_submissions'), {
    category: activity.category || 'numbers',
    difficulty: inferredDifficulty,
    type: activity.type || 'sign_to_text',
    submissionType: 'delete',
    level: activity.level || 'level',
    questionText: activity.question_text || activity.questionText || '',
    question_text: activity.question_text || activity.questionText || '',
    correctAnswer: activity.correct_answer || activity.correctAnswer || '',
    correct_answer: activity.correct_answer || activity.correctAnswer || '',
    options: activity.options || [],
    imageUrl: activity.image_url || activity.imageUrl || '',
    image_url: activity.image_url || activity.imageUrl || '',
    activityQuestionId: activity.id,
    status: 'pending',
    isArchived: false,
    createdById: userId,
    createdByName: userName,
    createdByEmail: userEmail,
    createdAt: serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// 14. Update submission
export async function updateContentSubmission(
  id: string,
  input: ContentSubmissionInput,
  submitNow = true
) {
  const docRef = doc(db, 'content_submissions', id);
  const status: SubmissionStatus = submitNow ? 'pending' : 'draft';
  const level = input.level || `${input.category}_${input.difficulty}_1`;

  return await updateDoc(docRef, {
    category: input.category,
    difficulty: input.difficulty,
    type: input.type,
    submissionType: input.submissionType || 'update',
    level,
    questionText: input.questionText,
    question_text: input.questionText,
    correctAnswer: input.correctAnswer,
    correct_answer: input.correctAnswer,
    options: input.options,
    imageUrl: input.imageUrl,
    image_url: input.imageUrl,
    status,
    updatedAt: serverTimestamp(),
    ...(submitNow ? { submittedAt: serverTimestamp() } : {}),
  });
}

// 15. Approve Submission (Admin)
export async function approveContentSubmission(
  submissionId: string,
  adminId: string,
  adminName: string,
  adminEmail = ''
) {
  const subRef = doc(db, 'content_submissions', submissionId);
  const subSnap = await getDoc(subRef);
  if (!subSnap.exists()) throw new Error('Submission document not found.');

  const sub = subSnap.data() as ContentSubmission;
  const level = sub.level || sub.publishedLevel || `${sub.category}_${sub.difficulty}_1`;
  const isDeletion = sub.submissionType === 'delete';
  const isTrainingSync = sub.submissionType === 'train_parameters';

  let targetQuestionId = sub.activityQuestionId;

  if (isTrainingSync) {
    const gestureKey = sub.gestureKey || sub.correctAnswer || 'gesture';
    const gestureDocId = buildGestureTrainingDocId(sub.category, gestureKey);
    const gestureDocRef = doc(db, 'gesture_training_data', gestureDocId);

    const existingSnap = await getDoc(gestureDocRef);
    const existingData = existingSnap.exists() ? (existingSnap.data() as any) : null;
    const prevSamples = existingData?.sampleCount || 0;

    // Both the incoming submission's trainingSequences and any existing
    // stored dataset are in the wrapped (Firestore-safe) form at this point
    // — merge them as raw wrapped objects, no need to round-trip through
    // deserialize/serialize since neither side needs numeric access here.
    const newSequencesWrapped: any[] = (sub as any).trainingSequences || [];
    const existingSequencesWrapped: any[] = existingData?.trainingSequences || [];

    // Merge real captured sequences (not fabricated) so the dataset can be
    // exported for offline LSTM training and used for DTW matching in
    // Practice. Capped to protect the 1MB Firestore document limit — once
    // the cap is hit, sampleCount keeps growing but only a representative
    // window of raw sequences is retained in this document.
    const MAX_STORED_SEQUENCES = 60;
    const mergedSequencesWrapped = [...existingSequencesWrapped, ...newSequencesWrapped].slice(
      -MAX_STORED_SEQUENCES
    );

    await setDoc(
      gestureDocRef,
      {
        gestureKey,
        category: sub.category,
        contentId: sub.contentId || existingData?.contentId || null,
        label: sub.questionText.replace('Calibrate Model: ', ''),
        sampleCount: prevSamples + (newSequencesWrapped.length || 1),
        accuracyThreshold: 85,
        toleranceBounds: sub.toleranceBounds || { rotate: 85, tilt: 75, distance: 60, switchHands: 50 },
        trainingSequences: mergedSequencesWrapped,
        sequenceLength: sub.sequenceLength || TRAINING_SEQUENCE_LENGTH,
        frameLength: sub.frameLength || TRAINING_FEATURE_LENGTH,
        // Honest status: approval only confirms the dataset was reviewed and
        // synced — it does NOT mean a model has actually been trained. The
        // LSTM is trained offline (scripts/train_gesture_lstm.py) and its
        // output files must be dropped into public/models/gesture_lstm/.
        trainingStatus: 'approved_awaiting_model',
        lastTrainedAt: serverTimestamp(),
        lastTrainedBy: sub.createdByName || 'Faculty Member',
        approvedBy: adminName,
        approvedAt: serverTimestamp(),
        status: 'active',
      },
      { merge: true }
    );
  } else if (isDeletion && targetQuestionId) {
    const questionRef = doc(db, 'activity_questions', targetQuestionId);
    await deleteDoc(questionRef);
  } else {
    const questionPayload = {
      category: sub.category,
      level,
      type: sub.type || 'sign_to_text',
      question_text: sub.questionText || sub.question_text || '',
      correct_answer: sub.correctAnswer || sub.correct_answer || '',
      options: sub.options || [],
      image_url: sub.imageUrl || sub.image_url || '',
      updatedAt: serverTimestamp(),
    };

    if (targetQuestionId) {
      const questionRef = doc(db, 'activity_questions', targetQuestionId);
      await setDoc(questionRef, questionPayload, { merge: true });
    } else {
      const newDoc = await addDoc(collection(db, 'activity_questions'), {
        ...questionPayload,
        createdAt: serverTimestamp(),
      });
      targetQuestionId = newDoc.id;
    }
  }

  await updateDoc(subRef, {
    status: 'approved',
    reviewedById: adminId,
    reviewedByName: adminName,
    reviewedAt: serverTimestamp(),
    publishedLevel: level,
    activityQuestionId: targetQuestionId || null,
  });

  await logAdminAction(
    adminId,
    adminName,
    adminEmail,
    isTrainingSync ? 'APPROVE_GESTURE_PARAMETERS' : isDeletion ? 'APPROVE_ACTIVITY_DELETION' : 'APPROVE_ACTIVITY',
    {
      submissionId,
      category: sub.category,
      questionText: sub.questionText,
    }
  );

  await sendTeacherNotification(
    sub.createdById,
    sub.createdByEmail || '',
    isTrainingSync
      ? 'Gesture Training Calibration Approved 🦾'
      : isDeletion
      ? 'Activity Deletion Approved 🗑️'
      : 'Activity Question Approved 🎉',
    isTrainingSync
      ? `Your gesture parameter calibration for "${sub.questionText}" has been approved by ${adminName} and synced live to the mobile app.`
      : isDeletion
      ? `Your deletion request for "${sub.questionText}" has been approved and removed from the mobile app.`
      : `Your question "${sub.questionText}" (${sub.category.toUpperCase()}) has been approved by ${adminName} and is now live in the mobile app.`,
    'approval',
    { submissionId, activityQuestionId: targetQuestionId }
  );
}

// 16. Reject Submission (Admin)
export async function rejectContentSubmission(
  submissionId: string,
  adminId: string,
  adminName: string,
  reason: string,
  adminEmail = ''
) {
  const subRef = doc(db, 'content_submissions', submissionId);
  const subSnap = await getDoc(subRef);
  if (!subSnap.exists()) throw new Error('Submission document not found.');

  const sub = subSnap.data() as ContentSubmission;

  await updateDoc(subRef, {
    status: 'rejected',
    rejectionReason: reason,
    reviewedById: adminId,
    reviewedByName: adminName,
    reviewedAt: serverTimestamp(),
  });

  await logAdminAction(adminId, adminName, adminEmail, 'REJECT_SUBMISSION', { submissionId, reason });

  await sendTeacherNotification(
    sub.createdById,
    sub.createdByEmail || '',
    'Activity Submission Needs Revision ⚠️',
    `Your submission "${sub.questionText}" was rejected with feedback: "${reason}". Please edit and resubmit.`,
    'rejection',
    { submissionId, reason }
  );
}

// 17. Archive / Unarchive Submission
export async function setSubmissionArchivedStatus(
  submissionId: string,
  isArchived: boolean,
  adminId: string,
  adminName: string,
  adminEmail = ''
) {
  const subRef = doc(db, 'content_submissions', submissionId);
  await updateDoc(subRef, {
    isArchived,
    archivedAt: isArchived ? serverTimestamp() : null,
    archivedById: isArchived ? adminId : null,
    archivedByName: isArchived ? adminName : null,
  });

  await logAdminAction(adminId, adminName, adminEmail, isArchived ? 'ARCHIVE_SUBMISSION' : 'UNARCHIVE_SUBMISSION', {
    submissionId,
  });
}

// 18. Delete Submission
export async function deleteContentSubmission(
  id: string,
  adminId = '',
  adminName = '',
  adminEmail = ''
) {
  await deleteDoc(doc(db, 'content_submissions', id));
  if (adminId) {
    await logAdminAction(adminId, adminName, adminEmail, 'DELETE_SUBMISSION', { submissionId: id });
  }
}

// 19. Delete Live Activity
export async function deleteActivityQuestion(
  id: string,
  adminId = '',
  adminName = '',
  adminEmail = ''
) {
  await deleteDoc(doc(db, 'activity_questions', id));
  if (adminId) {
    await logAdminAction(adminId, adminName, adminEmail, 'DELETE_LIVE_ACTIVITY', { questionId: id });
  }
}

// 20. Fetch published questions snapshot
export async function getPublishedActivityQuestions(): Promise<PublishedActivityQuestion[]> {
  const q = query(collection(db, 'activity_questions'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      question_text: data.question_text || data.questionText || '',
      correct_answer: data.correct_answer || data.correctAnswer || '',
      image_url: data.image_url || data.imageUrl || '',
    } as PublishedActivityQuestion;
  });
}

// 21. Upload Activity Image
export async function uploadActivityImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `activities/${Date.now()}_${cleanName}`);

    const timeout = setTimeout(() => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    }, 4000);

    uploadBytes(storageRef, file)
      .then((snap) => getDownloadURL(snap.ref))
      .then((url) => {
        clearTimeout(timeout);
        resolve(url);
      })
      .catch((err) => {
        console.warn('Storage fallback triggered:', err);
        clearTimeout(timeout);
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
  });
}