'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Search, ChevronDown, RefreshCw, Loader2, Wand2 } from 'lucide-react';
import { useRerunForecast } from '../lib/api-hooks';
import { useBacktestResults } from '../lib/api-hooks';
import { readWorkspaceForecastRun } from '../lib/workspace-forecast';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export default function Topbar({ sidebarCollapsed: _ }: TopbarProps) {
  const { execute: rerun, loading: refreshing } = useRerunForecast();
  const { data: backtest } = useBacktestResults();
  const [workspaceContext, setWorkspaceContext] = useState<{ workspaceName: string; industry: string; fileName?: string } | null>(null);

  useEffect(() => {
    const run = readWorkspaceForecastRun();
    if (run) {
      setWorkspaceContext({
        workspaceName: run.workspaceName || 'Your workspace',
        industry: run.industry || 'custom',
        fileName: run.fileName,
      });
    } else {
      setWorkspaceContext(null);
    }
  }, []);

  const lastRun = backtest?.lastRun
    ? new Date(backtest.lastRun).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'Initializing...';

  return (
    <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SKUs, categories, locations..."
            className="input-field pl-8 py-1.5 text-xs h-8"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {workspaceContext && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-positive/20 bg-positive/10 px-2.5 py-1 text-xs text-positive mr-2">
            <Wand2 size={12} />
            {workspaceContext.workspaceName} · {workspaceContext.industry.toUpperCase()}
            {workspaceContext.fileName ? ` · ${workspaceContext.fileName}` : ''}
          </span>
        )}

        {/* Last run info */}
        <span className="text-xs text-muted-foreground hidden md:block mr-2">
          Last run: <span className="text-foreground font-medium">{lastRun}</span>
        </span>

        {/* Refresh */}
        <button
          onClick={() => rerun()}
          className="btn-ghost p-2"
          title="Re-run forecast"
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>

        {/* Notifications */}
        <button className="btn-ghost p-2 relative" title="Notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors ml-1">
          <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white">
            AP
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-foreground">Anika Patel</p>
            <p className="text-xs text-muted-foreground">Demand Planner</p>
          </div>
          <ChevronDown size={12} className="text-muted-foreground hidden md:block" />
        </button>
      </div>
    </header>
  );
}
