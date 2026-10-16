import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { backend } from '../repo'
import { useAuth } from '../auth/AuthContext'
import { toAppError } from '../lib/errors'
import { Brand } from './Login'

export default function Reset() {
  const { status, finishRecovery } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (status === 'loading') return <div className="auth"><Brand /><p className="sub" role="status" style={{ textAlign: 'center' }}>確認しています…</p></div>
  if (status !== 'recovery') {
    return (
      <div className="auth"><Brand />
        <div className="nt" role="alert">このリンクは無効か、有効期限が切れています。もう一度、再設定メールを請求してください。</div>
        <Link className="lnk" to="/forgot">再設定メールを請求する</Link>
      </div>
    )
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (pw.length < 8) { setErr('パスワードは8文字以上にしてください。'); return }
    if (pw !== pw2) { setErr('確認用のパスワードが一致しません。'); return }
    setBusy(true)
    try {
      await backend.auth.setNewPassword(pw)
      await finishRecovery()
      nav('/login', { replace: true })
    } catch (x) { setErr(toAppError(x).message) } finally { setBusy(false) }
  }
  return (
    <div className="auth">
      <Brand />
      <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>新しいパスワードの設定</h2>
      <form onSubmit={submit} noValidate>
        <label className="lbl" htmlFor="p1">新しいパスワード（8文字以上）</label>
        <div className="in"><input id="p1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <label className="lbl" htmlFor="p2">もう一度入力</label>
        <div className="in"><input id="p2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <p style={{ marginTop: 18 }}><button className="btn-p" type="submit" disabled={busy}>{busy ? '保存中…' : 'パスワードを設定する'}</button></p>
        <p className="err" role="alert">{err}</p>
      </form>
    </div>
  )
}
