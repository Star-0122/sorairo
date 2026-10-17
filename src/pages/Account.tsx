import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar, Icon } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

const LABEL: Record<string, string> = { student: '生徒', parent: '保護者', teacher: '講師', staff: '社員', admin: '管理者' }
const IC = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bell: <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  help: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></>,
  dash: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
}
const Row = ({ icon, label, onClick, tail, disabled }: { icon: keyof typeof IC | 'out'; label: string; onClick: () => void; tail?: React.ReactNode; disabled?: boolean }) => (
  <button className="mrow" onClick={onClick} disabled={disabled}>
    <span className="mi">{icon === 'out' ? <Icon n="out" size={20} /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{IC[icon]}</svg>}</span>
    <span className="ml">{label}</span>{tail ?? <Icon n="chev" size={14} sw={2} />}
  </button>
)

export default function Account() {
  const { me, logout, isAdmin } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!me) return null
  const out = async () => { setBusy(true); try { await logout() } catch (e) { toast(toAppError(e).message); setBusy(false) } }
  return (
    <>
      <div className="acc"><Avatar big /><b>{me.name || 'ユーザー'}</b><span>{me.roles.map((r) => LABEL[r] ?? r).join('・') || 'ロール未設定'}</span><span>{me.org}</span></div>
      <div className="menu">
        <Row icon="user" label="プロフィール" onClick={() => nav('/account/profile')} />
        <Row icon="bell" label="通知設定" onClick={() => nav('/account/notifications')} />
        <Row icon="lock" label="セキュリティ設定" onClick={() => nav('/account/security')} />
        <Row icon="help" label="ヘルプ・よくある質問" onClick={() => toast('「ヘルプ・よくある質問」は準備中です。')} tail={<span className="tg wip">準備中</span>} />
        {isAdmin && <Row icon="dash" label="管理者ダッシュボード" onClick={() => nav('/admin')} />}
        <Row icon="out" label={busy ? 'ログアウト中…' : 'ログアウト'} onClick={out} disabled={busy} tail={<span />} />
      </div>
    </>
  )
}
