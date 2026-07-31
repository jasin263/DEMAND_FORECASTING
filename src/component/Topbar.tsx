'use client';

import React, { useState } from 'react';
import { Bell, Search, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import api from '@/lib/api-client';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export default function Topbar({ sidebarCollapsed: _ }: TopbarProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/tenants/nestle-fmcg-demo/forecast-timeseries/rerun', {});
    } catch {
      // silently fail — forecast will still serve cached data
    }
    setRefreshing(false);
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search SKUs, categories, locations…"
            className="input-field pl-8 py-1.5 text-xs h-8"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Last run info */}
        <span className="text-xs text-muted-foreground hidden md:block mr-2">
          Last run: <span className="text-foreground font-medium">Jul 23, 2026 · 05:47 UTC</span>
        </span>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
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