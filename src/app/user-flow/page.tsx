'use client';

import React from 'react';
import FeaturePageShell from '../components/FeaturePageShell';
import Link from 'next/link';
import {
  Wand2, Settings2, Database, LayoutDashboard, AlertTriangle,
  FlaskConical, BarChart3, Download, ArrowRight, RefreshCw,
  Package, CheckCircle2, Activity
} from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  label: string;
  href: string;
  description: string;
}

const phase1Steps: Step[] = [
  { icon: <Wand2 size={20} />, label: 'Onboarding Wizard', href: '/onboarding-wizard', description: 'Create workspace, connect data, map schema, launch initial forecast' },
  { icon: <Settings2 size={20} />, label: 'Configuration', href: '/configuration-panel', description: 'Tune forecast horizon, algorithm, seasonality, thresholds' },
  { icon: <Database size={20} />, label: 'Data Sources', href: '/data-sources', description: 'Manage SAP, POS, marketplace & external data connections' },
];

const phase2Steps: Step[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Forecast Dashboard', href: '/', description: 'Monitor KPIs, review forecasts, drill into SKUs' },
  { icon: <AlertTriangle size={20} />, label: 'Exceptions & Alerts', href: '/exceptions', description: 'Resolve stockout risks, demand spikes, high MAPE flags' },
  { icon: <FlaskConical size={20} />, label: 'What-If Scenarios', href: '/scenarios', description: 'Model Diwali surge, supplier disruption, promo impact' },
];

const phase3Steps: Step[] = [
  { icon: <BarChart3 size={20} />, label: 'Model Analytics', href: '/model-analytics', description: 'Compare 6 models, review backtest results, tune selection' },
  { icon: <Download size={20} />, label: 'Export / Integrate', href: '/export', description: 'Download forecast packages, push to SAP/Power BI/Slack' },
];

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  return (
    <Link
      href={step.href}
      className="group relative flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
        {step.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="text-sm font-medium text-foreground">{step.label}</h3>
          <span className="text-xs text-muted-foreground/60 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {step.href}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
      </div>
      {index < total - 1 && (
        <div className="absolute -bottom-5 left-7 hidden sm:block">
          <ArrowRight size={14} className="text-muted-foreground/30 rotate-90" />
        </div>
      )}
    </Link>
  );
}

function PhaseSection({ title, subtitle, icon, steps, variant }: {
  title: string; subtitle: string; icon: React.ReactNode;
  steps: Step[]; variant: 'setup' | 'daily' | 'output';
}) {
  const borderColor = variant === 'setup' ? 'border-l-blue-500/50' : variant === 'daily' ? 'border-l-emerald-500/50' : 'border-l-amber-500/50';
  const bgGlow = variant === 'setup' ? 'bg-blue-500/5' : variant === 'daily' ? 'bg-emerald-500/5' : 'bg-amber-500/5';

  return (
    <div className={`relative p-5 rounded-2xl border border-border ${borderColor} border-l-2 ${bgGlow}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background border border-border text-foreground">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {variant === 'daily' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <RefreshCw size={12} />
            Daily loop
          </span>
        )}
        {variant === 'setup' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
            <Package size={12} />
            One-time
          </span>
        )}
        {variant === 'output' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
            <Activity size={12} />
            Periodic
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <StepCard key={step.label} step={step} index={i} total={steps.length} />
        ))}
      </div>
      {variant === 'daily' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4">
          <ArrowRight size={12} className="text-emerald-400" />
          <span>Start at the Dashboard, drill into exceptions, model scenarios — then return to Dashboard</span>
          <RefreshCw size={12} className="text-emerald-400" />
        </div>
      )}
      {variant === 'setup' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4">
          <ArrowRight size={12} className="text-blue-400" />
          {steps.map((_, i) => (
            <React.Fragment key={i}>
              <span className="text-foreground/60 font-mono">{i + 1}</span>
              {i < steps.length - 1 && <ArrowRight size={12} className="text-blue-400" />}
            </React.Fragment>
          ))}
        </div>
      )}
      {variant === 'output' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4">
          <CheckCircle2 size={12} className="text-amber-400" />
          <span>Review model health after each forecasting cycle</span>
          <ArrowRight size={12} className="text-amber-400" />
          <span>Export final packages to stakeholders & systems</span>
        </div>
      )}
    </div>
  );
}

export default function UserFlowPage() {
  return (
    <FeaturePageShell
      title="User Journey"
      description="End-to-end flow through ForecastIQ — from first-time setup through daily operations to periodic review and export."
      badge="Guide"
    >
      <div className="space-y-6">
        <PhaseSection
          title="Phase 1: Setup"
          subtitle="First-time configuration — run once"
          icon={<Package size={16} />}
          steps={phase1Steps}
          variant="setup"
        />
        <PhaseSection
          title="Phase 2: Daily Operations"
          subtitle="Your day-to-day workflow"
          icon={<RefreshCw size={16} />}
          steps={phase2Steps}
          variant="daily"
        />
        <PhaseSection
          title="Phase 3: Output & Review"
          subtitle="Periodic analysis and distribution"
          icon={<Activity size={16} />}
          steps={phase3Steps}
          variant="output"
        />

        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground text-center">
            Each card links directly to its page. Use the sidebar to navigate at any point in the flow.
          </p>
        </div>
      </div>
    </FeaturePageShell>
  );
}
