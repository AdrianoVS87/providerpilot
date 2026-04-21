"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <Card className="bg-slate-900 border-red-900/50 max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-bold text-white mb-2">Something went wrong</h3>
              <p className="text-sm text-slate-400 mb-4">{this.state.error?.message || "Unexpected error"}</p>
              <Button onClick={() => this.setState({ hasError: false })} variant="outline" className="border-slate-700">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
