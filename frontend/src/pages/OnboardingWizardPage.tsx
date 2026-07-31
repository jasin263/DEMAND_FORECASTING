import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGenericDatasetProfile, useOnboarding, useSaveGenericDataset } from '../lib/api-hooks';
import { Toaster, toast } from 'sonner';
import { Check, ChevronRight, ChevronLeft, ArrowRight, Upload, FileSpreadsheet, Database, Loader2, Building2, Info, Scan, History } from 'lucide-react';
import AppLogo from '../components/ui/AppLogo';
import type { OnboardingState, OnboardingConfig } from '../lib/api-types';

type IndustryTemplate = 'fmcg' | 'auto' | 'pharma' | 'custom';

const STEPS = [
  { id: 1, label: 'Workspace', description: 'Name & industry' },
  { id: 2, label: 'Connect Data', description: 'Upload or connect' },
  { id: 3, label: 'Map Schema', description: 'Column mapping' },
  { id: 4, label: 'Confirm', description: 'Review & launch' },
];

const industryDefaults: Record<IndustryTemplate, Partial<OnboardingState['config']>> = {
  fmcg: { forecastHorizon: 12, granularity: 'weekly', algorithm: 'lightgbm', seasonality: true, intermittentHandling: false },
  auto: { forecastHorizon: 8, granularity: 'monthly', algorithm: 'croston', seasonality: false, intermittentHandling: true },
  pharma: { forecastHorizon: 16, granularity: 'monthly', algorithm: 'sarima', seasonality: true, intermittentHandling: false },
  custom: { forecastHorizon: 12, granularity: 'weekly', algorithm: 'auto', seasonality: true, intermittentHandling: false },
};

const defaultConfig: OnboardingState['config'] = {
  forecastHorizon: 12,
  granularity: 'weekly',
  algorithm: 'auto',
  seasonality: true,
  intermittentHandling: false,
};

