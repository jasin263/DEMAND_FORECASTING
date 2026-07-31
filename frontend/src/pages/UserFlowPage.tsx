import React from 'react';
import FeaturePageShell from '../components/FeaturePageShell';
import {
  Wand2, Settings2, Database, LayoutDashboard, AlertTriangle,
  FlaskConical, BarChart3, Download, ArrowRight, RefreshCw,
  Package, CheckCircle2, Activity, IterationCw, LineChart, Radio,
  CloudSun, TrendingUp, Combine, MessagesSquare,
} from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  label: string;
  page: string;
  description: string;
}

const phase1Steps: Step[] = [
  { icon: <Wand2 size={20} />, label: 'Onboarding Wizard', page: '/onboarding-wizard', description: 'Create workspace, connect data, map schema, launch initial forecast' },
  { icon: <Settings2 size={20} />, label: 'Configuration', page: '/configuration-panel', description: 'Tune forecast horizon, algorithm, seasonality, thresholds' },
  { icon: <Database size={20} />, label: 'Data Sources', page: '/data-sources', description: 'Manage SAP, POS, marketplace & external data connections' },
];

const phase2Steps: Step[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Forecast Dashboard', page: '/', description: 'Monitor KPIs (WAPE, bias, service level), review forecasts, drill into SKUs' },
  { icon: <AlertTriangle size={20} />, label: 'Exceptions & Alerts', page: '/exceptions', description: 'Resolve stockout risks, demand spikes, high MAPE flags with workflow' },
  { icon: <BarChart3 size={20} />, label: 'Model Analytics', page: '/model-analytics', description: 'Compare models (Naive/SES/ARIMA), accuracy drift monitoring, backtest' },
  { icon: <FlaskConical size={20} />, label: 'What-If Scenarios', page: '/scenarios', description: 'Model Diwali surge, supplier disruption, promo impact with CRUD' },
  { icon: <TrendingUp size={20} />, label: 'Simulation Engine', page: '/simulations', description: 'Run promo lift, price cut, supply disruption simulations with real forecasts' },
  { icon: <Combine size={20} />, label: 'Consensus Forecast', page: '/consensus', description: 'Blend ML + statistical + judgmental forecasts with adaptive weighting' },
];

const phase3Steps: Step[] = [
  { icon: <IterationCw size={20} />, label: 'Walk-Forward Backtest', page: '/backtesting', description: 'Rolling window validation — stability scores, fold-by-fold MAPE/WAPE/bias' },
  { icon: <LineChart size={20} />, label: 'Seasonality Decomp', page: '/seasonal-decomposition', description: 'Trend, seasonal, residual breakdown per SKU with strength metric' },
  { icon: <Radio size={20} />, label: 'Demand Sensing', page: '/demand-sensing', description: 'Blend POS, sell-in, sell-out, stock signals into smoothed short-term view' },
  { icon: <CloudSun size={20} />, label: 'External Factors', page: '/external-factors', description: 'Weather, macro, competitive, calendar correlations with per-SKU matrix' },
  { icon: <Package size={20} />, label: 'Inventory Optimization', page: '/inventory', description: 'Safety stock, reorder point, EOQ, fill rate, stockout probability' },
];

const phase4Steps: Step[] = [
  { icon: <MessagesSquare size={20} />, label: 'Annotations & Overrides', page: '/collaboration', description: 'Comment on forecasts, submit override proposals with approval workflow, threaded discussions' },
  { icon: <Download size={20} />, label: 'Export / Integrate', page: '/export', description: 'Download forecast packages (CSV/XLSX/JSON), push to SAP, Power BI, Slack' },
];

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  return (
    <a
      href={step.page}
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
            {step.page}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
      </div>
      {index < total - 1 && (
        <div className="absolute -bottom-5 left-7 hidden sm:block">
          <ArrowRight size={14} className="text-muted-foreground/30 rotate-90" />
        </div>
      )}
    </a>
  );
}

function PhaseSection({ title, subtitle, icon, steps, variant }: {
  title: string; subtitle: string; icon: React.ReactNode;
  steps: Step[]; variant: 'setup' | 'daily' | 'output' | 'collaborate';
}) {
  const borderColor = variant === 'setup' ? 'border-l-blue-500/50' : variant === 'daily' ? 'border-l-emerald-500/50' : variant === 'output' ? 'border-l-amber-500/50' : 'border-l-purple-500/50';
  const bgGlow = variant === 'setup' ? 'bg-blue-500/5' : variant === 'daily' ? 'bg-emerald-500/5' : variant === 'output' ? 'bg-amber-500/5' : 'bg-purple-500/5';

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
        {variant === 'collaborate' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full">
            <MessagesSquare size={12} />
            Team layer
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <StepCard key={step.label} step={step} index={i} total={steps.length} />
        ))}
      </div>
      {variant === 'daily' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4 flex-wrap">
          <ArrowRight size={12} className="text-emerald-400" />
          <span>Dashboard → Exceptions → Model Analytics → Scenarios</span>
          <ArrowRight size={12} className="text-emerald-400" />
          <span>Simulations → Consensus → back to Dashboard</span>
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
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4 flex-wrap">
          <CheckCircle2 size={12} className="text-amber-400" />
          <span>Walk-Forward Backtest → Seasonality → Demand Sensing → External Factors</span>
          <ArrowRight size={12} className="text-amber-400" />
          <span>Inventory Optimization</span>
        </div>
      )}
      {variant === 'collaborate' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-4 flex-wrap">
          <MessagesSquare size={12} className="text-purple-400" />
          <span>Annotate forecasts → Submit overrides → Discuss in threads → Approve/Reject</span>
          <ArrowRight size={12} className="text-purple-400" />
          <span>Export packages to stakeholders</span>
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
          title="Phase 1: Setup & Connect"
          subtitle="First-time configuration — run once"
          icon={<Package size={16} />}
          steps={phase1Steps}
          variant="setup"
        />
        <PhaseSection
          title="Phase 2: Monitor, Plan & Forecast"
          subtitle="Your daily operational loop"
          icon={<RefreshCw size={16} />}
          steps={phase2Steps}
          variant="daily"
        />
        <PhaseSection
          title="Phase 3: Deep Analytics & Optimization"
          subtitle="Periodic deep dives to improve forecast quality"
          icon={<Activity size={16} />}
          steps={phase3Steps}
          variant="output"
        />
        <PhaseSection
          title="Phase 4: Collaborate & Export"
          subtitle="Share insights, approve overrides, distribute outputs"
          icon={<MessagesSquare size={16} />}
          steps={phase4Steps}
          variant="collaborate"
        />

        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted-foreground text-center">
            Each card links directly to its page. All 15 features are powered by your uploaded dataset and generic forecasting logic.
          </p>
        </div>
      </div>
    </FeaturePageShell>
  );
}
