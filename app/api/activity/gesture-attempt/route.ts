import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isValidGestureAttemptPayload } from '@/lib/activity-schema';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This endpoint is meant to be called by the STUDENT-FACING app (mobile or
// web) immediately after each gesture-recognition attempt is scored. It is
// intentionally a plain HTTP endpoint (rather than a direct Firestore write)
// so any client stack can call it without sharing this repo's code, as long
// as it can send the signed-in student's Firebase ID token.

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

  if (!isValidGestureAttemptPayload(body)) {
    return NextResponse.json({ success: false, error: 'Payload does not match the expected gesture attempt shape.' }, { status: 400 });
  }

  // A student may only record attempts for themselves.
  if (body.studentId !== uid) {
    return NextResponse.json({ success: false, error: 'studentId must match the authenticated user.' }, { status: 403 });
  }

  try {
    const db = getAdminDb();
    await db.collection('gesture_attempts').add({
      studentId: body.studentId,
      sign: body.sign,
      module: body.module,
      isCorrect: body.isCorrect,
      confidence: body.confidence ?? null,
      lessonId: body.lessonId ?? null,
      attemptedAt: body.attemptedAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to record gesture attempt:', err);
    return NextResponse.json({ success: false, error: 'Failed to save the gesture attempt.' }, { status: 500 });
  }
}
