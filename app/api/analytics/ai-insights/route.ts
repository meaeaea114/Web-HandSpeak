import { NextRequest, NextResponse } from 'next/server';
import { requireAnalyticsAccess } from '@/lib/server-auth';
import { getCohortAIInsights, CohortMetricsPayload } from '@/lib/ai-analytics-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidPayload(body: any): body is { metrics: CohortMetricsPayload; forceRefresh?: boolean } {
  if (!body || typeof body !== 'object') return false;
  const m = body.metrics;
  if (!m || typeof m !== 'object') return false;
  return (
    typeof m.scopeLabel === 'string' &&
    typeof m.totalStudents === 'number' &&
    typeof m.avgProgress === 'number' &&
    Array.isArray(m.classPerformance)
  );
}

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

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { success: false, error: 'Request payload is missing required aggregated metrics fields.' },
      { status: 400 }
    );
  }

  // Defensive cap: never allow an unbounded number of class rows into the prompt.
  const metrics: CohortMetricsPayload = {
    ...body.metrics,
    classPerformance: body.metrics.classPerformance.slice(0, 30),
  };

  try {
    const result = await getCohortAIInsights(metrics, { forceRefresh: !!body.forceRefresh });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'AI analytics engine could not produce insights.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      insights: result.data,
      cached: result.cached,
      generatedAt: result.generatedAt,
    });
  } catch (err: any) {
    console.error('Cohort AI insights route failed:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error while generating AI analytics insights.' },
      { status: 500 }
    );
  }
}
