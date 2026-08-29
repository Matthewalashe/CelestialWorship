import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('CCC Live Error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="mb-4" style={{ color: 'var(--color-warning)' }}><AlertTriangle size={48} /></div>
          <h2 className="text-xl font-[Outfit] font-bold mb-2"
              style={{ color: 'var(--color-text-primary)' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-4 max-w-md"
             style={{ color: 'var(--color-text-secondary)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary px-6 py-2 rounded-xl text-sm"
            >
              Try Again
            </button>
            <Link
              to="/"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 rounded-xl text-sm card"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
