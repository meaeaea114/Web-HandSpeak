"""
Offline training script for the HandSpeak gesture LSTM.

Input data format (expected in ./training_data/):
    training_data/
      phrases_hello.npy      # shape (num_samples, 30, 126) — 30 frames x 126 features
      phrases_thank_you.npy
      alphabet_a.npy
      ...
Each .npy file's name (minus extension) becomes the class label. Filenames
are `<category>_<gestureKey>` — the same Firestore document id used for the
gesture_training_data collection (see
lib/content-service.ts:buildGestureTrainingDocId) — not the bare gestureKey,
so two different signs in different categories can never produce colliding
filenames/labels here even if their gestureKey text is identical.

Each sample is a (30, 126) sequence: 30 frames, each frame a flattened
21-point x 3-coord landmark vector per hand for up to 2 hands
(21 * 3 * 2 = 126), zero-padded when only one hand is present.
This must exactly match `landmarksToFeatureVector` in posture-metrics.ts.

Coordinates are wrist-centered and scale-normalized relative to the primary
hand (see posture-metrics.ts:normalizeFeatureVector) — NOT raw MediaPipe
image coordinates. training_data/*.npy is produced by
scripts/export-training-dataset.js, which applies that exact same transform,
so this script never needs to normalize anything itself.

Usage:
    pip install -r requirements.txt
    node export-training-dataset.js   # from repo root: builds training_data/
    
    # Train multi-class model:
    python train_gesture_lstm.py
    
    # Train isolated binary model (e.g., J vs. Everything Else):
    python train_gesture_lstm.py --target alphabet_j
"""

import json
import os
import shutil
import subprocess
import sys
import argparse
from collections import Counter

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.models import Sequential
from tensorflow.keras.utils import to_categorical

DATA_DIR = "training_data"
SEQUENCE_LENGTH = 30
FEATURE_LENGTH = 126
MIN_SAMPLES_PER_CLASS = 2


class DatasetNotReadyError(Exception):
    """Raised when training_data/ doesn't yet contain enough real, approved
    samples to train on. This is an expected state early in the pipeline's
    life, not a bug — see the message for exactly what's missing."""


def load_dataset():
    if not os.path.isdir(DATA_DIR):
        raise DatasetNotReadyError(
            f"'{DATA_DIR}/' does not exist. Run 'node scripts/export-training-dataset.js' "
            "from the repo root first — it reads admin-approved samples out of the "
            "gesture_training_data Firestore collection and writes the .npy files this "
            "script expects. Training cannot proceed until real capture data has been "
            "submitted by a teacher and approved by an admin."
        )

    X, y, labels = [], [], []

    for filename in sorted(os.listdir(DATA_DIR)):
        if not filename.endswith(".npy"):
            continue
        label = os.path.splitext(filename)[0]
        labels.append(label)
        class_idx = len(labels) - 1

        samples = np.load(os.path.join(DATA_DIR, filename))
        if samples.ndim != 3 or samples.shape[1:] != (SEQUENCE_LENGTH, FEATURE_LENGTH):
            raise ValueError(
                f"{filename}: expected shape (N, {SEQUENCE_LENGTH}, {FEATURE_LENGTH}), "
                f"got {samples.shape}. Check your capture pipeline."
            )

        X.append(samples)
        y.extend([class_idx] * len(samples))

    if not labels:
        raise DatasetNotReadyError(
            f"'{DATA_DIR}/' exists but contains no .npy files. This means "
            "export-training-dataset.js ran but found zero approved, valid samples in "
            "gesture_training_data. Training cannot proceed until real capture data has "
            "been submitted by a teacher and approved by an admin."
        )

    if len(labels) < 2:
        raise DatasetNotReadyError(
            f"Only 1 gesture class has approved data ({labels[0]}). An LSTM classifier "
            "needs at least 2 distinct signs to train a softmax over (it has nothing to "
            "discriminate between otherwise). Approve at least one more sign's training "
            "submission, re-run the exporter, then retrain."
        )

    class_counts = Counter(y)
    too_few = [
        (labels[idx], count)
        for idx, count in sorted(class_counts.items())
        if count < MIN_SAMPLES_PER_CLASS
    ]
    if too_few:
        details = ", ".join(f"{name} ({count} sample(s))" for name, count in too_few)
        raise DatasetNotReadyError(
            f"These classes have fewer than {MIN_SAMPLES_PER_CLASS} approved samples, "
            f"which isn't enough to hold out a validation split for them: {details}. "
            "Capture and get more takes approved for these signs, re-run "
            "export-training-dataset.js, then retrain."
        )

    X = np.concatenate(X, axis=0)
    y = np.array(y)
    return X, y, labels


