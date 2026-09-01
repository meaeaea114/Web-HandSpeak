#!/usr/bin/env node
/**
 * scripts/upload-tflite-to-firestore.js
 *
 * Firestore-only alternative to scripts/upload-tflite-to-storage.js — use
 * this if your Firebase project is on the free Spark plan, since Cloud
 * Storage buckets require the Blaze (pay-as-you-go) plan and won't exist
 * on Spark ("The specified bucket does not exist.").
 *
 * Uploads exactly two things per target from public/models/<target>/:
 *   - model.tflite  -> modelBase64  (base64 string)
 *   - labels.json   -> labels       (native Firestore array, e.g.
 *                                     ["not_alphabet_j", "alphabet_j"])
 *
 * (model.json and the .bin weight shard — the original TF.js artifacts —
 * are intentionally NOT uploaded; only what the Flutter app's TFLite
 * interpreter + label lookup actually need.)
 *
 * Written to its own document per target, in a new `deployed_models`
 * collection — deliberately NOT merged onto the existing
 * gesture_training_data/<docId> doc, because that doc can already hold up
 * to 60 raw training sequences (see import-npy-to-firestore.js's
 * MAX_STORED_SEQUENCES) which may already be using a large chunk of
 * Firestore's 1MB-per-document limit.
 *
 * Base64 inflates size by ~33%: a ~260KB model.tflite becomes ~346KB as
 * text, comfortably under the 1MB cap on its own. This script prints the
 * actual byte counts and skips (does not silently truncate) any target
 * that would get too close to the limit.
 *
 * USAGE (from repo root, after running tfjs_weights_to_tflite.py):
 *   node scripts/upload-tflite-to-firestore.js
 *
 * REQUIRED ENV VARS (same as the other scripts here — read from the
 * environment or .env.local):
 *   FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
  { target: 'alphabet_j', docId: 'alphabet_j' },
  { target: 'alphabet_z', docId: 'alphabet_z' },
];

// Firestore's hard per-document cap. We warn (not silently truncate) if the
// payload would blow past a safe margin under it.
const FIRESTORE_DOC_LIMIT_BYTES = 1_048_576;
const SAFETY_MARGIN_BYTES = 50_000; // leave room for timestamp/metadata fields

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

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

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

  for (const { target, docId } of TARGETS) {
    const modelDir = path.join(MODELS_DIR, target);
    const tflitePath = path.join(modelDir, 'model.tflite');
    const labelsJsonPath = path.join(modelDir, 'labels.json');

    if (!fs.existsSync(tflitePath)) {
      console.warn(`[skip] ${target}: ${tflitePath} not found — run tfjs_weights_to_tflite.py first.`);
      continue;
    }
    if (!fs.existsSync(labelsJsonPath)) {
      console.warn(`[skip] ${target}: ${labelsJsonPath} not found.`);
      continue;
    }

    const tfliteBytes = fs.readFileSync(tflitePath);
    const tfliteBase64 = tfliteBytes.toString('base64');
    const labels = JSON.parse(fs.readFileSync(labelsJsonPath, 'utf8'));

    console.log(
      `${target}: model.tflite ${tfliteBytes.length}B -> ${tfliteBase64.length}B base64, ` +
        `labels: ${JSON.stringify(labels)}`
    );

    if (tfliteBase64.length > FIRESTORE_DOC_LIMIT_BYTES - SAFETY_MARGIN_BYTES) {
      console.error(
        `  [skip] ${target}: base64 payload (${tfliteBase64.length} bytes) is too close to ` +
          `Firestore's ${FIRESTORE_DOC_LIMIT_BYTES}-byte document limit. Use ` +
          'scripts/upload-tflite-to-storage.js (requires the Blaze plan) instead for a model this size.'
      );
      continue;
    }

    await db.collection('deployed_models').doc(docId).set({
      target,
      format: 'tflite',
      modelBase64: tfliteBase64,
      sizeBytes: tfliteBytes.length,
      labels,
      uploadedAt: FieldValue.serverTimestamp(),
    });

    console.log(`  [ok] ${target}: wrote deployed_models/${docId} (model.tflite + labels)`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exitCode = 1;
});