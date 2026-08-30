#!/usr/bin/env node
/**
 * Dataset exporter: gesture_training_data (Firestore) -> training_data/*.npy
 *
 * This is the missing link between "admin has approved a sign's training
 * submissions" and "scripts/train_gesture_lstm.py has something to train
 * on." It does NOT fabricate anything: if a gesture has zero or malformed
 * approved samples, it is reported and skipped, never padded with synthetic
 * data.
 *
 * WHAT IT READS
 *   The `gesture_training_data` collection only. This collection is written
 *   to exclusively by lib/content-service.ts's approveContentSubmission()
 *   when an admin approves a `train_parameters` submission — a pending or
 *   rejected submission never reaches this collection. So "every document in
 *   gesture_training_data" already means "every APPROVED gesture dataset";
 *   there is no separate pending/approved flag to filter on beyond that.
 *
 * WHAT IT DOES
 *   1. Reads every doc in gesture_training_data.
 *   2. Unwraps Firestore's array-of-maps storage form back into plain
 *      number[][][] (mirrors content-service.ts's deserializeSequences —
 *      duplicated here, not imported, because content-service.ts uses the
 *      Firebase *client* SDK and this script uses the *admin* SDK; the
 *      unwrap logic itself is a few lines and is kept intentionally
 *      identical, see unwrapSequence() below).
 *   3. Validates every sequence: must have `sequenceLength` frames (30
 *      unless the doc says otherwise), each frame must have `frameLength`
 *      numeric, finite values (126 unless the doc says otherwise).
 *   4. Re-applies the SAME wrist-centered/scale-normalized transform used at
 *      capture time (lib/posture-metrics.ts:normalizeFeatureVector,
 *      reimplemented here for the same admin-vs-client-SDK reason above).
 *      That transform is idempotent, so for data captured after this
 *      normalization fix it is a no-op; it only does real work as a safety
 *      net against any pre-existing/raw sequences.
 *   5. Rejects and reports (does not silently drop) any sample that fails
 *      validation, with a reason.
 *   6. Writes one training_data/<category>_<gestureKey>.npy per gesture
 *      that has at least one valid sample, shape (N, sequenceLength,
 *      frameLength), float64, in real NPY format (no numpy/python
 *      dependency needed to write it — see writeNpy() below). The filename
 *      is the Firestore document id (category_gestureKey), not the bare
 *      gestureKey field, so two different signs in different categories
 *      that happen to share a gestureKey can never collide/overwrite each
 *      other's file — the document id is unique by construction (see
 *      lib/content-service.ts:buildGestureTrainingDocId).
 *   7. Prints a full report: classes found, samples per class, rejected
 *      samples + reasons, and the final shape written per class. If NO
 *      class has any valid samples, it says so plainly and writes nothing.
 *
 * USAGE
 *   node scripts/export-training-dataset.js
 *   npm run export:dataset
 *
 * REQUIRED ENV VARS (same ones the Next.js app already uses server-side —
 * see lib/firebase-admin.ts — no new credentials to set up):
 *   FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 * These are read from the environment, or from a .env.local file in the
 * project root if present (parsed manually below — no new dependency).
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Minimal .env.local loader (no dotenv dependency). Next.js reads this file
// automatically for the app itself, but a standalone Node script does not
// get that for free, so we load it ourselves if present.
// ---------------------------------------------------------------------------
function loadDotEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
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

const DATA_DIR = path.join(__dirname, '..', 'training_data');
const DEFAULT_SEQUENCE_LENGTH = 30;
const DEFAULT_FEATURE_LENGTH = 126;
const WRIST_IDX = 0;
const MIDDLE_MCP_IDX = 9;

// ---------------------------------------------------------------------------
// Mirrors lib/content-service.ts:deserializeSequences exactly. Firestore
// can't store arrays-of-arrays, so each sample is wrapped as
// { frames: [ { f: number[] }, ... ] }. This unwraps it back to number[][].
// ---------------------------------------------------------------------------
function unwrapSequence(stored) {
  if (!stored || !Array.isArray(stored.frames)) return [];
  return stored.frames.map((fr) => (fr && Array.isArray(fr.f) ? fr.f : []));
}

// ---------------------------------------------------------------------------
// Mirrors lib/posture-metrics.ts:normalizeFeatureVector exactly. See that
// file for the full rationale. Idempotent by construction, so safe to apply
// even to data that was already normalized at capture time.
// ---------------------------------------------------------------------------
function normalizeFeatureVector(vector) {
  const wristX = vector[WRIST_IDX * 3];
  const wristY = vector[WRIST_IDX * 3 + 1];
  const wristZ = vector[WRIST_IDX * 3 + 2];

  const midX = vector[MIDDLE_MCP_IDX * 3];
  const midY = vector[MIDDLE_MCP_IDX * 3 + 1];
  const scale = Math.hypot(midX - wristX, midY - wristY) || 1;

  const normalized = new Array(vector.length);
  for (let i = 0; i < vector.length; i += 3) {
    normalized[i] = (vector[i] - wristX) / scale;
    normalized[i + 1] = (vector[i + 1] - wristY) / scale;
    normalized[i + 2] = (vector[i + 2] - wristZ) / scale;
  }
  return normalized;
}

/**
 * Validates one sample (a sequence of frames). Returns { valid, reason }.
 * Never mutates or fabricates data — only checks shape and numeric sanity.
 */
