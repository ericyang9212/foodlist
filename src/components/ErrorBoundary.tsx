import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-svh bg-[#0a0a0a] px-8 text-center">
          <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-5">— —</div>
          <h1 className="text-[20px] text-gold-gradient tracking-[0.15em] font-medium mb-3">出了一點狀況</h1>
          <p className="text-[#777] text-[13px] tracking-wider mb-8 leading-relaxed max-w-xs">
            畫面遇到非預期的錯誤。你的資料是安全的，重新整理通常就會恢復。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-3 text-[14px] tracking-[0.3em]"
          >
            重新整理
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-[10px] text-[#a85959] max-w-full overflow-x-auto whitespace-pre-wrap text-left opacity-70">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
