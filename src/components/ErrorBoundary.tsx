import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

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
        <div className="empty-block" style={{ minHeight: 280, padding: 48 }}>
          <span className="empty-icon" style={{ color: "var(--no)" }}><AlertTriangle size={32} strokeWidth={1.8} aria-hidden="true" /></span>
          <p className="empty-title">Something went wrong</p>
          <p className="empty-desc" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-tertiary)" }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 12 }}
          >
            <RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
