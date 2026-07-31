import React from 'react';

type BadgeVariant = 'positive' | 'negative' | 'warning' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  positive: 'bg-positive/10 text-positive',
  negative: 'bg-negative/10 text-negative',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
};

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`status-badge ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
