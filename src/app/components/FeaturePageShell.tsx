'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';

interface FeaturePageShellProps {
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function FeaturePageShell({
  title,
  description,
  badge,
  actions,
  children,
}: FeaturePageShellProps) {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                {badge ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {badge}
                  </span>
                ) : null}
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>
        {children}
      </div>
    </AppLayout>
  );
}