function validateSample(sample, sequenceLength, frameLength) {
  if (!Array.isArray(sample) || sample.length !== sequenceLength) {
    return {
      valid: false,
      reason: `expected ${sequenceLength} frames, got ${Array.isArray(sample) ? sample.length : typeof sample}`,
    };
  }
  for (let i = 0; i < sample.length; i++) {
    const frame = sample[i];
    if (!Array.isArray(frame) || frame.length !== frameLength) {
      return {
        valid: false,
        reason: `frame ${i} expected ${frameLength} features, got ${Array.isArray(frame) ? frame.length : typeof frame}`,
      };
    }
    for (let j = 0; j < frame.length; j++) {
      const v = frame[j];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        return { valid: false, reason: `frame ${i} feature ${j} is not a finite number (got ${v})` };
      }
    }
  }
  return { valid: true };
}

/**
 * Writes a 3D float64 array to disk in real NumPy .npy format (version 1.0),
 * so `np.load()` on the Python training side reads it with no conversion
 * step. Implemented by hand so this script has zero new dependencies.
 * Spec: https://numpy.org/doc/stable/reference/generated/numpy.lib.format.html
 */
function writeNpy(filePath, data, shape) {
  const [n, seqLen, featLen] = shape;
  const totalValues = n * seqLen * featLen;

  const headerDict = `{'descr': '<f8', 'fortran_order': False, 'shape': (${n}, ${seqLen}, ${featLen}), }`;
  // Header must be padded so (magic[6] + version[2] + headerLen[2] + header)
  // is a multiple of 64 bytes, and must end in '\n'.
  const preambleLen = 6 + 2 + 2;
  let header = headerDict;
  const unpaddedTotal = preambleLen + header.length + 1; // +1 for trailing \n
  const padding = (64 - (unpaddedTotal % 64)) % 64;
  header = header + ' '.repeat(padding) + '\n';

  const headerLenBuf = Buffer.alloc(2);
  headerLenBuf.writeUInt16LE(header.length, 0);

  const magic = Buffer.from([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]); // \x93NUMPY
  const version = Buffer.from([0x01, 0x00]);
  const headerBuf = Buffer.from(header, 'latin1');

  const dataBuf = Buffer.alloc(totalValues * 8);
  let offset = 0;
  for (let i = 0; i < n; i++) {
    for (let f = 0; f < seqLen; f++) {
      for (let c = 0; c < featLen; c++) {
        dataBuf.writeDoubleLE(data[i][f][c], offset);
        offset += 8;
      }
    }
  }

  fs.writeFileSync(filePath, Buffer.concat([magic, version, headerLenBuf, headerBuf, dataBuf]));
}

