import { NextRequest, NextResponse } from 'next/server';
import { requireAnalyticsAccess } from '@/lib/server-auth';
import {
  AnalyticsPillar,
  generateStudentDescriptiveInsight,
  generateStudentDiagnosticInsight,
  generateStudentPredictiveInsight,
  generateStudentPrescriptiveInsight,
  StudentDescriptivePayload,
  StudentDiagnosticPayload,
  StudentPredictivePayload,
  StudentPrescriptivePayload,
} from '@/lib/ai-analytics-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PILLARS: AnalyticsPillar[] = ['descriptive', 'diagnostic', 'predictive', 'prescriptive'];

function isValidBase(body: any): body is { studentId: string; pillar: AnalyticsPillar; payload: any; forceRefresh?: boolean } {
  return (
    body &&
    typeof body === 'object' &&
    typeof body.studentId === 'string' &&
    body.studentId.trim().length > 0 &&
    typeof body.pillar === 'string' &&
    VALID_PILLARS.includes(body.pillar) &&
    body.payload &&
    typeof body.payload === 'object' &&
    typeof body.payload.firstName === 'string'
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
      { success: false, error: 'Request payload is missing a valid studentId, pillar, or firstName.' },
      { status: 400 }
    );
  }

  const { studentId, pillar, forceRefresh } = body;

  try {
    let result;

    switch (pillar) {
      case 'descriptive': {
        const p = body.payload as StudentDescriptivePayload;
        if (typeof p.progress !== 'number' || typeof p.xp !== 'number') {
          return NextResponse.json({ success: false, error: 'Descriptive payload is missing required fields.' }, { status: 400 });
        }
        result = await generateStudentDescriptiveInsight(studentId, p, { forceRefresh });
        break;
      }
      case 'diagnostic': {
        const p = body.payload as StudentDiagnosticPayload;
        if (typeof p.moduleGapDescription !== 'string' || typeof p.isStalledOnboarding !== 'boolean') {
          return NextResponse.json({ success: false, error: 'Diagnostic payload is missing required fields.' }, { status: 400 });
        }
        result = await generateStudentDiagnosticInsight(studentId, p, { forceRefresh });
        break;
      }
      case 'predictive': {
        const p = body.payload as StudentPredictivePayload;
        result = await generateStudentPredictiveInsight(studentId, p, { forceRefresh });
        break;
      }
      case 'prescriptive': {
        const p = body.payload as StudentPrescriptivePayload;
        result = await generateStudentPrescriptiveInsight(studentId, p, { forceRefresh });
        break;
      }
    }

    if (!result || !result.ok) {
      return NextResponse.json(
        { success: false, error: result?.error || `AI ${pillar} engine could not produce a student insight.` },
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
    console.error(`Student AI ${pillar} route failed:`, err);
    return NextResponse.json(
      { success: false, error: `Unexpected error while generating the student ${pillar} AI insight.` },
      { status: 500 }
    );
  }
}
