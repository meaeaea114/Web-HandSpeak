#!/usr/bin/env bash
# Runs the full gesture LSTM pipeline end to end, in order:
#   1. node scripts/export-training-dataset.js
#        gesture_training_data (Firestore, admin-approved only) -> training_data/*.npy
#   2. python scripts/train_gesture_lstm.py
#        training_data/*.npy -> gesture_lstm.h5 + labels.json, then auto-converts
#        and deploys to public/models/gesture_lstm/ if tensorflowjs is installed
#
# This script does NOT fabricate data or results. If step 1 finds no approved
# samples, or step 2 finds too few samples/classes to train on, the pipeline
# stops there with a clear explanation — that is a real "not ready yet" state,
# not a failure of this script.
#
# Usage (from repo root):
#   bash scripts/run_training_pipeline.sh
#
# Requires:
#   - Firebase admin env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
#     FIREBASE_PRIVATE_KEY) in the environment or .env.local, for step 1.
#   - Python deps from requirements.txt installed, for step 2:
#       pip install -r requirements.txt
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

echo "=== Step 1/2: exporting approved training data from Firestore ==="
node scripts/export-training-dataset.js

if [ ! -d "training_data" ] || [ -z "$(ls -A training_data 2>/dev/null)" ]; then
  echo ""
  echo "No training_data/*.npy files were produced — nothing to train on yet."
  echo "See the export report above for why (no approved submissions, or all"
  echo "samples failed validation). Stopping before step 2."
  exit 1
fi

echo ""
echo "=== Step 2/2: training the LSTM and deploying to public/models/gesture_lstm ==="
cd scripts
python3 train_gesture_lstm.py
TRAIN_STATUS=$?
cd "$REPO_ROOT"

exit $TRAIN_STATUS