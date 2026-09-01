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
import { reserveNextLevel } from '@/lib/level-assignment';

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
  difficulty?: ContentDifficulty;
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
  | 'approved_awaiting_model'
  | 'model_deployed';

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

// ---------------------------------------------------------------------------
// ACTIVITY QUESTION TYPE / DIFFICULTY POLICY
// ---------------------------------------------------------------------------
// Which Activity Question types may be used at each difficulty.
//
// This is a RESEARCH-INFORMED IMPLEMENTATION RECOMMENDATION, not a claim
// that any single study specifically labeled "Sign to Text" as Easy or
// "Sequencing" as Hard for FSL. The grouping instead follows a widely used
// progression in assessment/instructional-design literature: foundational
// recognition -> discrimination/association -> application, echoed in the
// cognitive-process dimension of the revised Bloom's Taxonomy (Anderson &
// Krathwohl, 2001, "A Taxonomy for Learning, Teaching, and Assessing"),
// recognition-vs-recall memory research (e.g. Mandler, 1980, "Recognizing:
// The judgment of previous occurrence" — recognition is consistently found
// to be a lower-effort retrieval process than recall/production), and
// cognitive load / scaffolding research (Sweller, 1988, "Cognitive load
// during problem solving"; Wood, Bruner & Ross, 1976, "The role of tutoring
// in problem solving") on sequencing complexity for novice/elementary
// learners. See the accompanying research summary in this change's final
// response for the full reasoning per activity type — do not reorder these
// lists without updating that write-up.
//
// EASY is intentionally restricted to exactly the two types below; this is
// enforced again (defense-in-depth) in the Content Management form's type
// dropdown filtering and in validateActivityPayload().
export const DIFFICULTY_ACTIVITY_TYPES: Record<ContentDifficulty, string[]> = {
  easy: ['sign_to_text', 'text_to_sign'],
  medium: ['multiple_choice', 'matching_type', 'pecs', 'true_false'],
  hard: ['sequence_order', 'fill_in_the_blank', 'solve_to_sign', 'custom'],
};

const ALL_KNOWN_ACTIVITY_TYPES = new Set<string>([
  ...DIFFICULTY_ACTIVITY_TYPES.easy,
  ...DIFFICULTY_ACTIVITY_TYPES.medium,
  ...DIFFICULTY_ACTIVITY_TYPES.hard,
]);

export function getAllowedActivityTypesForDifficulty(difficulty: ContentDifficulty): string[] {
  return DIFFICULTY_ACTIVITY_TYPES[difficulty] || DIFFICULTY_ACTIVITY_TYPES.easy;
}

/**
 * Whether `type` may be submitted/published at `difficulty`.
 *
 * A teacher-defined "Custom Activity Type" (anything not in one of the three
 * known lists above) is only permitted outside Easy — Easy stays strictly
 * limited to the two foundational recognition activities, per the product
 * requirement that Easy never exposes complex/unstructured activity types.
 */
export function isActivityTypeAllowedForDifficulty(type: string, difficulty: ContentDifficulty): boolean {
  const allowed = getAllowedActivityTypesForDifficulty(difficulty);
  if (allowed.includes(type)) return true;
  if (!ALL_KNOWN_ACTIVITY_TYPES.has(type) && difficulty !== 'easy') return true;
  return false;
}

function stripUndefinedValues<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) clean[key] = obj[key];
  });
  return clean as T;
}

export interface NormalizedActivityPayload {
  category: string;
  difficulty: ContentDifficulty;
  type: string;
  level: string;
  questionText: string;
  correctAnswer: string;
  options: string[];
  imageUrl: string;
}

/**
 * Maps whatever mix of camelCase (Firestore canonical) and snake_case
 * (legacy/local form-state) field names a caller passes in onto a single
 * canonical shape, strips blank/placeholder option entries, and trims
 * strings. Both content_submissions and activity_questions documents are
 * built from this so the two collections can never drift apart on field
 * naming (see the "IMPORTANT FIREBASE PAYLOAD FIX" requirement:
 * question_text/image_url on the client must land as questionText/imageUrl
 * in Firestore).
 */
