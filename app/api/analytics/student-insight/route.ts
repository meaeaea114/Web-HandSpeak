import { NextRequest, NextResponse } from 'next/server';
import { requireAnalyticsAccess } from '@/lib/server-auth';
import { getStudentAIInsight, StudentMetricsPayload } from '@/lib/ai-analytics-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidPayload(body: any): body is { studentId: string; metrics: StudentMetricsPayload; forceRefresh?: boolean } {
  if (!body || typeof body !== 'object') return false;
  if (typeof body.studentId !== 'string' || !body.studentId.trim()) return false;
  const m = body.metrics;
  if (!m || typeof m !== 'object') return false;
  return (
    typeof m.firstName === 'string' &&
    typeof m.progress === 'number' &&
    typeof m.xp === 'number' &&
    typeof m.status === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
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

    if (!isValidPayload(body)) {
      return NextResponse.json(
        { success: false, error: 'Request payload is missing required student metrics fields.' },
        { status: 400 }
      );
    }

    const result = await getStudentAIInsight(body.studentId, body.metrics, { forceRefresh: !!body.forceRefresh });

    if (!result.ok) {
      console.error('[AI Insight Engine Error]:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'AI analytics engine could not produce a student insight.' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      insight: result.data,
      cached: result.cached,
      generatedAt: result.generatedAt,
    });
  } catch (err: any) {
    console.error('Student AI insight route unhandled error:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err?.message || 'Unexpected server error while generating student AI insight.' 
      },
      { status: 500 }
    );
  }
}