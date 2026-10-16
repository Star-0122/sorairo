import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { toAppError } from '../lib/errors'
import { Cloud, Icon } from '../components/ui'

export function Brand() {
  return <div className="brand"><span className="icon"><Cloud w={34} h={26} /></span><b>そらいろ</b><span>sorairo</span></div>
}

export default function Login() {
  const { status, login, notice, loadError } = useAuth()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [keep, setKeep] = useState(true)
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (status === 'in') return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await login(id, pw, keep) } catch (x) { setErr(toAppError(x).message) } finally { setBusy(false) }
  }
  return (
    <div className="auth">
      <Brand />
      {(notice || loadError) && <div className="nt" role="alert">{notice || loadError}</div>}
      <form onSubmit={submit} noValidate>
        <label className="lbl" htmlFor="id">メールアドレスまたはユーザーID</label>
        <div className="in"><input id="id" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" placeholder="例) example@star-hoshi.jp" value={id} onChange={(e) => setId(e.target.value)} /></div>
        <label className="lbl" htmlFor="pw">パスワード</label>
        <div className="in">
          <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="パスワードを入力" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}><Icon n="eye" size={18} /></button>
        </div>
        <label className="chk"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />ログイン状態を維持する</label>
        <button className="btn-p" type="submit" disabled={busy}>{busy ? 'ログイン中…' : 'ログイン'}</button>
        <p className="err" role="alert">{err}</p>
      </form>
      <Link className="lnk" to="/forgot">パスワードを忘れた方はこちら</Link>
      <p className="foot">そらのほしグループ</p>
    </div>
  )
}
