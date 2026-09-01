#!/usr/bin/env node
/**
 * scripts/upload-tflite-to-storage.js
 *
 * Uploads public/models/alphabet_j/model.tflite and
 * public/models/alphabet_z/model.tflite (produced by
 * scripts/convert_tfjs_to_tflite.py) to this project's Firebase Storage
 * bucket — the same `storage` this app already uses for uploaded files
 * (see lib/content-service.ts, which uploads to the `activities/` prefix
 * the same way). Uploaded to a `models/<target>/model.tflite` path here.
 *
 * After uploading, it stamps the matching gesture_training_data/<docId>
 * Firestore document (same collection/doc-id convention as
 * scripts/mark-model-deployed.js) with the download URL, so the admin
 * dashboard / app code can find it without touching Storage directly.
 *
 * ASSUMPTION: "put it on database" is read here as "upload to this
 * project's Firebase Storage bucket + record the URL in Firestore," since
 * that's the pattern already used elsewhere in this codebase (see
 * lib/firebase.ts:storage and lib/content-service.ts's uploadBytes call).
 * If you actually meant something else (e.g. store the raw .tflite bytes
 * as base64 directly inside the Firestore doc), say so and this script can
 * be adjusted — note that a base64 .tflite may not fit Firestore's 1MB
 * per-document limit for larger models.
 *
 * USAGE (from repo root, after running convert_tfjs_to_tflite.py):
 *   node scripts/upload-tflite-to-storage.js
 *
 * REQUIRED ENV VARS (same as the other scripts here — read from the
 * environment or .env.local):
 *   FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *   FIREBASE_STORAGE_BUCKET (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
  { target: 'alphabet_j', docId: 'alphabet_j' },
  { target: 'alphabet_z', docId: 'alphabet_z' },
];

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
  const { getStorage } = require('firebase-admin/storage');

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/['",]/g, '').trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '').trim().replace(/\\n/g, '\n');
  }
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey || !bucketName) {
    console.error(
      'Missing Firebase Admin credentials or bucket name. Set FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_STORAGE_BUCKET ' +
        '(in the environment or .env.local) before running this script.'
    );
    process.exitCode = 1;
    return;
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: bucketName,
  });
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket();

  for (const { target, docId } of TARGETS) {
    const localPath = path.join(MODELS_DIR, target, 'model.tflite');
    if (!fs.existsSync(localPath)) {
      console.warn(`[skip] ${target}: ${localPath} not found — run convert_tfjs_to_tflite.py first.`);
      continue;
    }

    const destination = `models/${target}/model.tflite`;
    console.log(`Uploading ${localPath} -> gs://${bucketName}/${destination} ...`);

    await bucket.upload(localPath, {
      destination,
      metadata: { contentType: 'application/octet-stream' },
    });

    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2100',
    });

    const docRef = db.collection('gesture_training_data').doc(docId);
    await docRef.set(
      {
        tfliteModelUrl: url,
        tfliteStoragePath: destination,
        tfliteUploadedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`  [ok] ${target}: uploaded and recorded on gesture_training_data/${docId}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exitCode = 1;
});