async function main() {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');

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

  console.log('Reading gesture_training_data collection...');
  const snapshot = await db.collection('gesture_training_data').get();

  if (snapshot.empty) {
    console.log('\n=== EXPORT REPORT ===');
    console.log('No documents found in gesture_training_data.');
    console.log('This means no teacher-submitted training data has ever been approved by an admin.');
    console.log('TRAINING CANNOT PROCEED — nothing to export. No files were written.');
    return;
  }

  const report = {
    classes: [],
    totalValidSamples: 0,
    totalRejectedSamples: 0,
    rejections: [],
  };

  let anyWritten = false;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const gestureKey = data.gestureKey;
    if (!gestureKey || typeof gestureKey !== 'string') {
      report.rejections.push({ doc: doc.id, reason: 'document has no valid gestureKey field — skipped entirely' });
      continue;
    }

    // The document id is already `${category}_${gestureKey}` (see
    // lib/content-service.ts:buildGestureTrainingDocId) and Firestore
    // document ids are unique by construction, so using it as the export
    // filename/class-label guarantees two different signs — even ones that
    // happen to share the same gestureKey text in different categories —
    // can never overwrite each other's .npy file. Using the bare gestureKey
    // here instead would not have that guarantee.
    const exportLabel = doc.id;

    const sequenceLength = data.sequenceLength || DEFAULT_SEQUENCE_LENGTH;
    const frameLength = data.frameLength || DEFAULT_FEATURE_LENGTH;
    const wrappedSamples = Array.isArray(data.trainingSequences) ? data.trainingSequences : [];

    const validSamples = [];
    let rejectedForThisClass = 0;

    wrappedSamples.forEach((wrapped, idx) => {
      const raw = unwrapSequence(wrapped);
      const validation = validateSample(raw, sequenceLength, frameLength);
      if (!validation.valid) {
        rejectedForThisClass++;
        report.totalRejectedSamples++;
        report.rejections.push({ gestureKey, exportLabel, sampleIndex: idx, reason: validation.reason });
        return;
      }
      const normalized = raw.map((frame) => normalizeFeatureVector(frame));
      validSamples.push(normalized);
    });

    if (validSamples.length === 0) {
      report.classes.push({
        gestureKey,
        exportLabel,
        category: data.category || null,
        validSamples: 0,
        rejectedSamples: rejectedForThisClass,
        written: false,
      });
      continue;
    }

    const outPath = path.join(DATA_DIR, `${exportLabel}.npy`);
    writeNpy(outPath, validSamples, [validSamples.length, sequenceLength, frameLength]);
    anyWritten = true;

    report.classes.push({
      gestureKey,
      exportLabel,
      category: data.category || null,
      validSamples: validSamples.length,
      rejectedSamples: rejectedForThisClass,
      written: true,
      shape: [validSamples.length, sequenceLength, frameLength],
    });
    report.totalValidSamples += validSamples.length;
  }

  console.log('\n=== EXPORT REPORT ===');
  console.log(`Gesture classes found: ${report.classes.length}`);
  for (const c of report.classes) {
    if (c.written) {
      console.log(`  - ${c.exportLabel} (gestureKey: ${c.gestureKey}, category: ${c.category}): ${c.validSamples} valid samples -> shape ${JSON.stringify(c.shape)}, ${c.rejectedSamples} rejected`);
    } else {
      console.log(`  - ${c.exportLabel} (gestureKey: ${c.gestureKey}, category: ${c.category}): 0 valid samples (${c.rejectedSamples} rejected) — NOT written, insufficient data`);
    }
  }
  console.log(`\nTotal valid samples exported: ${report.totalValidSamples}`);
  console.log(`Total rejected samples: ${report.totalRejectedSamples}`);
  if (report.rejections.length > 0) {
    console.log('\nRejection reasons:');
    for (const r of report.rejections) {
      if (r.doc) console.log(`  - doc ${r.doc}: ${r.reason}`);
      else console.log(`  - ${r.exportLabel} (gestureKey: ${r.gestureKey}) sample #${r.sampleIndex}: ${r.reason}`);
    }
  }

  const writableClasses = report.classes.filter((c) => c.written);
  if (!anyWritten) {
    console.log('\nTRAINING CANNOT PROCEED — every gesture had zero valid samples. No .npy files were written.');
  } else {
    console.log(`\nWrote ${writableClasses.length} file(s) to ${DATA_DIR}/`);
    console.log('DATASET PREPARATION COMPLETE. This does NOT mean a model has been trained yet.');
    console.log('Next step: python scripts/train_gesture_lstm.py');
    if (writableClasses.length < 2) {
      console.log(
        '\nNOTE: an LSTM classifier needs at least 2 classes to train (softmax over >=2 outputs). ' +
          `Only ${writableClasses.length} class currently has valid data — training will fail until a second sign is approved.`
      );
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Export failed:', err);
    process.exitCode = 1;
  });
}

module.exports = { unwrapSequence, normalizeFeatureVector, validateSample, writeNpy };