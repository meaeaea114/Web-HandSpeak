// ==========================================================================
// Client helper for POST /api/admin/retrain-model — see that route for what
// it actually does and its serverless limitation. Called automatically by
// the admin content-approval screen right after a "train_parameters"
// submission is approved, so an admin never has to run
// `node scripts/export-training-dataset.js` / `python scripts/train_gesture_lstm.py`
// by hand again.
// ==========================================================================

import { auth } from '@/lib/firebase';

export interface RetrainResult {
  success: boolean;
  stage?: 'export' | 'train';
  error?: string;
  log?: string;
  exportLog?: string;
  trainLog?: string;
}

export async function triggerModelRetrain(): Promise<RetrainResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: 'You must be signed in as an admin to trigger retraining.' };
  }

  try {
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/admin/retrain-model', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json as RetrainResult;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reach the retraining service.' };
  }
}