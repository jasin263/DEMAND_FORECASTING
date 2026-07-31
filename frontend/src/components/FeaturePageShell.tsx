import React from 'react';

interface FeaturePageShellProps {
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function FeaturePageShell({ title, description, badge, actions, children }: FeaturePageShellProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {badge && (
              <span className="status-badge bg-primary/10 text-primary text-xs">{badge}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