function normalizeColumnMappings(suggestions: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (typeof suggestions.date_column === 'string' && suggestions.date_column.trim()) {
    normalized.date = suggestions.date_column;
  }

  if (typeof suggestions.entity_column === 'string' && suggestions.entity_column.trim()) {
    normalized.sku = suggestions.entity_column;
  }

  if (typeof suggestions.target_column === 'string' && suggestions.target_column.trim()) {
    normalized.demand = suggestions.target_column;
  }

  return normalized;
}

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'launching' | 'success'>('idle');
  const [state, setState] = useState<OnboardingState>({
    workspaceName: '',
    industry: 'fmcg',
    uploadedFile: null,
    columnMappings: {},
    dataLimitWeeks: null,
    config: defaultConfig,
  });
  const [dragOver, setDragOver] = useState(false);
  const [profiledColumns, setProfiledColumns] = useState<Record<string, unknown>>({});
  const [profileSuggestions, setProfileSuggestions] = useState<Record<string, unknown>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const { execute: launchOnboarding, loading: launching, error: launchError } = useOnboarding();
  const { execute: profileDataset } = useGenericDatasetProfile();
  const { execute: saveDataset } = useSaveGenericDataset();

  const updateState = (partial: Partial<OnboardingState>) => {
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

  const handleLaunch = async () => {
    const mappingPayload = {
      target_column: state.columnMappings.demand || state.columnMappings.sales || state.columnMappings.units || state.columnMappings.qty || state.columnMappings.quantity || state.columnMappings.target || profileSuggestions.target_column || '',
      date_column: state.columnMappings.date || profileSuggestions.date_column || '',
      entity_column: state.columnMappings.sku || state.columnMappings.product_id || state.columnMappings.product || state.columnMappings.item || state.columnMappings.entity || profileSuggestions.entity_column || '',
      forecast_horizon: state.config.forecastHorizon,
      data_limit_weeks: state.dataLimitWeeks || undefined,
    };

    setLaunchStatus('launching');

    // Background non-critical call
    launchOnboarding(state).catch(() => {});

    // Upload dataset — await so it's ready when Run Forecast is clicked
    if (state.uploadedFile) {
      try {
        await saveDataset(state.uploadedFile, mappingPayload);
      } catch {
        // Upload failed; user can re-upload from config panel if needed
      }
    }

    window.localStorage.setItem('forecastiq.onboardingComplete', 'true');
    window.localStorage.setItem('forecastiq.workspaceName', state.workspaceName);
    window.localStorage.setItem('forecastiq.industry', state.industry);
    window.localStorage.setItem('forecastiq.lastForecastRun', JSON.stringify({
      workspaceName: state.workspaceName,
      industry: state.industry,
      mapping: mappingPayload,
      fileName: state.uploadedFile?.name,
      config: state.config,
    }));

    navigate('/configuration-panel');
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      updateState({ uploadedFile: file, columnMappings: {} });
      void handleProfileFile(file);
    }
  };

  const handleProfileFile = async (file: File) => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      const result = await profileDataset(file);
      const normalizedMappings = normalizeColumnMappings(result.suggestions as Record<string, unknown>);
      setProfiledColumns(result.columns || {});
      setProfileSuggestions(result.suggestions || {});
      updateState({ columnMappings: { ...state.columnMappings, ...normalizedMappings } });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to profile file');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="bottom-right" theme="dark" />

      {/* Minimal header */}
      <header className="h-14 border-b border-border flex items-center px-6 gap-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <AppLogo size={26} />
          <span className="font-semibold text-sm text-foreground">ForecastIQ</span>
        </Link>
        <span className="text-muted-foreground text-sm">·</span>
        <span className="text-sm text-muted-foreground">New Workspace Setup</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/dashboard" className="btn-ghost text-xs">
            ← Open Dashboard
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-3xl 2xl:max-w-4xl">
          {/* Step indicator */}
          <StepIndicator steps={STEPS} currentStep={step} />

          {/* Step content */}
          <div className="mt-8 animate-slide-up">
            {launchStatus === 'success' ? (
              <LaunchSuccessState state={state} />
            ) : (
              <>
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
                    dragOver={dragOver}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onProfileFile={handleProfileFile}
                    profiledColumns={profiledColumns}
                    profileSuggestions={profileSuggestions}
                    profileLoading={profileLoading}
                    profileError={profileError}
                  />
                )}
                {step === 3 && (
                  <Step3SchemaMapping
                    state={state}
                    onUpdate={updateState}
                    onNext={handleNext}
                    onBack={handleBack}
                    profiledColumns={profiledColumns}
                  />
                )}
                {step === 4 && (
                  <Step4ConfigConfirm
                    state={state}
                    onUpdate={updateState}
                    onBack={handleBack}
                    onLaunch={handleLaunch}
                    launching={launching || launchStatus === 'launching'}
                    profileSuggestions={profileSuggestions}
                    profileLoading={profileLoading}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ steps, currentStep }: { steps: { id: number; label: string; description: string }[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, idx) => (
        <React.Fragment key={`step-${s.id}`}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                currentStep > s.id
                  ? 'bg-primary text-primary-foreground'
                  : currentStep === s.id
                  ? 'bg-primary/20 text-primary border-2 border-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > s.id ? <Check size={14} /> : s.id}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${currentStep >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">{s.description}</span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`h-px w-10 sm:w-16 lg:w-20 ${currentStep > s.id ? 'bg-primary' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function LaunchSuccessState({ state }: { state: OnboardingState }) {
  return (
    <div className="glass-card p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-positive/10 text-positive">
        <Check size={28} />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-foreground">Workspace ready</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your workspace <span className="font-medium text-foreground">{state.workspaceName || 'has been created'}</span> is now active. Configure your model settings before running the forecast.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
        <p className="mt-1 text-sm text-foreground">We're opening the configuration experience so you can refine the model, horizon, and tuning parameters.</p>
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Redirecting to configuration panel…
      </div>
    </div>
  );
}

function Step1Workspace({
  state, onUpdate, onIndustryChange, onNext,
}: {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onIndustryChange: (industry: IndustryTemplate) => void;
  onNext: () => void;
}) {
  const industries = [
    { id: 'fmcg' as IndustryTemplate, label: 'FMCG', description: 'Fast-Moving Consumer Goods', icon: '🏭' },
    { id: 'auto' as IndustryTemplate, label: 'Auto Parts', description: 'Automotive components', icon: '🚗' },
    { id: 'pharma' as IndustryTemplate, label: 'Pharma', description: 'Pharmaceuticals', icon: '💊' },
    { id: 'custom' as IndustryTemplate, label: 'Custom', description: 'Other industry', icon: '⚙️' },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Name your workspace</h2>
        <p className="text-sm text-muted-foreground mb-5">Choose a name and industry template to get started.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Workspace name <span className="text-negative">*</span>
            </label>
            <input
              type="text"
              value={state.workspaceName}
              onChange={(e) => onUpdate({ workspaceName: e.target.value })}
              className="input-field w-full"
              placeholder="e.g. Nestle India FMCG"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Industry template <span className="text-negative">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-3">Pre-populates configuration for your vertical.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {industries.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => onIndustryChange(ind.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    state.industry === ind.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <span className="text-2xl">{ind.icon}</span>
                  <p className="mt-2 text-sm font-medium text-foreground">{ind.label}</p>
                  <p className="text-xs text-muted-foreground">{ind.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!state.workspaceName.trim()}
          className="btn-primary text-sm py-2 disabled:opacity-50"
        >
          Next step <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Step2DataUpload({
  state, onUpdate, onNext, onBack, dragOver, onDragOver, onDragLeave, onDrop, onProfileFile, profiledColumns, profileSuggestions, profileLoading, profileError,
}: {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onProfileFile: (file: File) => void;
  profiledColumns: Record<string, unknown>;
  profileSuggestions: Record<string, unknown>;
  profileLoading: boolean;
  profileError: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (file?: File | null) => {
    if (!file) return;
    onUpdate({ uploadedFile: file, columnMappings: {} });
    onProfileFile(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Connect your data</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a CSV/Excel file with your historical demand data or connect a live source.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button className="btn-secondary text-sm py-3 justify-center" onClick={() => window.open('/data-sources', '_self')}>
            <Database size={16} /> Connect API
          </button>
          <button className="btn-secondary text-sm py-3 justify-center" onClick={openFilePicker}>
            <FileSpreadsheet size={16} /> Upload your dataset
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
          }`}
        >
          {state.uploadedFile ? (
            <div className="space-y-2">
              <FileSpreadsheet size={32} className="text-primary mx-auto" />
              <p className="font-medium text-foreground">{state.uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(state.uploadedFile.size / 1024).toFixed(1)} KB</p>
              {Object.keys(state.columnMappings).length > 0 && (
                <p className="text-xs text-positive">{Object.keys(state.columnMappings).length} schema mappings pre-configured</p>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ uploadedFile: null, columnMappings: {} });
                }}
                className="btn-ghost text-xs text-negative"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={32} className="text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">Drop your file here, or click to browse</p>
              <p className="text-xs text-muted-foreground">Upload your own demand history, sales, or operational dataset to start forecasting.</p>
              <p className="text-xs text-muted-foreground mt-1">Supports CSV and Excel files (max 50MB)</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFilePicker();
                }}
                className="btn-secondary text-xs py-2 px-3 mt-3"
              >
                Browse files
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelection(file);
            }
            e.currentTarget.value = '';
          }}
        />

        {profileLoading && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center animate-pulse-ring">
                  <Scan size={18} className="text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Profiling your file<span className="animate-dots" />
                </p>
                <p className="text-xs text-muted-foreground">Detecting columns, data types, and demand patterns…</p>
              </div>
              <Loader2 size={16} className="text-primary animate-spin" />
            </div>
            <div className="relative mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="absolute top-0 h-full w-2/5 rounded-full animate-scan-bar bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            </div>
          </div>
        )}
        {profileError && <p className="text-sm text-negative">{profileError}</p>}
        {Object.keys(profiledColumns).length > 0 && (
          <div className="rounded-xl border border-border p-4 text-left">
            <p className="text-sm font-semibold text-foreground">Detected columns</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.keys(profiledColumns).map((column) => (
                <span key={column} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{column}</span>
              ))}
            </div>
            {profileSuggestions && 'target_column' in profileSuggestions && (
              <p className="mt-3 text-xs text-muted-foreground">
                Suggested mapping: target <span className="font-medium text-foreground">{String(profileSuggestions.target_column)}</span>, date <span className="font-medium text-foreground">{String(profileSuggestions.date_column)}</span>, entity <span className="font-medium text-foreground">{String(profileSuggestions.entity_column)}</span>
              </p>
            )}
          </div>
        )}

        {Object.keys(profiledColumns).length > 0 && (
          <div className="mt-5 rounded-xl border border-border p-4 text-left">
            <div className="flex items-center gap-2">
              <History size={15} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">How much data should the pipeline use?</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Choose how much history to include in the forecast run. More history captures yearly seasonality but takes longer to compute; less history trains faster on recent trends.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { weeks: null, label: 'All data', detail: 'Full history' },
                { weeks: 156, label: 'Last 3 years', detail: '156 weeks' },
                { weeks: 104, label: 'Last 2 years', detail: '104 weeks' },
                { weeks: 52, label: 'Last year', detail: '52 weeks' },
              ].map((opt) => {
                const selected = state.dataLimitWeeks === opt.weeks;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onUpdate({ dataLimitWeeks: opt.weeks })}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      {selected && <Check size={14} className="text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost text-sm py-2">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary text-sm py-2"
        >
          Next step <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Step3SchemaMapping({
  state, onUpdate, onNext, onBack, profiledColumns,
}: {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
  profiledColumns: Record<string, unknown>;
}) {
  const sourceFields = Object.keys(profiledColumns).length > 0 ? Object.keys(profiledColumns) : [];
  const profiled = Object.keys(profiledColumns).length > 0;
  const targetFields = [
    { key: 'date', label: 'Date/Week', required: true },
    { key: 'sku', label: 'SKU / Product ID', required: true },
    { key: 'demand', label: 'Demand / Sales', required: true },
    { key: 'price', label: 'Price (optional)', required: false },
    { key: 'promo', label: 'Promo flag (optional)', required: false },
  ];

  const handleMapping = (targetKey: string, sourceValue: string) => {
    onUpdate({ columnMappings: { ...state.columnMappings, [targetKey]: sourceValue } });
  };

  const requiredMapped = targetFields
    .filter((f) => f.required)
    .every((f) => state.columnMappings[f.key]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Map your schema</h2>
            <p className="text-sm text-muted-foreground">Tell us which columns in your data correspond to each forecast field.</p>
          </div>
          {Object.keys(state.columnMappings).length > 0 && (
            <span className="status-badge bg-positive/10 text-positive border border-positive/20 text-xs shrink-0">
              {Object.values(state.columnMappings).filter(Boolean).length}/{targetFields.length} mapped
            </span>
          )}
        </div>

        {!profiled && (
          <div className="mb-4 rounded-xl bg-negative/5 border border-negative/20 p-3 text-xs text-negative">
            Upload your dataset file first so we can detect its columns. Column names must match your file exactly.
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Forecast Field</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Source Column</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {targetFields.map((field) => (
                <tr key={field.key}>
                  <td className="px-4 py-3 text-foreground font-medium">{field.label}</td>
                  <td className="px-4 py-3">
                    <select
                      disabled={!profiled}
                      value={state.columnMappings[field.key] || ''}
                      onChange={(e) => handleMapping(field.key, e.target.value)}
                      className={`input-field text-xs w-full ${state.columnMappings[field.key] ? 'border-positive/40' : field.required ? 'border-negative/40' : ''} ${!profiled ? 'opacity-50' : ''}`}
                    >
                      <option value="">— Select column —</option>
                      {sourceFields.map((sf) => (
                        <option key={sf} value={sf}>{sf}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {field.required ? (
                      <span className="text-negative text-xs font-medium">Required</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Optional</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl bg-info/5 border border-info/20 p-3 flex items-start gap-2">
          <Info size={14} className="text-info shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            The three required fields are essential for the forecast engine. Optional fields improve accuracy when available.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost text-sm py-2">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!requiredMapped}
          className="btn-primary text-sm py-2 disabled:opacity-50"
        >
          Next step <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Step4ConfigConfirm({
  state, onUpdate, onBack, onLaunch, launching, profileSuggestions, profileLoading,
}: {
  state: OnboardingState;
  onUpdate: (partial: Partial<OnboardingState>) => void;
  onBack: () => void;
  onLaunch: () => void;
  launching: boolean;
  profileSuggestions: Record<string, unknown>;
  profileLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Confirm & launch</h2>
        <p className="text-sm text-muted-foreground mb-5">Review your selections before launching the forecast run.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/50 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workspace</h3>
            <p className="text-sm font-medium text-foreground">{state.workspaceName || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Industry: {state.industry}</p>
          </div>

          <div className="rounded-xl bg-muted/50 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data</h3>
            <p className="text-sm font-medium text-foreground">
              {state.uploadedFile ? state.uploadedFile.name : 'No file uploaded'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(state.columnMappings).length} column mappings configured ·{' '}
              {state.dataLimitWeeks ? `Last ${state.dataLimitWeeks} weeks of history` : 'All data (full history)'}
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 md:col-span-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Forecast Configuration</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {[
                { label: 'Granularity', value: state.config.granularity },
                { label: 'Horizon', value: `${state.config.forecastHorizon} periods` },
                { label: 'Algorithm', value: state.config.algorithm },
                { label: 'Seasonality', value: state.config.seasonality ? 'Enabled' : 'Disabled' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Ready to launch</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Launching now starts the forecast engine and opens the configuration panel so you can tune the model, horizon, and other variables.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} disabled={launching} className="btn-ghost text-sm py-2">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Step 4 of 4</span>
          <button
            onClick={onLaunch}
            disabled={launching}
            className="btn-primary text-sm py-2 disabled:opacity-50"
          >
            {launching ? (
              <><Loader2 size={14} className="animate-spin" /> Launching…</>
            ) : (
              <><ArrowRight size={16} /> Continue to Configuration</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}