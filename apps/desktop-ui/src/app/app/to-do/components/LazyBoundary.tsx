"use client";

import React from "react";

interface LazyBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface LazyBoundaryState {
  error: Error | null;
}

export class LazyBoundary extends React.Component<LazyBoundaryProps, LazyBoundaryState> {
  state: LazyBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("LazyBoundary caught error:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load this section. The app may have updated since you opened it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