def build_model(num_classes: int) -> tf.keras.Model:
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(SEQUENCE_LENGTH, FEATURE_LENGTH)),
        Dropout(0.3),
        LSTM(32),
        Dropout(0.3),
        Dense(64, activation="relu"),
    ])
    
    # If num_classes is 1, it's a binary Yes/No classification
    if num_classes == 1:
        model.add(Dense(1, activation="sigmoid"))
        model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    else:
        # Otherwise, standard multi-class
        model.add(Dense(num_classes, activation="softmax"))
        model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
        
    return model


def convert_to_tfjs(model_out: str, labels_out: str, tfjs_out_dir: str) -> bool:
    """Runs the tensorflowjs_converter CLI and copies labels.json alongside
    the converted model so the Next.js app's loadGestureSequenceModel() has both.
    """
    converter = shutil.which("tensorflowjs_converter")
    if not converter:
        print(
            "\ntensorflowjs_converter not found on PATH — skipping automatic TF.js "
            "conversion (this does NOT affect the saved .h5/labels.json above)."
        )
        return False

    os.makedirs(tfjs_out_dir, exist_ok=True)
    print(f"\nConverting {model_out} to TF.js format at {tfjs_out_dir}/ ...")
    
    result = subprocess.run(
        [converter, "--input_format=keras", model_out, tfjs_out_dir],
        capture_output=True,
        text=True,
    )
    
    if result.returncode != 0:
        print("tensorflowjs_converter failed:")
        print(result.stderr or result.stdout)
        return False

    shutil.copyfile(labels_out, os.path.join(tfjs_out_dir, "labels.json"))
    print(f"Wrote TF.js model + labels.json to {tfjs_out_dir}/")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=str, help='Target class to train as a binary classifier (e.g., alphabet_j)')
    args = parser.parse_args()

    print("Loading dataset...")
    X, y_raw, labels = load_dataset()
    print(f"Loaded {len(X)} sequences across {len(labels)} total classes found in data.")

    target = args.target

    if target:
        if target not in labels:
            print(f"Error: Target '{target}' not found in available dataset files.")
            sys.exit(1)
            
        print(f"\n--- Training isolated BINARY model for: {target} ---")
        
        # Configure output paths dynamically based on target name
        MODEL_OUT = f"{target}.h5"
        LABELS_OUT = f"{target}_labels.json"
        TFJS_OUT_DIR = os.path.join("..", "public", "models", target)
        
        # Convert multiclass labels to binary: 1 for target, 0 for everything else
        target_idx = labels.index(target)
        y = np.array([1 if val == target_idx else 0 for val in y_raw])
        out_labels = [f"not_{target}", target]
        
        # Stratify ensures train/val both get an equal mix of 1s and 0s
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        model = build_model(num_classes=1)
        
    else:
        print("\n--- Training MULTI-CLASS model for all signs ---")
        MODEL_OUT = "gesture_lstm.h5"
        LABELS_OUT = "labels.json"
        TFJS_OUT_DIR = os.path.join("..", "public", "models", "gesture_lstm")
        
        y = to_categorical(y_raw, num_classes=len(labels))
        out_labels = labels
        
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y_raw
        )
        model = build_model(num_classes=len(labels))

    model.summary()
    early_stop = EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True)

    model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=100,
        batch_size=16,
        callbacks=[early_stop],
    )

    val_loss, val_acc = model.evaluate(X_val, y_val)
    print(f"Validation accuracy: {val_acc:.3f}")

    model.save(MODEL_OUT)
    with open(LABELS_OUT, "w") as f:
        json.dump(out_labels, f)

    print(f"Saved model to {MODEL_OUT} and labels to {LABELS_OUT}")

    # Use the dynamic paths for the TFJS conversion step
    deployed = convert_to_tfjs(MODEL_OUT, LABELS_OUT, TFJS_OUT_DIR)
    
    if not deployed:
        print("\nTraining completed, but model was not converted to TF.js format.")


if __name__ == "__main__":
    try:
        main()
    except DatasetNotReadyError as exc:
        print(f"\nTRAINING CANNOT PROCEED YET: {exc}", file=sys.stderr)
        sys.exit(1)