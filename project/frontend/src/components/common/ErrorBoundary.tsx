import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** 出错时展示的上下文名（如「苏格拉底对话」），便于用户描述问题 */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * 渲染异常兜底。
 *
 * 全项目此前**没有任何 ErrorBoundary** —— 任何一处渲染抛错，React 都会卸载整棵树，
 * 用户看到的就是纯白页面、连一句提示都没有（「苏格拉底对话最后一步白屏」就是这样
 * 被放大成最严重的表现：本可以显示错误的原因，却只给了一片空白）。
 *
 * 注意：它只能捕获**渲染期**的错误，捕获不到事件回调与异步里的异常。
 */
export class ErrorBoundary extends Component<Props, State> {

  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] 渲染异常:", error, info.componentStack);
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center px-6 py-10">
        <div className="wb-card max-w-lg w-full flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <p className="text-base font-medium text-app-fg">
            {this.props.label ? `${this.props.label}渲染出错了` : "页面渲染出错了"}
          </p>
          <p className="text-sm text-app-t3 leading-relaxed">
            这部分内容没能画出来。可以先点「重试」；若反复出现，请把下面这行信息一并反馈。
          </p>
          <code className="w-full text-left text-[11px] text-app-t4 bg-app-chrome rounded-lg px-3 py-2 break-all">
            {error.message || String(error)}
          </code>
          <button onClick={this.handleRetry} className="wb-btn wb-btn-primary mt-1">
            <RotateCcw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    );
  }
}
