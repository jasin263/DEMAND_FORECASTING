'use client';

import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import StepIndicator from './StepIndicator';
import Step1Workspace from './Step1Workspace';
import Step2DataUpload from './Step2DataUpload';
import Step3SchemaMapping from './Step3SchemaMapping';
import Step4ConfigConfirm from './Step4ConfigConfirm';
import AppLogo from '@/components/ui/AppLogo';
import Link from 'next/link';

export type IndustryTemplate = 'fmcg' | 'auto' | 'pharma' | 'custom';

export interface WizardState {
  workspaceName: string;
  industry: IndustryTemplate;
  uploadedFile: File | null;
  columnMappings: Record<string, string>;
  config: {
    forecastHorizon: number;
    granularity: 'daily' | 'weekly' | 'monthly';
    algorithm: string;
    seasonality: boolean;
    intermittentHandling: boolean;
  };
}

const STEPS = [
  { id: 1, label: 'Workspace', description: 'Name & industry' },
  { id: 2, label: 'Connect Data', description: 'Upload or connect' },
  { id: 3, label: 'Map Schema', description: 'Column mapping' },
  { id: 4, label: 'Confirm', description: 'Review & launch' },
];

const defaultConfig: WizardState['config'] = {
  forecastHorizon: 12,
  granularity: 'weekly',
  algorithm: 'auto',
  seasonality: true,
  intermittentHandling: false,
};

const industryDefaults: Record<IndustryTemplate, Partial<WizardState['config']>> = {
  fmcg: { forecastHorizon: 12, granularity: 'weekly', algorithm: 'lightgbm', seasonality: true, intermittentHandling: false },
  auto: { forecastHorizon: 8, granularity: 'monthly', algorithm: 'croston', seasonality: false, intermittentHandling: true },
  pharma: { forecastHorizon: 16, granularity: 'monthly', algorithm: 'sarima', seasonality: true, intermittentHandling: false },
  custom: { ...defaultConfig },
};

export default function OnboardingWizardClient() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    workspaceName: '',
    industry: 'fmcg',
    uploadedFile: null,
    columnMappings: {},
    config: defaultConfig,
  });
  const [launching, setLaunching] = useState(false);

  const updateState = (partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const handleIndustryChange = (industry: IndustryTemplate) => {
    updateState({
      industry,
      config: { ...state.config, ...industryDefaults[industry] },
    });
  };

  const handleNext = () => setStep((s) => Math.min(4, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleLaunch = () => {
    setLaunching(true);
    // Backend integration point: POST /api/tenants with wizard state
    setTimeout(() => {
      setLaunching(false);
      toast.success('Forecast run launched successfully! Redirecting to dashboard…', {
        duration: 3000,
      });
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="bottom-right" theme="dark" />

      {/* Minimal header */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-3">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo size={26} />
          <span className="font-semibold text-sm text-foreground">ForecastIQ</span>
        </Link>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="text-sm text-muted-foreground">New Workspace Setup</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/" className="btn-ghost text-xs">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-3xl 2xl:max-w-4xl">
          {/* Step indicator */}
          <StepIndicator steps={STEPS} currentStep={step} />

          {/* Step content */}
          <div className="mt-8 animate-slide-up">
            {step === 1 && (
              <Step1Workspace
                state={state}
                onUpdate={updateState}
                onIndustryChange={handleIndustryChange}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <Step2DataUpload
                state={state}
                onUpdate={updateState}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 3 && (
              <Step3SchemaMapping
                state={state}
                onUpdate={updateState}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 4 && (
              <Step4ConfigConfirm
                state={state}
                onUpdate={updateState}
                onBack={handleBack}
                onLaunch={handleLaunch}
                launching={launching}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}