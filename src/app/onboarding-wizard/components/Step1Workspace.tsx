'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Package, Car, FlaskConical, Settings2, ChevronRight, Sparkles } from 'lucide-react';
import type { WizardState, IndustryTemplate } from './OnboardingWizardClient';

interface Step1Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onIndustryChange: (industry: IndustryTemplate) => void;
  onNext: () => void;
}

interface FormValues {
  workspaceName: string;
}

const industryTemplates: {
  id: IndustryTemplate;
  label: string;
  icon: React.ReactNode;
  description: string;
  tags: string[];
  defaultAlgo: string;
  skuRange: string;
}[] = [
  {
    id: 'fmcg',
    label: 'FMCG / Consumer Goods',
    icon: <Package size={22} />,
    description: 'High-frequency SKUs with weekly seasonality, promotional spikes, and short shelf life. Pre-configured for LightGBM with promo regressors.',
    tags: ['200–500 SKUs', 'Weekly granularity', 'Promo calendar', 'Shelf-life aware'],
    defaultAlgo: 'LightGBM',
    skuRange: '200–500 SKUs',
  },
  {
    id: 'auto',
    label: 'Automobile Spare Parts',
    icon: <Car size={22} />,
    description: 'Intermittent and lumpy demand with many zero-demand periods. Pre-configured for Croston\'s / TSB with intermittent demand routing enabled.',
    tags: ['150–300 SKUs', 'Monthly granularity', 'Intermittent demand', 'Long lead times'],
    defaultAlgo: "Croston's / TSB",
    skuRange: '150–300 SKUs',
  },
  {
    id: 'pharma',
    label: 'Pharmaceutical / Medical',
    icon: <FlaskConical size={22} />,
    description: 'Seasonal demand with regulatory batch patterns and annual flu-season spikes. Pre-configured for SARIMA with yearly seasonality.',
    tags: ['100–200 SKUs', 'Monthly granularity', 'Regulatory batching', 'Flu-season pattern'],
    defaultAlgo: 'SARIMA',
    skuRange: '100–200 SKUs',
  },
  {
    id: 'custom',
    label: 'Custom Configuration',
    icon: <Settings2 size={22} />,
    description: 'Start from scratch. Manually configure all forecasting parameters — granularity, algorithm, seasonality, and hierarchy — for your specific domain.',
    tags: ['Any SKU count', 'Any granularity', 'Full control', 'Manual setup'],
    defaultAlgo: 'Auto-select',
    skuRange: 'Configurable',
  },
];

export default function Step1Workspace({ state, onUpdate, onIndustryChange, onNext }: Step1Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { workspaceName: state.workspaceName },
  });

  const onSubmit = (data: FormValues) => {
    onUpdate({ workspaceName: data.workspaceName });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Name your workspace</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Each workspace is an isolated tenant with its own SKU catalog, data, and configuration. You can create multiple workspaces for different brands or business units.
        </p>

        <div>
          <label className="label-text">Workspace Name</label>
          <p className="text-xs text-muted-foreground mb-2">
            Use your brand, business unit, or project name — e.g. "Nestlé FMCG India" or "AutoZone Spare Parts"
          </p>
          <input
            {...register('workspaceName', {
              required: 'Workspace name is required',
              minLength: { value: 3, message: 'Must be at least 3 characters' },
              maxLength: { value: 60, message: 'Must be under 60 characters' },
            })}
            className="input-field max-w-md"
            placeholder="e.g. Nestlé FMCG India"
            autoFocus
          />
          {errors.workspaceName && (
            <p className="text-xs text-negative mt-1.5">{errors.workspaceName.message}</p>
          )}
        </div>
      </div>

      {/* Industry template selector */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-1">Choose an industry template</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Templates pre-fill sensible defaults for your industry. You can override any setting later in the Configuration Panel.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {industryTemplates.map((tmpl) => (
            <button
              type="button"
              key={`tmpl-${tmpl.id}`}
              onClick={() => onIndustryChange(tmpl.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                state.industry === tmpl.id
                  ? 'border-primary bg-primary/8 ring-1 ring-primary/30' :'border-border hover:border-primary/40 hover:bg-muted/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    state.industry === tmpl.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tmpl.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{tmpl.label}</p>
                    {state.industry === tmpl.id && (
                      <span className="status-badge bg-primary/10 text-primary border border-primary/20 text-xs">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{tmpl.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {tmpl.tags.map((tag) => (
                      <span key={`tag-${tmpl.id}-${tag}`} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Default algorithm:</span>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-accent">{tmpl.defaultAlgo}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary px-6">
          Continue to Data Connection
          <ChevronRight size={16} />
        </button>
      </div>
    </form>
  );
}