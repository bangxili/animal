import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 回退 UI，不传则静默重置 */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
  resetKey: number;
}

/**
 * 自动恢复错误边界
 * 捕获 removeChild / DOM mutation 类错误后，自动 remount 子树
 * 用于对抗浏览器翻译插件等外部 DOM 注入导致的节点冲突
 */
export class AutoRecoverBoundary extends Component<Props, State> {
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // removeChild 类错误：自动 50ms 后重置，静默恢复
    const isDomMutationError =
      error.message?.includes('removeChild') ||
      error.message?.includes('insertBefore') ||
      error.name === 'NotFoundError';

    if (isDomMutationError) {
      console.warn('[AutoRecoverBoundary] DOM mutation error caught, auto-recovering…', error.message);
      this.resetTimer = setTimeout(() => {
        this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
      }, 50);
    } else {
      console.error('[AutoRecoverBoundary] Non-DOM error, not auto-recovering:', error, info);
    }
  }

  componentWillUnmount() {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  render() {
    if (this.state.error) {
      // 正在等待自动恢复期间显示空白（或 fallback）
      return this.props.fallback ?? null;
    }
    return (
      // key 变化强制 React 完整重建子树，清除所有残留 fiber 引用
      <div key={this.state.resetKey} style={{ display: 'contents' }}>
        {this.props.children}
      </div>
    );
  }
}