export function normalizeActivityPayload(input: {
  category?: string;
  difficulty?: ContentDifficulty;
  type?: string;
  level?: string;
  questionText?: string;
  question_text?: string;
  correctAnswer?: string;
  correct_answer?: string;
  options?: string[];
  imageUrl?: string;
  image_url?: string;
}): NormalizedActivityPayload {
  const category = (input.category || '').trim();
  const difficulty = (input.difficulty || 'easy') as ContentDifficulty;
  const type = (input.type || 'sign_to_text').trim();
  const questionText = (input.questionText ?? input.question_text ?? '').trim();
  const correctAnswer = (input.correctAnswer ?? input.correct_answer ?? '').trim();
  const imageUrl = (input.imageUrl ?? input.image_url ?? '').trim();
  const options = Array.isArray(input.options)
    ? input.options
        .filter((opt): opt is string => typeof opt === 'string')
        .map((opt) => opt.trim())
        .filter((opt) => opt !== '' && opt !== '|||')
    : [];
  const level = (input.level || `${category}_${difficulty}_1`).trim();

  return { category, difficulty, type, level, questionText, correctAnswer, options, imageUrl };
}

// ---------------------------------------------------------------------------
// ACTIVITY-QUESTION IDENTIFIER
// ---------------------------------------------------------------------------
// The existing schema has no separate "identifier" field for a published
// activity question — PublishedActivityQuestion.id is always read straight
// off the Firestore document ID (see getPublishedActivityQuestions below).
// So the Firestore document ID itself IS the existing identifier field, and
// that's what this targets, rather than introducing a new one.
//
// Format: category_category_difficultyLevel_LevelNo_question_correctAnswer
// (category intentionally repeated once — matches the naming convention
// already visible on some existing activity_questions documents).

/**
 * Converts free text into a safe, deterministic identifier fragment:
 * lower-cased, accents stripped, and any run of non [a-z0-9] characters
 * collapsed to a single underscore with no leading/trailing underscore.
 * Used ONLY to build the activity_questions document ID below — the actual
 * question/correctAnswer field values are always stored unchanged.
 */
