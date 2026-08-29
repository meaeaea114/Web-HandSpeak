import { NextRequest, NextResponse } from 'next/server';
import { requireAnalyticsAccess } from '@/lib/server-auth';
import {
  AnalyticsPillar,
  generateCohortDescriptiveInsight,
  generateCohortDiagnosticInsight,
  generateCohortPredictiveInsight,
  generateCohortPrescriptiveInsight,
  CohortDescriptivePayload,
  CohortDiagnosticPayload,
  CohortPredictivePayload,
  CohortPrescriptivePayload,
} from '@/lib/ai-analytics-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PILLARS: AnalyticsPillar[] = ['descriptive', 'diagnostic', 'predictive', 'prescriptive'];

function isValidBase(body: any): body is { pillar: AnalyticsPillar; payload: any; forceRefresh?: boolean } {
  return (
    body &&
    typeof body === 'object' &&
    typeof body.pillar === 'string' &&
    VALID_PILLARS.includes(body.pillar) &&
    body.payload &&
    typeof body.payload === 'object' &&
    typeof body.payload.scopeLabel === 'string'
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

  if (!isValidBase(body)) {
    return NextResponse.json(
      { success: false, error: 'Request payload is missing a valid pillar or scopeLabel.' },
      { status: 400 }
    );
  }

  const { pillar, forceRefresh } = body;

  try {
    let result;

    switch (pillar) {
      case 'descriptive': {
        const p = body.payload as CohortDescriptivePayload;
        if (typeof p.totalStudents !== 'number' || !Array.isArray(p.classPerformance)) {
          return NextResponse.json({ success: false, error: 'Descriptive payload is missing required fields.' }, { status: 400 });
        }
        result = await generateCohortDescriptiveInsight({ ...p, classPerformance: p.classPerformance.slice(0, 30) }, { forceRefresh });
        break;
      }
      case 'diagnostic': {
        const p = body.payload as CohortDiagnosticPayload;
        if (!Array.isArray(p.findings) || !p.moduleComparison) {
          return NextResponse.json({ success: false, error: 'Diagnostic payload is missing required fields.' }, { status: 400 });
        }
        result = await generateCohortDiagnosticInsight(p, { forceRefresh });
        break;
      }
      case 'predictive': {
        const p = body.payload as CohortPredictivePayload;
        if (!Array.isArray(p.riskForecast) || !Array.isArray(p.growthForecast)) {
          return NextResponse.json({ success: false, error: 'Predictive payload is missing required fields.' }, { status: 400 });
        }
        result = await generateCohortPredictiveInsight(p, { forceRefresh });
        break;
      }
      case 'prescriptive': {
        const p = body.payload as CohortPrescriptivePayload;
        if (!Array.isArray(p.directives)) {
          return NextResponse.json({ success: false, error: 'Prescriptive payload is missing required fields.' }, { status: 400 });
        }
        result = await generateCohortPrescriptiveInsight(p, { forceRefresh });
        break;
      }
    }

    if (!result || !result.ok) {
      return NextResponse.json(
        { success: false, error: result?.error || `AI ${pillar} engine could not produce an insight.` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      pillar,
      insight: result.data,
      cached: result.cached,
      generatedAt: result.generatedAt,
    });
  } catch (err: any) {
    console.error(`Cohort AI ${pillar} route failed:`, err);
    return NextResponse.json(
      { success: false, error: `Unexpected error while generating the ${pillar} AI insight.` },
      { status: 500 }
    );
  }
}
