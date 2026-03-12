"use client";

import React from "react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("Uncaught render error:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100">
                    <div className="text-center space-y-4 p-8">
                        <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
                        <p className="text-slate-400 text-sm">An unexpected error occurred during rendering.</p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false });
                                window.location.reload();
                            }}
                            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Reload Game
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
