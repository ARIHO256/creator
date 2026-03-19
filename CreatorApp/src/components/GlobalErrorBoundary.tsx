import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * GlobalErrorBoundary
 * -------------------
 * Catches rendering errors anywhere in the app tree.
 * Displays a premium recovery UI with "Reload" and "Home" options.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // In a real app, you would send this to Sentry, LogRocket, etc.
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center transition-colors">
                    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl">
                        <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-6">
                            <AlertTriangle className="h-8 w-8 text-rose-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                            The application encountered an unexpected error. We've been notified and are working on it.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleReload}
                                className="w-full py-3 px-4 bg-[#f77f00] hover:bg-[#e67600] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Reload Page
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
                            >
                                <Home className="h-4 w-4" />
                                Return to Dashboard
                            </button>
                        </div>

                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">Error Details</p>
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 overflow-auto max-h-32 text-left">
                                    <code className="text-[11px] text-rose-500 font-mono">
                                        {this.state.error.toString()}
                                    </code>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
