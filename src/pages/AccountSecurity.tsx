import { useState, type FormEvent } from 'react'
import { backend } from '../repo'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

export default function AccountSecurity() {
  const { me } = useAuth()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (!me) return null
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (pw.length < 8) { setErr('パスワードは8文字以上にしてください。'); return }
    if (pw !== pw2) { setErr('確認用のパスワードが一致しません。'); return }
    setBusy(true)
    try { await backend.auth.changePassword(pw); setPw(''); setPw2(''); toast('パスワードを変更しました') } catch (x) { const m = toAppError(x).message; setErr(m); toast(m) } finally { setBusy(false) }
  }
  return (
    <>
      <div className="menu">
        <div className="mrow"><span className="ml">メールアドレス<span className="d">{me.email}</span></span></div>
        <div className="mrow"><span className="ml">最終ログイン<span className="d">{me.lastSignIn ? new Date(me.lastSignIn).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '—'}</span></span></div>
      </div>
      <h2 className="h2p">パスワードの変更</h2>
      <form onSubmit={submit} noValidate>
        <div className="form">
          <label className="fr"><span>新しいパスワード</span><input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8文字以上" /></label>
          <label className="fr"><span>もう一度入力</span><input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
        </div>
        <p className="hint" role="alert" style={{ color: 'var(--red)' }}>{err}</p>
        <div className="pad2"><button className="btn-p" type="submit" disabled={busy}>{busy ? '変更中…' : 'パスワードを変更する'}</button></div>
      </form>
    </>
  )
}