function slugifyForId(value: string): string {
  return (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Firestore document IDs are capped at 1,500 bytes; this keeps each text
// fragment well within that with plenty of room to spare, purely as a
// safety bound — it does not change the naming scheme itself.
const ID_FRAGMENT_MAX_LENGTH = 100;

/**
 * Builds the deterministic activity_questions document ID for a newly
 * published activity question:
 *   category_category_difficultyLevel_LevelNo_question_correctAnswer
 * `levelNumber` must be the automatically-assigned level number from
 * `reserveNextLevel` (see lib/level-assignment.ts).
 */
export function buildActivityQuestionId(
  category: string,
  difficulty: string,
  levelNumber: number,
  questionText: string,
  correctAnswer: string
): string {
  const catSlug = (slugifyForId(category) || 'category').slice(0, ID_FRAGMENT_MAX_LENGTH);
  const diffSlug = (slugifyForId(difficulty) || 'difficulty').slice(0, ID_FRAGMENT_MAX_LENGTH);
  const questionSlug = (slugifyForId(questionText) || 'question').slice(0, ID_FRAGMENT_MAX_LENGTH);
  const answerSlug = (slugifyForId(correctAnswer) || 'answer').slice(0, ID_FRAGMENT_MAX_LENGTH);
  return `${catSlug}_${catSlug}_${diffSlug}_${levelNumber}_${questionSlug}_${answerSlug}`;
}

export interface ActivityValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Structural + policy validation for an Activity Question payload. Runs
 * before every write to content_submissions AND again before every publish
 * to activity_questions, so an invalid difficulty/type combination or a
 * structurally broken options set (incomplete matching pairs, missing
 * sequence steps, no/duplicate correct answer, etc.) can never reach the
 * database regardless of what the UI happened to allow at submission time.
 */
export function validateActivityPayload(payload: NormalizedActivityPayload): ActivityValidationResult {
  if (!payload.category) return { valid: false, error: 'A category is required.' };
  if (!CONTENT_DIFFICULTIES.includes(payload.difficulty)) {
    return { valid: false, error: 'A valid difficulty (easy, medium, or hard) is required.' };
  }
  if (!payload.type) return { valid: false, error: 'An activity type is required.' };
  if (!isActivityTypeAllowedForDifficulty(payload.type, payload.difficulty)) {
    return {
      valid: false,
      error: `"${payload.type}" is not an allowed activity type for ${payload.difficulty} difficulty.`,
    };
  }
  if (!payload.questionText) return { valid: false, error: 'Question text is required.' };

  const { type } = payload;

  if (type === 'matching_type') {
    const pairs = payload.options
      .map((opt) => opt.split('|||'))
      .filter(([l, r]) => (l || '').trim() && (r || '').trim());
    if (pairs.length < 2) {
      return { valid: false, error: 'Matching activities need at least two complete pairs.' };
    }
    return { valid: true };
  }

  if (type === 'sequence_order') {
    const steps = payload.options.filter((opt) => opt.trim() !== '');
    if (steps.length < 2) {
      return { valid: false, error: 'Sequencing activities need at least two ordered items.' };
    }
    return { valid: true };
  }

  if (type === 'fill_in_the_blank') {
    if (!payload.correctAnswer) {
      return { valid: false, error: 'A target word/pattern is required for fill-in-the-blank activities.' };
    }
    return { valid: true };
  }

  if (type === 'true_false') {
    if (payload.options.length < 2 || !payload.correctAnswer) {
      return { valid: false, error: 'True/False activities require both choices and a correct answer.' };
    }
    return { valid: true };
  }

  // multiple_choice, sign_to_text, text_to_sign, solve_to_sign, pecs, and any
  // teacher-defined custom type all share the same "N choices + exactly one
  // matching correct answer" structure.
  if (payload.options.length < 2) {
    return { valid: false, error: 'At least two answer choices are required.' };
  }
  if (!payload.correctAnswer) {
    return { valid: false, error: 'A correct answer is required.' };
  }
  const matchCount = payload.options.filter((opt) => opt === payload.correctAnswer).length;
  if (matchCount !== 1) {
    return {
      valid: false,
      error:
        matchCount === 0
          ? 'The correct answer must match exactly one of the provided answer choices.'
          : 'The correct answer matches more than one choice — choices must be unique.',
    };
  }
  return { valid: true };
}

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

export function deserializeSequences(stored: any[] | undefined | null): number[][][] {
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
// FIX: metadata is now run through stripUndefinedValues before the write.
// Firestore's addDoc()/setDoc() reject any field whose value is `undefined`
// (as opposed to `null`), and callers of this function have historically
// passed loose objects like `{ submissionId, activityQuestionId }` where
// `activityQuestionId` can legitimately be `undefined`. Wrapping it here,
// once, protects every current and future call site instead of relying on
// each caller to remember to sanitize its own metadata object.
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
    await addDoc(
      collection(db, 'notifications'),
      stripUndefinedValues({
        userId: teacherId || '',
        recipientId: teacherId || '',
        userEmail: teacherEmail || '',
        recipientEmail: teacherEmail || '',
        title,
        message,
        type,
        read: false,
        isRead: false,
        metadata: stripUndefinedValues(metadata),
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
      })
    );
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
  const normalized = normalizeActivityPayload(input);
  const validation = validateActivityPayload(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'This activity question is invalid.');
  }

  return await addDoc(
    collection(db, 'content_submissions'),
    stripUndefinedValues({
      category: normalized.category,
      difficulty: normalized.difficulty,
      type: normalized.type,
      submissionType: input.submissionType || (input.activityQuestionId ? 'update' : 'create'),
      level: normalized.level,
      questionText: normalized.questionText,
      question_text: normalized.questionText,
      correctAnswer: normalized.correctAnswer,
      correct_answer: normalized.correctAnswer,
      options: normalized.options,
      imageUrl: normalized.imageUrl,
      image_url: normalized.imageUrl,
      activityQuestionId: input.activityQuestionId || null,
      status,
      isArchived: false,
      createdById: userId,
      createdByName: userName,
      createdByEmail: userEmail,
      createdAt: serverTimestamp(),
      submittedAt: submitNow ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    })
  );
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
  const normalized = normalizeActivityPayload(input);
  const validation = validateActivityPayload(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'This activity question is invalid.');
  }

  return await updateDoc(
    docRef,
    stripUndefinedValues({
      category: normalized.category,
      difficulty: normalized.difficulty,
      type: normalized.type,
      submissionType: input.submissionType || 'update',
      level: normalized.level,
      questionText: normalized.questionText,
      question_text: normalized.questionText,
      correctAnswer: normalized.correctAnswer,
      correct_answer: normalized.correctAnswer,
      options: normalized.options,
      imageUrl: normalized.imageUrl,
      image_url: normalized.imageUrl,
      status,
      updatedAt: serverTimestamp(),
      ...(submitNow ? { submittedAt: serverTimestamp() } : {}),
    })
  );
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
  const isDeletion = sub.submissionType === 'delete';
  const isTrainingSync = sub.submissionType === 'train_parameters';

  let targetQuestionId = sub.activityQuestionId;

  // Fallback for the deletion/training-sync branches below, neither of which
  // touches activity_questions.level. The real create/update branch further
  // down (normal activity approval) determines this itself — see the
  // AUTOMATIC LEVEL ASSIGNMENT comment there.
  let level: string = sub.level || sub.publishedLevel || `${sub.category}_${sub.difficulty}_1`;

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
    // Defense-in-depth: re-validate against the same policy the submission
    // form enforces, so a malformed or Easy/complex-type-mismatched question
    // can never be published even if it somehow reached this point (e.g. an
    // older submission created before this validation existed).
    const normalized = normalizeActivityPayload({
      category: sub.category,
      difficulty: sub.difficulty,
      type: sub.type || 'sign_to_text',
      level,
      questionText: sub.questionText || sub.question_text,
      correctAnswer: sub.correctAnswer || sub.correct_answer,
      options: sub.options,
      imageUrl: sub.imageUrl || sub.image_url,
    });
    const validation = validateActivityPayload(normalized);
    if (!validation.valid) {
      throw new Error(`Cannot approve this activity question: ${validation.error}`);
    }

    // -----------------------------------------------------------------
    // AUTOMATIC LEVEL ASSIGNMENT (see lib/level-assignment.ts)
    // -----------------------------------------------------------------
    // A brand-new activity (no existing published doc yet, i.e. no
    // targetQuestionId) is assigned the next available slot in its
    // Category+Difficulty level sequence, reserved atomically so
    // concurrent approvals can never collide. Re-approving an EDIT to an
    // activity that is already published keeps the level it already
    // occupies — it already has a slot, so it is never reassigned.
    let newActivityLevelNumber: number | undefined;
    if (targetQuestionId) {
      const existingQuestionSnap = await getDoc(doc(db, 'activity_questions', targetQuestionId));
      level =
        (existingQuestionSnap.exists() ? (existingQuestionSnap.data() as any).level : undefined) ||
        level;
    } else {
      const reservation = await reserveNextLevel(normalized.category, normalized.difficulty);
      level = reservation.level;
      newActivityLevelNumber = reservation.levelNumber;
    }

    // Written under both camelCase and snake_case keys (see
    // "IMPORTANT FIREBASE PAYLOAD FIX") so existing consumers that expect
    // either naming convention keep working without a migration.
    const questionPayload = stripUndefinedValues({
      category: normalized.category,
      difficulty: normalized.difficulty,
      level,
      type: normalized.type,
      question_text: normalized.questionText,
      questionText: normalized.questionText,
      correct_answer: normalized.correctAnswer,
      correctAnswer: normalized.correctAnswer,
      options: normalized.options,
      image_url: normalized.imageUrl,
      imageUrl: normalized.imageUrl,
      updatedAt: serverTimestamp(),
    });

    if (targetQuestionId) {
      const questionRef = doc(db, 'activity_questions', targetQuestionId);
      await setDoc(questionRef, questionPayload, { merge: true });
    } else {
      // Deterministic activity_questions document ID (see
      // "ACTIVITY-QUESTION IDENTIFIER" above) built from the freshly
      // reserved level number, not the raw `level` string.
      const baseId = buildActivityQuestionId(
        normalized.category,
        normalized.difficulty,
        newActivityLevelNumber ?? 1,
        normalized.questionText,
        normalized.correctAnswer
      );

      // Guard against accidentally overwriting an existing activity: the
      // base ID is deterministic, so two different questions that happen
      // to produce the same slug (e.g. identical question+answer text at
      // the same level) must not collide. Walk suffixes until a free ID is
      // found; this never touches or renumbers any existing document.
      let candidateId = baseId;
      let suffix = 2;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidateSnap = await getDoc(doc(db, 'activity_questions', candidateId));
        if (!candidateSnap.exists()) break;
        candidateId = `${baseId}_${suffix}`;
        suffix += 1;
      }

      const questionRef = doc(db, 'activity_questions', candidateId);
      await setDoc(questionRef, {
        ...questionPayload,
        createdAt: serverTimestamp(),
      });
      targetQuestionId = candidateId;
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

  // FIX: was `activityQuestionId: targetQuestionId` — targetQuestionId can
  // be `undefined` here (e.g. a fresh train_parameters submission that
  // never had sub.activityQuestionId set), and Firestore's addDoc() throws
  // on any field whose value is `undefined`. Coerced to `null` to match the
  // updateDoc(subRef, ...) call directly above, which already does this
  // correctly. This is what was causing:
  //   "Unsupported field value: undefined (found in field
  //    metadata.activityQuestionId in document notifications/...)"
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
    { submissionId, activityQuestionId: targetQuestionId || null }
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