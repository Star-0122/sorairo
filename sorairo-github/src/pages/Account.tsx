import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Avatar, Icon } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

const LABEL: Record<string, string> = { student: '生徒', parent: '保護者', teacher: '講師', staff: '社員', admin: '管理者' }

export default function Account() {
  const { me, logout } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!me) return null
  const out = async () => {
    setBusy(true)
    try { await logout() } catch (e) { toast(toAppError(e).message); setBusy(false) }
  }
  return (
    <>
      <div className="acc"><Avatar big /><b>{me.name || 'ユーザー'}</b><span>{me.roles.map((r) => LABEL[r] ?? r).join('・') || 'ロール未設定'}</span><span>{me.org}</span></div>
      <div className="menu">
        <div className="mrow"><span className="ml">メールアドレス<span className="d">{me.email}</span></span></div>
        <button className="mrow" onClick={out} disabled={busy}><span className="mi"><Icon n="out" size={20} /></span><span className="ml">{busy ? 'ログアウト中…' : 'ログアウト'}</span></button>
      </div>
      <p className="hint">プロフィール編集・通知設定・セキュリティ設定は、次のステップで実装します。</p>
    </>
  )
}
