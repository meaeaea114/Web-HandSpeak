'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Sparkles, Clock } from 'lucide-react';
import { AnalyticsPillar } from '@/lib/ai-analytics-client';

type FetchOutcome =
  | { success: true; insight: any; cached: boolean; generatedAt: number | null }
  | { success: false; error: string };

interface PillarAIPanelProps {
  pillar: AnalyticsPillar;
  title: string; // e.g. "AI Diagnostic Interpretation"
  question: string; // e.g. "Why is it happening?"
  fetcher: (forceRefresh: boolean) => Promise<FetchOutcome>;
  dataReady: boolean; // gate auto-fetch until the underlying real data (e.g. gesture summary) has loaded
}

function formatGeneratedAt(ms: number | null): string {
  if (!ms) return '';
  const diffMin = Math.round((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.round(diffMin / 60);
  return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-rose-600 text-white',
  HIGH: 'bg-amber-500 text-white',
  RECOMMENDED: 'bg-sky-600 text-white',
  ENCOURAGE: 'bg-emerald-600 text-white',
};

export function PillarAIPanel({ pillar, title, question, fetcher, dataReady }: PillarAIPanelProps) {
  const [insight, setInsight] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [requested, setRequested] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setRequested(true);
    const result = await fetcher(forceRefresh);
    if (result.success) {
      setInsight(result.insight);
      setCached(result.cached);
      setGeneratedAt(result.generatedAt);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [fetcher]);

  useEffect(() => {
    if (dataReady && !requested) {
      load(false);
    }
    // Intentionally fetch once per mount when data becomes ready — this is a
    // per-pillar panel, so refetching only happens on explicit Refresh or on
    // a fresh mount (e.g. switching tabs), never automatically on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  return (
    <div className="rounded-2xl border border-amber-900/10 bg-white overflow-hidden">
      <div className="px-3.5 py-2.5 bg-[#FAF6EE] border-b border-amber-900/10 flex items-center justify-between">
        <div>
          <span className="text-[10.5px] font-black uppercase text-amber-900 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#F0AB31]" />
            {title}
          </span>
          <span className="text-[9.5px] font-semibold text-amber-900/50 italic">{question}</span>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="px-2.5 py-1 bg-[#521903] hover:bg-[#3d1202] text-white rounded-lg text-[9.5px] font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="p-3.5">
        {loading && (
          <div className="flex items-center gap-2 py-3 justify-center">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-700" />
            <span className="text-[11px] font-semibold text-[#521903]/60">Generating {pillar} interpretation with Claude...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 py-1">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-[#521903]/70">{error}</p>
              <button onClick={() => load(false)} className="mt-1 text-[10px] font-bold text-amber-800 underline cursor-pointer">
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && insight && pillar === 'descriptive' && (
          <div className="space-y-1.5">
            <p className="text-[11.5px] text-[#521903]/85 font-medium leading-relaxed">{insight.narrative}</p>
            {insight.observations?.length > 0 && (
              <ul className="space-y-0.5">
                {insight.observations.map((o: string, i: number) => (
                  <li key={i} className="text-[10.5px] text-[#521903]/70 font-medium">• {o}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!loading && !error && insight && pillar === 'diagnostic' && (
          <div className="space-y-1.5">
            <p className="text-[11.5px] text-[#521903]/85 font-medium leading-relaxed">{insight.narrative}</p>
            {insight.contributingFactors?.length > 0 && (
              <ul className="space-y-0.5">
                {insight.contributingFactors.map((f: string, i: number) => (
                  <li key={i} className="text-[10.5px] text-[#521903]/70 font-medium">• {f}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!loading && !error && insight && pillar === 'predictive' && (
          <div className="space-y-1.5">
            {insight.hasForecast ? (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {insight.forecastPeriod && (
                    <span className="text-[8.5px] font-black uppercase bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded-md">
                      {insight.forecastPeriod}
                    </span>
                  )}
                  <span className="text-[8.5px] font-bold text-stone-400 uppercase">AI Estimate — not a guarantee</span>
                </div>
                <p className="text-[11.5px] text-[#521903]/85 font-medium leading-relaxed">{insight.narrative}</p>
                {insight.evidenceUsed?.length > 0 && (
                  <p className="text-[10px] text-stone-400">
                    Based on: {insight.evidenceUsed.join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-stone-400 italic leading-relaxed">
                {insight.limitation || 'Insufficient historical data for a reliable forecast.'}
              </p>
            )}
          </div>
        )}

        {!loading && !error && insight && pillar === 'prescriptive' && (
          <div className="space-y-1.5">
            {insight.recommendations?.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic">No specific evidence-based recommendation was generated.</p>
            ) : (
              insight.recommendations?.map((rec: any, i: number) => (
                <div key={i} className="p-2 rounded-xl bg-[#FAF6EE] border border-amber-900/10 flex items-start gap-2">
                  <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 mt-0.5 ${PRIORITY_STYLES[rec.priority] || 'bg-stone-400 text-white'}`}>
                    {rec.priority}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold text-[#521903]">{rec.target}</p>
                    <p className="text-[10.5px] text-[#521903]/80 font-medium leading-tight">{rec.action}</p>
                    <p className="text-[9.5px] text-stone-400">Why: {rec.reason}</p>
                    {rec.relevantSkill && <p className="text-[9.5px] text-amber-700 font-semibold">Practice: {rec.relevantSkill}</p>}
                    <p className="text-[9px] text-stone-400 italic">Follow-up: {rec.followUp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && !error && insight && (
          <p className="text-[8.5px] text-stone-300 text-right pt-2 flex items-center justify-end gap-1">
            <Clock className="h-2.5 w-2.5" />
            {cached ? `Cached analysis · generated ${formatGeneratedAt(generatedAt)}` : `Freshly generated ${formatGeneratedAt(generatedAt)}`}
          </p>
        )}
      </div>
    </div>
  );
}
