import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isValidActivityAttemptPayload } from '@/lib/activity-schema';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Meant to be called by the student-facing app whenever a student
// completes or attempts a lesson/activity. See app/api/activity/gesture-attempt
// for the equivalent per-gesture endpoint and lib/activity-schema.ts for the
// exact expected payload shape.

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!idToken) {
    return NextResponse.json({ success: false, error: 'Missing authentication token.' }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error('ID token verification failed:', err);
    return NextResponse.json({ success: false, error: 'Invalid or expired authentication token.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  if (!isValidActivityAttemptPayload(body)) {
    return NextResponse.json({ success: false, error: 'Payload does not match the expected activity attempt shape.' }, { status: 400 });
  }

  if (body.studentId !== uid) {
    return NextResponse.json({ success: false, error: 'studentId must match the authenticated user.' }, { status: 403 });
  }

  try {
    const db = getAdminDb();
    await db.collection('activity_attempts').add({
      studentId: body.studentId,
      moduleId: body.moduleId,
      lessonId: body.lessonId,
      score: body.score ?? null,
      xpEarned: body.xpEarned ?? null,
      completed: body.completed,
      durationSeconds: body.durationSeconds ?? null,
      attemptedAt: body.attemptedAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to record activity attempt:', err);
    return NextResponse.json({ success: false, error: 'Failed to save the activity attempt.' }, { status: 500 });
  }
}
