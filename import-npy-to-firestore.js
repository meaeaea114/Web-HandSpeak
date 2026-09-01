#!/usr/bin/env node
/**
 * import-npy-to-firestore.js
 *
 * Fixes the "alphabet_j / alphabet_z are hardcoded" problem: right now
 * training_data/alphabet_j.npy and training_data/alphabet_z.npy exist ONLY
 * as local files (produced by convert_asl_alphabet_motion.py), so they never
 * show up in the gesture_training_data Firestore collection the way every
 * other sign (e.g. phrases_hello) does. That means:
 *   - They're invisible in the Firebase console / admin dashboard.
 *   - scripts/export-training-dataset.js has no idea they exist, so if
 *     someone wipes training_data/ and re-runs the exporter, J and Z vanish.
 *
 * This script is the one-time bridge: it reads the two existing .npy files,
 * unpacks each sample, and writes them into gesture_training_data/alphabet_j
 * and gesture_training_data/alphabet_z using the EXACT same document shape
 * lib/content-service.ts:approveContentSubmission() writes for every other
 * approved sign (see phrases_hello in your screenshot). After this runs:
 *   - alphabet_j / alphabet_z appear in Firestore next to phrases_hello.
 *   - scripts/export-training-dataset.js will regenerate the same .npy
 *     files from Firestore on every future run — no more hardcoding.
 *   - You can safely delete the two .npy files from disk afterwards; the
 *     exporter will recreate them from Firestore.
 *
 * USAGE
 *   node import-npy-to-firestore.js
 *
 * REQUIRED ENV VARS (same as scripts/export-training-dataset.js; read from
 * the environment or a .env.local file in the project root):
 *   FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * Place this file in your project root (next to convert_asl_alphabet_motion.py)
 * before running it, so the relative training_data/ and .env.local paths resolve.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// EDIT THESE if you want the Firestore record to credit someone other than
// "Data Import" for training/approving this dataset. Purely cosmetic —
// shown in the admin dashboard the same way "Dan S. Rey" / "Mea" are for
// phrases_hello.
// ---------------------------------------------------------------------------
const IMPORTED_BY = 'Data Import';

// Which .npy files to import, and the metadata each one needs. This mirrors
// DEFAULT_TUTORIAL_LESSONS.alphabet in lib/content-service.ts: gestureKey is
// the uppercase letter, contentId is `alpha_<lowercase>`, and label matches
// the `${displayTitle} (${GESTUREKEY})` convention approveContentSubmission
// derives from questionText.
const LETTERS = [
  {
    letter: 'J',
    npyFile: 'alphabet_j.npy',
    docId: 'alphabet_j', // must match buildGestureTrainingDocId('alphabet','J')
    gestureKey: 'J',
    category: 'alphabet',
    contentId: 'alpha_j',
    label: 'Jj (J)',
  },
  {
    letter: 'Z',
    npyFile: 'alphabet_z.npy',
    docId: 'alphabet_z', // must match buildGestureTrainingDocId('alphabet','Z')
    gestureKey: 'Z',
    category: 'alphabet',
    contentId: 'alpha_z',
    label: 'Zz (Z)',
  },
];

// Same cap approveContentSubmission() applies, so a single import can never
// blow past Firestore's 1MB document limit.
const MAX_STORED_SEQUENCES = 60;

// Default tolerance bounds — same fallback approveContentSubmission() uses
// when a submission doesn't specify its own (sub.toleranceBounds || this).
const DEFAULT_TOLERANCE_BOUNDS = { rotate: 85, tilt: 75, distance: 60, switchHands: 50 };

// ---------------------------------------------------------------------------
// Minimal .env.local loader — identical to export-training-dataset.js, so
// this script picks up the same credentials with no extra setup.
// ---------------------------------------------------------------------------
function loadDotEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvLocal();

const DATA_DIR = path.join(__dirname, 'training_data');

// ---------------------------------------------------------------------------
// Minimal NPY reader (the read-side counterpart of writeNpy() in
// export-training-dataset.js). Handles the plain little-endian float64,
// C-order arrays that both numpy.save() and that writeNpy() produce — which
// is exactly what convert_asl_alphabet_motion.py wrote for these two files.
// No numpy/python dependency needed.
// ---------------------------------------------------------------------------
function readNpy(filePath) {
  const buf = fs.readFileSync(filePath);

  const magic = buf.subarray(0, 6).toString('latin1');
  if (magic !== '\x93NUMPY') {
    throw new Error(`${filePath}: not a valid .npy file (bad magic bytes)`);
  }

  const majorVersion = buf.readUInt8(6);
  let headerLen;
  let headerStart;
  if (majorVersion === 1) {
    headerLen = buf.readUInt16LE(8);
    headerStart = 10;
  } else {
    headerLen = buf.readUInt32LE(8);
    headerStart = 12;
  }

  const headerStr = buf.subarray(headerStart, headerStart + headerLen).toString('latin1');
  const dataStart = headerStart + headerLen;

  const descrMatch = headerStr.match(/'descr':\s*'([^']+)'/);
  const shapeMatch = headerStr.match(/'shape':\s*\(([^)]*)\)/);
  const fortranMatch = headerStr.match(/'fortran_order':\s*(True|False)/);
  if (!descrMatch || !shapeMatch) {
    throw new Error(`${filePath}: could not parse .npy header: ${headerStr}`);
  }

  const descr = descrMatch[1];
  const fortranOrder = fortranMatch ? fortranMatch[1] === 'True' : false;
  const shape = shapeMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);

  if (fortranOrder) {
    throw new Error(`${filePath}: fortran-ordered arrays are not supported by this reader.`);
  }
  if (descr !== '<f8') {
    throw new Error(
      `${filePath}: expected float64 little-endian ('<f8') data, got '${descr}'. ` +
        `Re-save the file with numpy as float64, or extend readNpy() to handle this dtype.`
    );
  }

  const totalValues = shape.reduce((a, b) => a * b, 1);
  const flat = new Float64Array(totalValues);
  for (let i = 0; i < totalValues; i++) {
    flat[i] = buf.readDoubleLE(dataStart + i * 8);
  }

  return { shape, flat };
}

// Reshapes a flat (N * seqLen * featLen) Float64Array into a plain JS
// number[][][] (samples x frames x features), C-order — the same nested
// shape lib/content-service.ts:serializeSequences() expects as input.
function reshapeTo3D(flat, shape) {
  const [n, seqLen, featLen] = shape;
  const samples = new Array(n);
  let offset = 0;
  for (let i = 0; i < n; i++) {
    const frames = new Array(seqLen);
    for (let f = 0; f < seqLen; f++) {
      const frame = new Array(featLen);
      for (let c = 0; c < featLen; c++) {
        frame[c] = flat[offset++];
      }
      frames[f] = frame;
    }
    samples[i] = frames;
  }
  return samples;
}

// Mirrors lib/content-service.ts:serializeSequences exactly — Firestore
// rejects arrays-of-arrays, so each sample's frames get wrapped as
// { frames: [ { f: number[] }, ... ] }.
function serializeSequences(sequences) {
  return sequences.map((sample) => ({
    frames: sample.map((frame) => ({ f: frame })),
  }));
}

async function main() {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore, FieldValue } = require('firebase-admin/firestore');

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/['",]/g, '').trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '').trim().replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and ' +
        'FIREBASE_PRIVATE_KEY (in the environment or .env.local) before running this script.'
    );
    process.exitCode = 1;
    return;
  }

  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore(app);

  for (const entry of LETTERS) {
    const npyPath = path.join(DATA_DIR, entry.npyFile);
    if (!fs.existsSync(npyPath)) {
      console.error(`Skipping ${entry.letter}: ${npyPath} not found.`);
      continue;
    }

    console.log(`Reading ${npyPath} ...`);
    const { shape, flat } = readNpy(npyPath);
    if (shape.length !== 3) {
      console.error(`Skipping ${entry.letter}: expected a 3D array (N, seqLen, featLen), got shape ${shape}`);
      continue;
    }
    const [n, sequenceLength, frameLength] = shape;
    console.log(`  shape: (${n}, ${sequenceLength}, ${frameLength})`);

    const samples = reshapeTo3D(flat, shape);
    const wrapped = serializeSequences(samples).slice(-MAX_STORED_SEQUENCES);

    const gestureDocRef = db.collection('gesture_training_data').doc(entry.docId);

    await gestureDocRef.set(
      {
        gestureKey: entry.gestureKey,
        category: entry.category,
        contentId: entry.contentId,
        label: entry.label,
        sampleCount: n,
        accuracyThreshold: 85,
        toleranceBounds: DEFAULT_TOLERANCE_BOUNDS,
        trainingSequences: wrapped,
        sequenceLength,
        frameLength,
        // Honest status, same convention approveContentSubmission() uses:
        // this only confirms the dataset is synced to Firestore, not that
        // a model has been (re)trained on it yet.
        trainingStatus: 'approved_awaiting_model',
        lastTrainedAt: FieldValue.serverTimestamp(),
        lastTrainedBy: IMPORTED_BY,
        approvedBy: IMPORTED_BY,
        approvedAt: FieldValue.serverTimestamp(),
        status: 'active',
      },
      { merge: true }
    );

    console.log(`  wrote gesture_training_data/${entry.docId} (${n} samples)\n`);
  }

  console.log('Done. Check Firestore -> gesture_training_data for alphabet_j / alphabet_z.');
  console.log(
    'From now on, node scripts/export-training-dataset.js will regenerate alphabet_j.npy / ' +
      'alphabet_z.npy from Firestore automatically — the hardcoded files are no longer the source of truth.'
  );
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exitCode = 1;
});