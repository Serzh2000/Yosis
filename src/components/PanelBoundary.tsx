import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export class PanelBoundary extends Component<
  { children: ReactNode; name: string; resetKey?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Рабочая область ${this.props.name}`, error, info.componentStack);
  }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; name: string; resetKey?: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed)
      this.setState({ failed: false });
  }
  render() {
    if (this.state.failed)
      return (
        <div className="empty-workspace" role="alert">
          <h2>Не удалось открыть {this.props.name}</h2>
          <p>Исходники проекта сохранены отдельно. Можно повторить открытие рабочей области.</p>
          <button className="button primary" onClick={() => this.setState({ failed: false })}>
            Попробовать ещё раз
          </button>
        </div>
      );
    return this.props.children;
  }
}
