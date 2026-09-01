#!/usr/bin/env node
/**
 * scripts/mark-model-deployed.js
 *
 * Stamps gesture_training_data documents as trained+deployed once their
 * label has an entry in public/models/gesture_lstm/labels.json (i.e. once
 * scripts/train_gesture_lstm.py + tensorflowjs_converter have actually run
 * and the model is live at public/models/gesture_lstm/).
 *
 * This does NOT touch training_data/*.npy or the raw trainingSequences on
 * each doc — it only updates status/audit fields, because the trained model
 * itself is never stored in Firestore (see lib/gesture-sequence-model.ts,
 * which loads it from public/models/gesture_lstm/ as static files).
 *
 * USAGE (from repo root, after converting a model):
 *   node scripts/mark-model-deployed.js
 *
 * REQUIRED ENV VARS (same as scripts/export-training-dataset.js):
 *   FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 * Read from the environment, or from .env.local in the project root.
 */

const fs = require('fs');
const path = require('path');

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

const LABELS_PATH = path.join(__dirname, '..', 'public', 'models', 'gesture_lstm', 'labels.json');

async function main() {
  if (!fs.existsSync(LABELS_PATH)) {
    console.error(
      `No deployed model found at ${LABELS_PATH}. Run scripts/train_gesture_lstm.py and the ` +
        'tensorflowjs_converter step first — nothing to mark as deployed yet.'
    );
    process.exitCode = 1;
    return;
  }

  const labels = JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8'));
  if (!Array.isArray(labels) || labels.length === 0) {
    console.error(`${LABELS_PATH} exists but contains no labels — nothing to mark.`);
    process.exitCode = 1;
    return;
  }

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

  console.log(`Marking ${labels.length} class(es) as model_deployed: ${labels.join(', ')}\n`);

  let updated = 0;
  let missing = 0;

  for (const label of labels) {
    // Doc id === the label === the .npy filename stem, by construction
    // (see lib/content-service.ts:buildGestureTrainingDocId and
    // scripts/export-training-dataset.js's output filenames).
    const docRef = db.collection('gesture_training_data').doc(label);
    const snap = await docRef.get();

    if (!snap.exists) {
      console.warn(`  [skip] ${label}: no matching gesture_training_data document found.`);
      missing += 1;
      continue;
    }

    await docRef.set(
      {
        trainingStatus: 'model_deployed',
        modelDeployedAt: FieldValue.serverTimestamp(),
        modelLabels: labels,
      },
      { merge: true }
    );
    console.log(`  [ok]   ${label}: trainingStatus -> model_deployed`);
    updated += 1;
  }

  console.log(`\nDone. Updated ${updated}, skipped ${missing} (no matching doc).`);
}

main().catch((err) => {
  console.error('Failed to mark documents as deployed:', err);
  process.exitCode = 1;
});