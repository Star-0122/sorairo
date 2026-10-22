import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { backend } from '../repo'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

export default function AdminStudentNew() {
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // 初期パスワードは、この画面の中にだけ保持する（保存・ログ出力はしない）。画面を離れると再表示できない
  const [done, setDone] = useState<{ email: string; password: string; name: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('')
    if (!name.trim()) { setErr('氏名を入力してください。'); return }
    if (!email.trim()) { setErr('メールアドレスを入力してください。'); return }
    setBusy(true)
    try {
      const r = await backend.data.createStudent({ name, email, org })
      setDone({ email: r.email, password: r.password, name: name.trim() })
      toast('生徒のアカウントを作成しました')
    } catch (x) { const m = toAppError(x).message; setErr(m); toast(m) } finally { setBusy(false) }
  }
  const copy = async (t: string, label: string) => {
    try { await navigator.clipboard.writeText(t); toast(`${label}をコピーしました`) } catch { toast('コピーできませんでした。表示されている文字を、手で控えてください。') }
  }

  if (done) {
    return (
      <>
        <div className="card2" role="status">
          <b>「{done.name}」さんのアカウントを作成しました</b>
          <div className="cred"><span className="sub">メールアドレス</span><code>{done.email}</code><button className="btn-l" onClick={() => void copy(done.email, 'メールアドレス')}>コピー</button></div>
          <div className="cred"><span className="sub">初期パスワード</span><code data-testid="initial-password">{done.password}</code><button className="btn-l" onClick={() => void copy(done.password, 'パスワード')}>コピー</button></div>
        </div>
        <div className="nt" role="alert" style={{ margin: '12px 16px 0' }}>
          <b>この画面を閉じると、パスワードは再表示できません。</b><br />
          他の人に見られない方法で、生徒に伝えてください。ログイン後に「アカウント → セキュリティ設定」でパスワードを変更するよう、案内してください。
        </div>
        <div className="pad2"><button className="btn-p" onClick={() => { setDone(null); setName(''); setEmail(''); setOrg('') }}>続けて追加する</button></div>
        <div className="pad2" style={{ marginTop: -6 }}><button className="btn-g" onClick={() => nav('/admin/students')}>生徒の一覧に戻る</button></div>
      </>
    )
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="form" style={{ marginTop: 14 }}>
        <label className="fr"><span>氏名</span><input maxLength={30} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
        <label className="fr"><span>メールアドレス</span><input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
        <label className="fr"><span>所属（任意）</span><input maxLength={40} value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="off" /></label>
        <div className="fr"><span>ロール</span><input value="生徒" disabled /></div>
      </div>
      <p className="hint">初期パスワードは、自動で作られます。作成した直後の1回だけ画面に表示されます。</p>
      <p className="hint" role="alert" style={{ color: 'var(--red)' }}>{err}</p>
      <div className="pad2"><button className="btn-p" type="submit" disabled={busy}>{busy ? '作成中…' : 'アカウントを作成'}</button></div>
    </form>
  )
}
