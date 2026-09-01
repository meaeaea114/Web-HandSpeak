"""
Rebuilds the alphabet_j / alphabet_z Keras models directly from their TF.js
weight files (public/models/<target>/model.json + shard .bin) and exports
each straight to .tflite.

WHY THIS EXISTS: the `tensorflowjs` pip package's converters.load_keras_model
path unconditionally imports tensorflow_hub, which ships pre-generated
protobuf files that conflict with newer `protobuf` releases ("Descriptors
cannot be created directly"). Rather than pin yet another dependency, this
script reads the raw weight shard directly — it only needs tensorflow and
numpy, which are already working.

This reconstructs the exact architecture scripts/train_gesture_lstm.py's
build_model(num_classes=1) produces (verified against
public/models/alphabet_j/model.json's model_config: LSTM(64) -> Dropout ->
LSTM(32) -> Dropout -> Dense(64, relu) -> Dense(1, sigmoid)) and loads the
exact trained weights already deployed there — no retraining. Byte layout
was verified against the actual .bin file size before writing this.

Usage (from repo root, in the same venv you already have tensorflow in):
    python scripts/tfjs_weights_to_tflite.py
"""

import json
import os

import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.models import Sequential

SEQUENCE_LENGTH = 30
FEATURE_LENGTH = 126
TARGETS = ["alphabet_j", "alphabet_z"]
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "models")

# Order matches model.get_weights() for this exact Sequential stack:
# LSTM layers each contribute [kernel, recurrent_kernel, bias]; Dense layers
# each contribute [kernel, bias]; Dropout layers have no weights.
WEIGHT_ORDER = [
    "lstm/lstm_cell/kernel",
    "lstm/lstm_cell/recurrent_kernel",
    "lstm/lstm_cell/bias",
    "lstm_1/lstm_cell/kernel",
    "lstm_1/lstm_cell/recurrent_kernel",
    "lstm_1/lstm_cell/bias",
    "dense/kernel",
    "dense/bias",
    "dense_1/kernel",
    "dense_1/bias",
]


def build_model() -> tf.keras.Model:
    # Mirrors build_model(num_classes=1) in scripts/train_gesture_lstm.py, with
    # one deliberate change: a STATIC batch size of 1 instead of the default
    # dynamic (None) batch dim. Without this, TFLite's converter fails on the
    # first LSTM layer with:
    #   'tf.TensorListReserve' op requires element_shape to be static
    # because return_sequences=True internally uses a TensorList whose shape
    # depends on the batch dim. A static batch of 1 matches how this model is
    # actually used at inference time (one gesture sequence at a time) and
    # sidesteps the issue entirely.
    return Sequential([
        tf.keras.Input(batch_shape=(1, SEQUENCE_LENGTH, FEATURE_LENGTH)),
        LSTM(64, return_sequences=True),
        Dropout(0.3),
        LSTM(32),
        Dropout(0.3),
        Dense(64, activation="relu"),
        Dense(1, activation="sigmoid"),
    ])


def read_tfjs_weights(model_dir: str) -> dict:
    with open(os.path.join(model_dir, "model.json")) as f:
        manifest = json.load(f)["weightsManifest"]

    weights_by_name = {}
    for group in manifest:
        buf = b""
        for shard_name in group["paths"]:
            with open(os.path.join(model_dir, shard_name), "rb") as f:
                buf += f.read()

        offset = 0
        for w in group["weights"]:
            if w["dtype"] != "float32":
                raise ValueError(f"Unexpected dtype {w['dtype']} for {w['name']} — expected float32.")
            shape = w["shape"]
            count = int(np.prod(shape)) if shape else 1
            arr = np.frombuffer(buf, dtype=np.float32, count=count, offset=offset).reshape(shape)
            weights_by_name[w["name"]] = arr
            offset += count * 4  # float32 = 4 bytes

    return weights_by_name


def convert(target: str) -> str | None:
    model_dir = os.path.join(MODELS_DIR, target)
    model_json_path = os.path.join(model_dir, "model.json")
    if not os.path.exists(model_json_path):
        print(f"[skip] {target}: {model_json_path} not found")
        return None

    print(f"Reading weights for {target} ...")
    w = read_tfjs_weights(model_dir)

    missing = [name for name in WEIGHT_ORDER if name not in w]
    if missing:
        raise ValueError(f"{target}: model.json is missing expected weight(s): {missing}")

    model = build_model()
    model.set_weights([w[name] for name in WEIGHT_ORDER])

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    # Fallback safety net per the converter's own suggestion, in case any op
    # still isn't representable as a pure TFLite builtin even with the
    # static batch size above.
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS,
    ]
    tflite_bytes = converter.convert()

    out_path = os.path.join(model_dir, "model.tflite")
    with open(out_path, "wb") as f:
        f.write(tflite_bytes)
    print(f"  wrote {out_path} ({len(tflite_bytes) / 1024:.1f} KB)")
    return out_path


def main():
    written = [p for t in TARGETS if (p := convert(t))]
    if not written:
        print(
            "\nNothing converted — check that public/models/alphabet_j/ and "
            "public/models/alphabet_z/ contain model.json + shard .bin files."
        )
    else:
        print(f"\nDone. {len(written)} .tflite file(s) written:")
        for p in written:
            print(f"  {p}")
        print(
            "\nNext: run scripts/upload-tflite-to-storage.js to push these to "
            "Firebase Storage and record them on the matching "
            "gesture_training_data docs."
        )


if __name__ == "__main__":
    main()