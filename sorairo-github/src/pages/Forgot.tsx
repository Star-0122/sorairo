import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { backend } from '../repo'
import { toAppError } from '../lib/errors'
import { Brand } from './Login'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    const v = email.trim()
    if (!v.includes('@')) { setErr('メールアドレスを入力してください。'); return }
    setBusy(true)
    try { await backend.auth.requestReset(v); setSent(true) } catch (x) { setErr(toAppError(x).message) } finally { setBusy(false) }
  }
  return (
    <div className="auth">
      <Brand />
      <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>パスワードの再設定</h2>
      {sent ? (
        <p className="ok" role="status">登録されているメールアドレスの場合、再設定用のメールを送信しました。メールが届かないときは、迷惑メールフォルダもご確認ください。</p>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="sub">登録しているメールアドレスを入力してください。再設定用のリンクをお送りします。</p>
          <label className="lbl" htmlFor="em">メールアドレス</label>
          <div className="in"><input id="em" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <p style={{ marginTop: 18 }}><button className="btn-p" type="submit" disabled={busy}>{busy ? '送信中…' : '再設定メールを送る'}</button></p>
          <p className="err" role="alert">{err}</p>
        </form>
      )}
      <Link className="lnk" to="/login">ログインに戻る</Link>
    </div>
  )
}
