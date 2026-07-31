import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-hero-xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">This page does not exist.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The forecast you're looking for might have been archived or the link is invalid.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to dashboard
          </button>
          <button onClick={() => window.history.back()} className="btn-secondary">
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
