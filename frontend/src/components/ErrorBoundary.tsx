import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center max-w-md">
            <AlertTriangle size={32} className="text-negative mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">Something went wrong</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.handleRetry} className="btn-secondary text-xs py-1.5">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
