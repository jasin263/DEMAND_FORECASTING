'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { Save, RotateCcw, Database, Briefcase, Cpu, Bell, Loader2, Play } from 'lucide-react';
import TabDataGranularity from './TabDataGranularity';
import TabBusinessContext from './TabBusinessContext';
import TabModeling from './TabModeling';
import TabOutputAlerting from './TabOutputAlerting';
import JsonPreviewPanel from './JsonPreviewPanel';
import { useConfiguration, useSaveConfiguration } from '@/lib/api-hooks';
import type { AppConfig } from '@/lib/api-types';

const defaultConfig: AppConfig = {
  granularity: 'weekly',
  forecastHorizon: 12,
  historyWindow: 104,
  aggregationHierarchy: 'sku-location',
  industryTemplate: 'fmcg',
  defaultLeadTime: 14,
  shelfLifeDays: 90,
  moq: 50,
  serviceLevelTarget: 97.5,
  holidays: ['2026-01-26', '2026-08-15', '2026-10-02'],
  promoCalendarEnabled: true,
  algorithmMode: 'auto',
  selectedAlgorithm: 'lightgbm',
  intermittentRouting: false,
  outlierTreatment: 'winsorize',
  seasonalityMode: 'auto',
  externalRegressors: true,
  backtestingWindow: 8,
  retrainingFrequency: 'weekly',
  predictionIntervals: true,
  hierarchicalReconciliation: 'bottom-up',
  accuracyMetric: 'wape',
  exceptionThreshold: 25,
  reorderFormula: 'dynamic',
  notificationChannel: 'email',
  notificationEmail: 'anika.patel@nestle-india.com',
};

const tabs = [
  { id: 'data', label: 'Data & Granularity', icon: <Database size={15} /> },
  { id: 'business', label: 'Business Context', icon: <Briefcase size={15} /> },
  { id: 'modeling', label: 'Modeling', icon: <Cpu size={15} /> },
  { id: 'output', label: 'Output & Alerting', icon: <Bell size={15} /> },
];

export default function ConfigurationPanelClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('data');
  const [hasChanges, setHasChanges] = useState(false);
  const [running, setRunning] = useState(false);
  
  const { data: configData, loading, error, refetch } = useConfiguration();
  const { mutate: saveConfig, loading: saving, error: saveError } = useSaveConfiguration();
  
  // Initialize config from loaded data or use defaults
  const [config, setConfig] = useState<AppConfig>(configData || defaultConfig);
  
  // Update local config when server data loads
  useEffect(() => {
    if (configData && !hasChanges) {
      setConfig(configData);
    }
  }, [configData, hasChanges]);

  const updateConfig = (partial: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveConfig(config);
      setHasChanges(false);
      toast.success('Configuration saved. Changes will apply on next forecast run.', { duration: 3000 });
    } catch (err) {
      toast.error(saveError || 'Failed to save configuration', { duration: 3000 });
    }
  };

  const handleRunForecast = async () => {
    setRunning(true);
    if (hasChanges) {
      try { await saveConfig(config); setHasChanges(false); } catch {}
    }
    try {
      const res = await fetch('/api/tenants/nestle-fmcg-demo/forecast-timeseries/rerun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) throw new Error('Forecast run failed');
      router.push('/dashboard');
    } catch {
      toast.error('Forecast run failed. Check backend connection and try again.', { duration: 4000 });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setHasChanges(false);
    toast.info('Configuration reset to defaults.', { duration: 2000 });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Toaster position="bottom-right" theme="dark" />
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Toaster position="bottom-right" theme="dark" />
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <p className="text-sm text-negative font-medium">Failed to load configuration</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" theme="dark" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configuration Panel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tenant: <span className="text-foreground">Nestle FMCG Demo</span> · All changes apply on next forecast run
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="status-badge bg-warning/10 text-warning border border-warning/20 text-xs animate-fade-in">
              Unsaved changes
            </span>
          )}
          <button onClick={handleReset} className="btn-secondary text-xs py-1.5">
            <RotateCcw size={13} />
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-secondary text-xs py-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={13} />
                Save Configuration
              </>
            )}
          </button>
          <button
            onClick={handleRunForecast}
            disabled={running}
            className="btn-primary text-xs py-1.5 disabled:opacity-50"
          >
            {running ? (
              <><Loader2 size={13} className="animate-spin" /> Running…</>
            ) : (
              <><Play size={13} /> Run Forecast</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {/* Main config area */}
        <div className="xl:col-span-2 2xl:col-span-3 space-y-4">
          {/* Tab nav */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="animate-fade-in">
            {activeTab === 'data' && <TabDataGranularity config={config} onUpdate={updateConfig} />}
            {activeTab === 'business' && <TabBusinessContext config={config} onUpdate={updateConfig} />}
            {activeTab === 'modeling' && <TabModeling config={config} onUpdate={updateConfig} />}
            {activeTab === 'output' && <TabOutputAlerting config={config} onUpdate={updateConfig} />}
          </div>
        </div>

        {/* JSON preview */}
        <div className="xl:col-span-1 2xl:col-span-1">
          <JsonPreviewPanel config={config} />
        </div>
      </div>
    </div>
  );
}