import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { requireAdminAccess } from '@/lib/server-auth';

// ==========================================================================
// AUTO-RETRAIN TRIGGER
// ==========================================================================
// Runs the same two steps a trainer previously had to run by hand after every
// approval:
//   1. node scripts/export-training-dataset.js  (gesture_training_data ->
//      training_data/*.npy, admin-approved samples only)
//   2. python(venv) scripts/train_gesture_lstm.py (training_data/*.npy ->
//      gesture_lstm.h5 + labels.json, auto-deployed to
//      public/models/gesture_lstm/)
//
// IMPORTANT — WHERE THIS DOES AND DOES NOT WORK
// This route spawns real OS processes (node + python) on whatever machine is
// running the Next.js server. That means it works when this app is run
// locally (`npm run dev`) or self-hosted on a server/VM that has Node,
// Python, and this project's `venv` folder all present — exactly the setup
// used to build and test this pipeline. It will NOT work on serverless hosts
// like Vercel: those don't allow spawning arbitrary child processes or
// persisting a Python venv / trained model files between requests. If this
// app is deployed there, this route intentionally fails with a clear error
// instead of pretending to have retrained anything — see the ENOENT handling
// below. The fix for a serverless deployment is to move steps 1–2 into a
// separate always-on worker (e.g. a small VM or Cloud Run job) that this
// route calls over HTTP instead of spawning locally; that's outside the
// scope of this app.
//
// Kept synchronous (the HTTP request stays open until both steps finish) so
// the admin approval screen can show a real "done" state — training a couple
// hundred samples' worth of a small LSTM is normally well under a minute,
// but this can take longer as the dataset grows.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // hint for hosts that respect it; irrelevant when self-hosted

const REPO_ROOT = path.join(process.cwd());

function findPythonBin(): string {
  // Prefer this project's own venv so we use the exact interpreter/deps the
  // trainer already set up (see scripts/run_training_pipeline.sh comments).
  const isWindows = process.platform === 'win32';
  const venvPython = isWindows
    ? path.join(REPO_ROOT, 'venv', 'Scripts', 'python.exe')
    : path.join(REPO_ROOT, 'venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;

  // Explicit override for non-standard setups.
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;

  // Last resort: whatever "python3"/"python" resolves to on PATH.
  return isWindows ? 'python' : 'python3';
}

function runCommand(command: string, args: string[], cwd: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', (err) => {
      output += `\n[spawn error] ${err.message}`;
      resolve({ code: -1, output });
    });
    child.on('close', (code) => {
      resolve({ code, output });
    });
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  // Step 1: export approved Firestore data to training_data/*.npy
  const exportResult = await runCommand('node', ['scripts/export-training-dataset.js'], REPO_ROOT);
  const trainingDataDir = path.join(REPO_ROOT, 'training_data');
  const hasExportedFiles =
    fs.existsSync(trainingDataDir) && fs.readdirSync(trainingDataDir).some((f) => f.endsWith('.npy'));

  if (exportResult.code !== 0 || !hasExportedFiles) {
    return NextResponse.json(
      {
        success: false,
        stage: 'export',
        error: hasExportedFiles
          ? 'Export step exited with an error.'
          : 'Export step produced no training_data/*.npy files — likely not enough approved samples/classes yet.',
        log: exportResult.output,
      },
      { status: 200 } // not a server error — this is a legitimate "not ready" state
    );
  }

  // Step 2: train the LSTM (only proceeds if step 1 actually produced data)
  const pythonBin = findPythonBin();
  const trainResult = await runCommand(pythonBin, ['scripts/train_gesture_lstm.py'], path.join(REPO_ROOT, 'scripts'));

  if (trainResult.code !== 0) {
    const notFound = /ENOENT|not recognized|not found/i.test(trainResult.output);
    return NextResponse.json(
      {
        success: false,
        stage: 'train',
        error: notFound
          ? `Could not run the Python trainer (looked for "${pythonBin}"). This route only works when the Next.js server itself has access to this project's venv/Python — e.g. running locally or self-hosted, not on serverless hosts. See the comment at the top of this route file.`
          : 'Training step exited with an error (often: fewer than 2 approved sign classes — an LSTM needs at least 2 to train).',
        log: trainResult.output,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    success: true,
    exportLog: exportResult.output,
    trainLog: trainResult.output,
  });
}