import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Что-то пошло не так</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {this.state.error?.message || "Произошла непредвиденная ошибка."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
