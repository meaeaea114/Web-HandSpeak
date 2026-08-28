import { NextRequest, NextResponse } from 'next/server';
import { requireAnalyticsAccess } from '@/lib/server-auth';
import { getGestureAccuracyForStudents, getActivityAttemptSummaryForStudents } from '@/lib/gesture-analytics-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await requireAnalyticsAccess(request);
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds.filter((s: any) => typeof s === 'string') : [];

  // Defensive cap to avoid an unbounded number of Firestore 'in' batches per request.
  const cappedIds = studentIds.slice(0, 500);

  try {
    const [gesture, activity] = await Promise.all([
      getGestureAccuracyForStudents(cappedIds),
      getActivityAttemptSummaryForStudents(cappedIds),
    ]);

    return NextResponse.json({ success: true, gesture, activity });
  } catch (err) {
    console.error('Gesture accuracy route failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to compute gesture/activity analytics.' }, { status: 500 });
  }
}
