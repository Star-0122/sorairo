import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('画面の表示中にエラーが発生しました', error) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="auth" role="alert">
        <div className="nt"><b>画面を表示できませんでした</b><br />ページを再読み込みしてください。解決しない場合は、管理者に連絡してください。</div>
        <button className="btn-p" onClick={() => location.reload()}>再読み込み</button>
      </div>
    )
  }
}
