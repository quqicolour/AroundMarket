import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-64 gap-4 py-20">
          <div className="text-5xl">⚠️</div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-700">页面出错</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm font-mono">{this.state.error?.message}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-primary text-sm"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
