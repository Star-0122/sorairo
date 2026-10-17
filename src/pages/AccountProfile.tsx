import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backend } from '../repo'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

const LABEL: Record<string, string> = { student: '生徒', parent: '保護者', teacher: '講師', staff: '社員', admin: '管理者' }

export default function AccountProfile() {
  const { me, reload } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState(me?.name ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  if (!me) return null

  const pick = (f?: File) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast('画像ファイルを選んでください。'); return }
    if (f.size > 5 * 1024 * 1024) { toast('画像は5MB以下にしてください。'); return }
    const r = new FileReader(); r.onload = () => setPreview(String(r.result)); r.onerror = () => toast('画像を読み込めませんでした。別の画像を選んでください。'); r.readAsDataURL(f)
  }
  const save = async () => {
    setErr(''); setBusy(true)
    try { await backend.data.updateDisplayName(name); await reload(); toast(preview ? '氏名を保存しました（画像は保存されていません）' : '保存しました'); nav('/account') }
    catch (e) { const m = toAppError(e).message; setErr(m); toast(m) } finally { setBusy(false) }
  }
  return (
    <>
      <div className="pe">
        {preview ? <span className="av big"><img src={preview} alt="選んだ画像のプレビュー" /></span> : <Avatar big />}
        <label className="btn-l" style={{ cursor: 'pointer' }}>画像を変更<input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
      </div>
      <p className="hint">{preview ? 'プレビュー中の画像は、まだ保存されません（画像の保存は、次のステップで対応します）。' : '画像の保存は、次のステップで対応します。選んだ画像は、この画面での確認用です。'}</p>
      <div className="form">
        <label className="fr"><span>氏名</span><input maxLength={30} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <div className="fr"><span>メールアドレス</span><input value={me.email} disabled /></div>
        <div className="fr"><span>所属</span><input value={me.org} disabled /></div>
        <div className="fr"><span>ロール</span><input value={me.roles.map((r) => LABEL[r] ?? r).join('・')} disabled /></div>
      </div>
      <p className="hint" role="alert" style={{ color: 'var(--red)' }}>{err}</p>
      <p className="hint">メールアドレス・所属・ロールは、ここでは変更できません（管理者が設定します）。</p>
      <div className="pad2"><button className="btn-p" onClick={() => void save()} disabled={busy}>{busy ? '保存中…' : '保存'}</button></div>
    </>
  )
}
