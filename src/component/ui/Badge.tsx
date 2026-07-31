import React from 'react';

type BadgeVariant = 'positive' | 'negative' | 'warning' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  positive: 'bg-[var(--positive-bg)] text-positive border border-positive/20',
  negative: 'bg-[var(--negative-bg)] text-negative border border-negative/20',
  warning: 'bg-[var(--warning-bg)] text-warning border border-warning/20',
  info: 'bg-[var(--info-bg)] text-accent border border-accent/20',
  neutral: 'bg-muted text-muted-foreground border border-border',
  primary: 'bg-primary/10 text-primary border border-primary/20',
};

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`status-badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}