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
    python train_gesture_lstm.py
    # then convert to TF.js format:
    tensorflowjs_converter --input_format=keras \
        gesture_lstm.h5 ../public/models/gesture_lstm
"""

import json
import os

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
MODEL_OUT = "gesture_lstm.h5"
LABELS_OUT = "labels.json"


def load_dataset():
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
        Dense(num_classes, activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
    return model


def main():
    print("Loading dataset...")
    X, y, labels = load_dataset()
    print(f"Loaded {len(X)} sequences across {len(labels)} classes: {labels}")

    y_cat = to_categorical(y, num_classes=len(labels))
    X_train, X_val, y_train, y_val = train_test_split(
        X, y_cat, test_size=0.2, random_state=42, stratify=y
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
        json.dump(labels, f)

    print(f"Saved model to {MODEL_OUT} and labels to {LABELS_OUT}")
    print(
        "Next: tensorflowjs_converter --input_format=keras "
        f"{MODEL_OUT} ../public/models/gesture_lstm"
    )
    print(f"Then copy {LABELS_OUT} into ../public/models/gesture_lstm/labels.json")


if __name__ == "__main__":
    main()