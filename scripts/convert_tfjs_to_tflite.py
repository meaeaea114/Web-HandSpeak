"""
Converts the already-trained TF.js gesture models at
public/models/alphabet_j/ and public/models/alphabet_z/ into .tflite files.

IMPORTANT: this does NOT retrain anything. It loads the exact weights that
scripts/train_gesture_lstm.py --target alphabet_j / --target alphabet_z
already produced (LSTM(64) -> Dropout -> LSTM(32) -> Dropout -> Dense(64) ->
Dense(1, sigmoid), confirmed against public/models/alphabet_j/model.json and
public/models/alphabet_z/model.json) and just re-serializes those same
weights as .tflite. If you'd rather train fresh weights and export straight
to .tflite in one step, see the alternative note at the bottom of this file.

Requirements (already listed in this repo's requirements.txt):
    pip install -r requirements.txt
    # i.e. tensorflow>=2.15,<3.0 and tensorflowjs>=4.17

Usage (from the repo root):
    python scripts/convert_tfjs_to_tflite.py

Output:
    public/models/alphabet_j/model.tflite
    public/models/alphabet_z/model.tflite
"""

import os

import tensorflow as tf
import tensorflowjs as tfjs

TARGETS = ["alphabet_j", "alphabet_z"]
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "models")


def convert(target: str) -> str | None:
    model_dir = os.path.join(MODELS_DIR, target)
    model_json_path = os.path.join(model_dir, "model.json")

    if not os.path.exists(model_json_path):
        print(f"[skip] {target}: {model_json_path} not found")
        return None

    print(f"Loading {model_json_path} ...")
    # tensorflowjs ships a loader that reconstructs a tf.keras model from a
    # TF.js LayersModel (model.json + shard .bin files) — the exact reverse
    # of the tensorflowjs_converter step train_gesture_lstm.py runs.
    model = tfjs.converters.load_keras_model(model_json_path)

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
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

# -----------------------------------------------------------------------
# Alternative: train fresh weights and export straight to .tflite
# -----------------------------------------------------------------------
# If instead you want NEW weights (retrained from training_data/alphabet_j.npy
# / alphabet_z.npy) rather than converting the weights already deployed at
# public/models/alphabet_j / alphabet_z, add this to train_gesture_lstm.py
# right after `model.save(MODEL_OUT)`:
#
#   tflite_bytes = tf.lite.TFLiteConverter.from_keras_model(model).convert()
#   with open(f"{target or 'gesture_lstm'}.tflite", "wb") as f:
#       f.write(tflite_bytes)
#
# then run:
#   python scripts/train_gesture_lstm.py --target alphabet_j
#   python scripts/train_gesture_lstm.py --target alphabet_z