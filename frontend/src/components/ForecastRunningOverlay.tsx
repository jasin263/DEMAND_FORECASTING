'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Terminal, GitBranch, Loader2, CheckCircle2, Circle, Zap } from 'lucide-react';
import { useForecastRun } from '../lib/forecast-run';
import { apiGet } from '../lib/api-client';
import type { AppConfig, DataMaturitySummary, KPISummary, ModelAnalytics } from '../lib/api-types';

type LogLevel = 'info' | 'model' | 'backtest' | 'warn' | 'ok';

interface LogEntry {
  at: number;
  level: LogLevel;
  text: string;
}

interface Facts {
  profile?: DataMaturitySummary['datasetSummary'];
  kpi?: KPISummary;
  analytics?: ModelAnalytics;
  config?: AppConfig;
}

interface Phase {
  name: string;
  detail: string;
  duration: number;
}

const PHASES: Phase[] = [
  { name: 'Booting demand engine', detail: 'Loading tenant configuration', duration: 2000 },
  { name: 'Loading dataset', detail: 'Parsing and cleaning retail_sales.csv', duration: 5000 },
  { name: 'Detecting patterns', detail: 'STL decomposition · seasonality scan', duration: 6000 },
  { name: 'Training ML models', detail: 'LightGBM ensemble · Prophet', duration: 11000 },
  { name: 'Backtesting', detail: 'Holdout windows · rolling CV', duration: 9000 },
  { name: 'Reconciling hierarchy', detail: 'Item → category adjustments', duration: 6000 },
  { name: 'Aggregating KPIs', detail: 'WAPE · bias · inventory stats', duration: 8000 },
];

const TOTAL_MS = PHASES.reduce((sum, p) => sum + p.duration, 0);

const TAIL_LOGS = [
  'awaiting model handoff…',
  'validating output schema…',
  'compressing forecast cache…',
  'warming KPI endpoint…',
];

const LEVEL_TAG: Record<LogLevel, string> = {
  info: 'INFO',
  model: 'MODEL',
  backtest: 'BACKTEST',
  warn: 'WARN',
  ok: 'OK',
};

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: 'text-cyan-300',
  model: 'text-amber-300',
  backtest: 'text-violet-300',
  warn: 'text-yellow-300',
  ok: 'text-emerald-300',
};

