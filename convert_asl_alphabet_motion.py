"""
Converts JonathanReyess/asl-alphabet motion data (data/motion/J, data/motion/Z)
into the format Web-HandSpeak's scripts/train_gesture_lstm.py expects.

SOURCE format (per the asl-alphabet README):
    data/motion/J/J_0000.npy ... J_0029.npy   # 30 files, one sequence each
    data/motion/Z/Z_0000.npy ... Z_0029.npy
    Each file: shape (20, 63)
        20 frames x (21 landmarks * 3 coords) for ONE hand, wrist-relative
        (not scale-normalized).

TARGET format (per Web-HandSpeak's training_data/*.npy):
    training_data/alphabet_j.npy   # shape (N, 30, 126)
    training_data/alphabet_z.npy
    Each sample: 30 frames x (21 landmarks * 3 coords * 2 hands, second
        hand zero-padded), wrist-centered AND scale-normalized relative to
        the primary hand -- matching normalizeFeatureVector() /
        landmarksToFeatureVector() in lib/posture-metrics.ts.

This script:
    1. Loads every per-sample .npy file in a source letter folder.
    2. Resamples 20 frames -> 30 frames (linear interpolation per feature).
    3. Zero-pads each frame's 63 features -> 126 (empty second-hand slot).
    4. Re-applies wrist-centered + scale normalization identically to
       normalizeFeatureVector() (safe/idempotent to re-run even if the
       source was already partially normalized).
    5. Stacks all samples for a letter into one (N, 30, 126) array and
       saves it under the `<category>_<gestureKey>` filename convention
       Web-HandSpeak expects (see buildGestureTrainingDocId in
       lib/content-service.ts).

Usage:
    python convert_asl_alphabet_motion.py \
        --source /path/to/asl-alphabet/data/motion \
        --dest   /path/to/Web-HandSpeak-main/training_data \
        --category alphabet

    This produces training_data/alphabet_j.npy and training_data/alphabet_z.npy
    (or --letters to restrict/rename which ones to convert).
"""

import argparse
import os
import sys

import numpy as np

SEQUENCE_LENGTH = 30       # Web-HandSpeak's expected frame count
TARGET_FEATURE_LENGTH = 126  # 21 points * 3 coords * 2 hands
SOURCE_FEATURE_LENGTH = 63   # 21 points * 3 coords * 1 hand (source data)

WRIST = 0
MIDDLE_MCP = 9


def resample_frames(seq: np.ndarray, target_len: int) -> np.ndarray:
    """Linearly resample a (T, F) sequence to (target_len, F) along the
    frame axis. Works for both up- and down-sampling."""
    src_len = seq.shape[0]
    if src_len == target_len:
        return seq.copy()
    src_idx = np.linspace(0, src_len - 1, num=src_len)
    tgt_idx = np.linspace(0, src_len - 1, num=target_len)
    out = np.empty((target_len, seq.shape[1]), dtype=seq.dtype)
    for f in range(seq.shape[1]):
        out[:, f] = np.interp(tgt_idx, src_idx, seq[:, f])
    return out


def pad_second_hand(seq: np.ndarray) -> np.ndarray:
    """(T, 63) one-hand sequence -> (T, 126) with hand-2 slot zeroed,
    matching landmarksToFeatureVector()'s [hand1 xyz...][hand2 xyz...] layout."""
    if seq.shape[1] != SOURCE_FEATURE_LENGTH:
        raise ValueError(
            f"Expected {SOURCE_FEATURE_LENGTH} features per frame (one hand), "
            f"got {seq.shape[1]}. This source file may already include a "
            "second hand or use a different landmark layout -- check it by hand."
        )
    pad = np.zeros((seq.shape[0], TARGET_FEATURE_LENGTH - SOURCE_FEATURE_LENGTH), dtype=seq.dtype)
    return np.concatenate([seq, pad], axis=1)


def normalize_feature_vector(vector: np.ndarray) -> np.ndarray:
    """Direct port of normalizeFeatureVector() in lib/posture-metrics.ts.
    Wrist-centers and scale-normalizes a single 126-length frame relative
    to the PRIMARY hand's wrist and wrist-to-middle-MCP distance. Safe to
    apply even if the input is already normalized (idempotent), but here
    the input is raw/wrist-relative-only, so this adds the missing scale step."""
    if vector.shape[0] != TARGET_FEATURE_LENGTH:
        raise ValueError(f"Expected a {TARGET_FEATURE_LENGTH}-length feature vector, got {vector.shape[0]}")

    wrist_x = vector[WRIST * 3]
    wrist_y = vector[WRIST * 3 + 1]
    wrist_z = vector[WRIST * 3 + 2]

    mid_x = vector[MIDDLE_MCP * 3]
    mid_y = vector[MIDDLE_MCP * 3 + 1]
    scale = np.hypot(mid_x - wrist_x, mid_y - wrist_y)
    if scale == 0:
        scale = 1.0

    normalized = np.empty_like(vector)
    normalized[0::3] = (vector[0::3] - wrist_x) / scale
    normalized[1::3] = (vector[1::3] - wrist_y) / scale
    normalized[2::3] = (vector[2::3] - wrist_z) / scale
    return normalized


def convert_sample(raw: np.ndarray) -> np.ndarray:
    """(20, 63) raw source sample -> (30, 126) normalized target sample."""
    resampled = resample_frames(raw, SEQUENCE_LENGTH)          # (30, 63)
    padded = pad_second_hand(resampled)                        # (30, 126)
    normalized = np.stack([normalize_feature_vector(frame) for frame in padded])
    return normalized


def convert_letter_folder(folder: str) -> np.ndarray:
    """Loads every .npy file in `folder`, converts each, and stacks them
    into one (N, 30, 126) array."""
    files = sorted(f for f in os.listdir(folder) if f.endswith(".npy"))
    if not files:
        raise FileNotFoundError(f"No .npy files found in {folder}")

    samples = []
    for fname in files:
        raw = np.load(os.path.join(folder, fname))
        if raw.ndim != 2:
            print(f"  skipping {fname}: expected 2D (frames, features), got shape {raw.shape}", file=sys.stderr)
            continue
        try:
            samples.append(convert_sample(raw))
        except ValueError as exc:
            print(f"  skipping {fname}: {exc}", file=sys.stderr)

    if not samples:
        raise ValueError(f"No usable samples converted from {folder}")

    return np.stack(samples, axis=0)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", required=True, help="Path to asl-alphabet's data/motion directory")
    parser.add_argument("--dest", required=True, help="Path to Web-HandSpeak's training_data directory (created if missing)")
    parser.add_argument("--category", default="alphabet", help="Category prefix for output filenames (default: alphabet)")
    parser.add_argument(
        "--letters",
        nargs="+",
        default=["J", "Z"],
        help="Letter subfolder names under --source to convert (default: J Z)",
    )
    args = parser.parse_args()

    os.makedirs(args.dest, exist_ok=True)

    for letter in args.letters:
        src_folder = os.path.join(args.source, letter)
        if not os.path.isdir(src_folder):
            print(f"skipping '{letter}': {src_folder} not found", file=sys.stderr)
            continue

        print(f"Converting {letter} ...")
        stacked = convert_letter_folder(src_folder)

        out_name = f"{args.category}_{letter.lower()}.npy"
        out_path = os.path.join(args.dest, out_name)
        np.save(out_path, stacked)
        print(f"  wrote {out_path}  shape={stacked.shape}")

    print("\nDone. Review the shapes above -- each should be (N, 30, 126).")


if __name__ == "__main__":
    main()