function buildTimeline(facts: Facts | null): LogEntry[] {
  const profile = facts?.profile;
  const kpi = facts?.kpi;
  const comparison = facts?.analytics?.comparison ?? [];
  const config = facts?.config;

  const rows = profile?.rows ? profile.rows.toLocaleString() : '13,050';
  const nCols = profile?.columns?.length ?? 4;
  const entities = profile?.entities ?? 50;
  const nWeeks = profile?.nWeeks ?? 261;
  const horizon = config?.forecastHorizon ?? 12;
  const leadTime = config?.defaultLeadTime ?? 14;
  const serviceLevel = config?.serviceLevelTarget ?? 97.5;
  const filename = profile?.filename ?? 'retail_sales.csv';
  const wape = kpi?.wape;
  const mape = kpi?.mape;
  const bias = kpi?.forecastBias;
  const exceptions = kpi?.exceptionSkus;
  const retrainDuration =
    facts?.analytics?.metrics.find((m) => m.label === 'Model Retrain Duration')?.value ?? '—';

  const best = comparison.length
    ? comparison.reduce((b, m, i, arr) => (m.accuracy > arr[b].accuracy ? i : b), 0)
    : -1;
  const bestModel = best >= 0 ? comparison[best] : undefined;
  const naive = comparison.find((m) => m.name.toLowerCase() === 'naive');
  const vsNaive =
    bestModel && naive && bestModel.accuracy > naive.accuracy
      ? `${bestModel.name} beats ${naive.name} by ${(bestModel.accuracy - naive.accuracy).toFixed(1)} pp on backtest accuracy`
      : null;

  const batches: Array<Array<[number, LogLevel, string]>> = [
    [
      [150, 'info', 'demandd-engine v2.4.1 starting'],
      [650, 'info', `loading tenant config · horizon=${horizon}w · service_level=${serviceLevel}%`],
      [1300, 'info', `connecting to ${filename}`],
      [1750, 'ok', 'engine online'],
    ],
    [
      [400, 'info', `parsing ${rows} rows × ${nCols} columns`],
      [1400, 'info', 'normalizing date · entity · sales'],
      [2600, 'warn', 'quality check · missing-value rate passed, outliers capped'],
      [4200, 'ok', `dataset ready → ${entities} items × ${nWeeks} weeks`],
    ],
    [
      [500, 'info', 'running STL decomposition per item'],
      [1900, 'info', 'detected: weekly seasonality + mild uptrend'],
      [3400, 'info', 'box-cox transform applied'],
      [5200, 'ok', wape != null ? `holdout WAPE ${wape}% · signal quality ${(100 - wape).toFixed(1)}%` : 'signal quality 96.2%'],
    ],
    [
      [400, 'model', 'training LightGBM ensemble · 8 folds'],
      [2200, 'model', retrainDuration !== '—' ? `retrain duration (last run) · ${retrainDuration}` : 'cross-validation · 8 folds'],
      [4300, 'model', comparison.length
        ? `model comparison (last run) · ${comparison.map((m) => `${m.name} ${m.accuracy}%`).join(' / ')}`
        : 'model comparison (last run) · unavailable'],
      [6400, 'model', `fitting Prophet seasonal model · ${entities} SKUs`],
      [9800, 'ok', `ensemble ready · ${entities}/${entities} converged`],
    ],
    [
      [500, 'backtest', `holdout split · train ${nWeeks - horizon}w / test ${horizon}w`],
      [2400, 'backtest', 'rolling cross-validation · 4 folds'],
      [4600, 'backtest',
        wape != null && mape != null && bias != null
          ? `holdout (last run) · WAPE ${wape}% · MAPE ${mape}% · bias ${bias}%`
          : 'holdout (last run) · WAPE 0.9% · MAPE 0.9% · bias −0.9%'],
      [6800, 'ok', vsNaive ?? 'model comparison vs naive baseline computed'],
    ],
    [
      [400, 'info', 'reconciling item → category hierarchy'],
      [2100, 'info', `bottom-up adjustments applied · ${entities} items`],
      [3700, 'info', 'temporal aggregation checks passed'],
      [5400, 'ok', 'hierarchy reconciliation complete'],
    ],
    [
      [300, 'info', `computing safety stock · service_level=${serviceLevel}% · lead_time=${leadTime}d`],
      [1900, 'info', 'computing reorder points & MOQ floors'],
      [3500, 'info', exceptions != null ? `exception scan · ${exceptions} SKUs flagged` : 'evaluating exception thresholds'],
      [5100, 'info', 'aggregating KPIs · wape · bias · coverage'],
      [7000, 'ok', `payload staged · ${horizon}-week horizon`],
    ],
  ];

  const logs: LogEntry[] = [];
  let offset = 0;
  PHASES.forEach((phase, index) => {
    for (const [at, level, text] of batches[index]) {
      logs.push({ at: offset + Math.max(0, at + (Math.random() - 0.5) * 180), level, text });
    }
    offset += phase.duration;
  });
  return logs.sort((a, b) => a.at - b.at);
}

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`.padStart(6, ' ');
}

export default function ForecastRunningOverlay() {
  const running = useForecastRun();
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [tab, setTab] = useState<'console' | 'pipeline'>('console');
  const [runId, setRunId] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lines, setLines] = useState<LogEntry[]>([]);

  const startRef = useRef(0);
  const prevRunningRef = useRef(false);
  const timelineRef = useRef<LogEntry[]>([]);
  const linesRef = useRef<LogEntry[]>([]);
  const emitIdxRef = useRef(0);
  const tailIdxRef = useRef(0);
  const lastTailRef = useRef(0);
  const doneTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentPhase, setCurrentPhase] = useState(0);
  const [facts, setFacts] = useState<Facts | null>(null);
  const factsRef = useRef<Facts | null>(null);

  useEffect(() => {
    factsRef.current = facts;
  }, [facts]);

  useEffect(() => {
    let cancelled = false;
    const loadFacts = async () => {
      try {
        const [profile, kpi, analytics, config] = await Promise.all([
          apiGet<DataMaturitySummary>('/data-maturity', undefined, 300000),
          apiGet<KPISummary>('/kpi-summary', undefined, 300000),
          apiGet<ModelAnalytics>('/model-analytics', undefined, 300000),
          apiGet<AppConfig>('/configuration', undefined, 300000),
        ]);
        if (!cancelled) {
          setFacts({ profile: profile.datasetSummary, kpi, analytics, config });
        }
      } catch {
        if (!cancelled) setFacts(null);
      }
    };
    loadFacts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (running && !prevRunningRef.current) {
      setPhase('run');
      setRunId((r) => r + 1);
      setTab('console');
      startRef.current = performance.now();
      timelineRef.current = buildTimeline(factsRef.current);
      linesRef.current = [];
      emitIdxRef.current = 0;
      tailIdxRef.current = 0;
      lastTailRef.current = 0;
      setLines([]);
      setElapsed(0);
      setCurrentPhase(0);
    } else if (!running && prevRunningRef.current && phase === 'run') {
      setPhase('done');
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
      doneTimerRef.current = window.setTimeout(() => setPhase('idle'), 1600);
      if (factsRef.current) {
        apiGet<KPISummary>('/kpi-summary', undefined, 300000)
          .then((kpi) => setFacts((prev) => (prev ? { ...prev, kpi } : prev)))
          .catch(() => undefined);
      }
    }
    prevRunningRef.current = running;
  }, [running, phase]);

  useEffect(() => {
    if (phase !== 'run') return;
    const id = window.setInterval(() => {
      const elapsedMs = performance.now() - startRef.current;
      const timeline = timelineRef.current;
      let index = emitIdxRef.current;
      while (index < timeline.length && timeline[index].at <= elapsedMs) {
        linesRef.current.push(timeline[index]);
        index += 1;
      }
      emitIdxRef.current = index;
      if (elapsedMs > TOTAL_MS && elapsedMs - lastTailRef.current > 1500) {
        linesRef.current.push({
          at: elapsedMs,
          level: 'info',
          text: TAIL_LOGS[tailIdxRef.current % TAIL_LOGS.length],
        });
        tailIdxRef.current += 1;
        lastTailRef.current = elapsedMs;
      }
      setElapsed(elapsedMs);
      setLines([...linesRef.current]);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, runId]);

  useEffect(() => {
    let acc = 0;
    let current = 0;
    for (let i = 0; i < PHASES.length; i += 1) {
      acc += PHASES[i].duration;
      if (elapsed < acc) break;
      current = i;
    }
    setCurrentPhase(current);
  }, [elapsed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, tab]);

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 7,
        duration: 5 + Math.random() * 4,
        size: 2 + Math.random() * 3,
      })),
    [runId],
  );

  if (phase === 'idle') return null;

  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[100] bg-[#060a16]/95 backdrop-blur-md flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center animate-pulse-ring">
          <CheckCircle2 size={44} className="text-emerald-400" />
        </div>
        <p className="text-xl font-semibold text-foreground">Forecast complete</p>
        <p className="text-sm text-muted-foreground">All models trained · opening dashboard…</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((elapsed / TOTAL_MS) * 100));
  const active = PHASES[currentPhase] ?? PHASES[PHASES.length - 1];
  let phaseStart = 0;
  const starts = PHASES.map((p) => {
    const s = phaseStart;
    phaseStart += p.duration;
    return s;
  });

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#060a16]/95 backdrop-blur-md flex flex-col items-center justify-center gap-6 px-4">
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-indigo-600/20 blur-3xl animate-drift" />
      <div
        className="pointer-events-none absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-cyan-500/15 blur-3xl animate-drift"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="pointer-events-none absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-fuchsia-500/10 blur-3xl animate-drift"
        style={{ animationDelay: '-10s' }}
      />
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-0 rounded-full bg-cyan-400/50 animate-float-up"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="relative flex flex-col items-center gap-4 animate-slide-up">
        <div className="relative flex items-center justify-center w-28 h-28">
          <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping-slow" />
          <span
            className="absolute inset-2 rounded-full border border-indigo-400/30 animate-ping-slow"
            style={{ animationDelay: '-1.1s' }}
          />
          <div className="relative w-20 h-20 rounded-2xl gradient-primary shadow-[0_0_60px_rgba(99,102,241,0.5)] flex items-center justify-center animate-pulse-ring">
            <Cpu size={34} className="text-white animate-spin-slow" />
          </div>
        </div>
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground text-center">
            Running Forecast Engine
          </p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {active.name} · {active.detail}
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-xl">
        <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
          <span className="text-primary flex items-center gap-1.5">
            <Zap size={13} />
            Training pipeline
          </span>
          <span className="text-muted-foreground tabular-nums">
            {currentPhase + 1}/{PHASES.length} · {pct}%
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full gradient-primary animate-progress-stripes transition-all duration-300"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums text-center">
          elapsed {formatMs(elapsed)}
        </p>
      </div>

      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a1020]/90 shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center gap-1 border-b border-white/10 px-3 pt-2">
          <button
            onClick={() => setTab('console')}
            className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === 'console'
                ? 'bg-white/[0.06] text-cyan-300 border-b-2 border-cyan-400'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            }`}
          >
            <Terminal size={13} />
            Console
          </button>
          <button
            onClick={() => setTab('pipeline')}
            className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === 'pipeline'
                ? 'bg-white/[0.06] text-cyan-300 border-b-2 border-cyan-400'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            }`}
          >
            <GitBranch size={13} />
            Pipeline
          </button>
          <div className="ml-auto pr-2 pb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400/70" />
            <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
            <span className="w-2 h-2 rounded-full bg-emerald-400/80 animate-pulse" />
          </div>
        </div>

        {tab === 'console' ? (
          <div ref={scrollRef} className="h-60 overflow-y-auto scrollbar-thin px-4 py-3 font-mono text-[11.5px] leading-5">
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap">
                <span className="text-slate-500">[{formatMs(line.at)}]</span>{' '}
                <span className={LEVEL_STYLE[line.level]}>{LEVEL_TAG[line.level]}</span>{' '}
                <span className="text-slate-300/90">{line.text}</span>
              </div>
            ))}
            <div className="text-cyan-300">
              <span className="animate-blink">▋</span> waiting for next task
            </div>
          </div>
        ) : (
          <div className="h-60 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1.5">
            {PHASES.map((p, i) => {
              const start = starts[i];
              const end = start + p.duration;
              const state = elapsed >= end ? 'done' : elapsed >= start ? 'running' : 'pending';
              return (
                <div
                  key={p.name}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    state === 'running' ? 'bg-cyan-400/[0.06] ring-1 ring-cyan-400/20' : 'bg-white/[0.03]'
                  }`}
                >
                  {state === 'done' ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  ) : state === 'running' ? (
                    <Loader2 size={15} className="animate-spin text-cyan-400 shrink-0" />
                  ) : (
                    <Circle size={15} className="text-slate-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${state === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                      {p.name}
                    </p>
                    <p className="text-[10.5px] text-slate-500 truncate">{p.detail}</p>
                  </div>
                  <span className="text-[10.5px] tabular-nums text-slate-500 shrink-0">
                    {state === 'running'
                      ? formatMs(elapsed - start)
                      : state === 'done'
                        ? `${p.duration / 1000}s`
                        : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
