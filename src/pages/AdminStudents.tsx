import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { backend } from '../repo'
import type { Student } from '../repo/types'
import { useLoad } from '../components/useLoad'
import { Avatar, Empty, Icon, Loading } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

export function AdminStudents() {
  const nav = useNavigate()
  const { data, error, reload } = useLoad(() => backend.data.listStudents())
  const [q, setQ] = useState('')
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!data) return <Loading />
  const l = data.filter((u) => !q.trim() || (u.name + u.org).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <div className="pad2" style={{ marginBottom: 0 }}><button className="btn-p" onClick={() => nav('/admin/students/new')}>生徒を追加</button></div>
      <div className="search"><Icon n="search" size={16} sw={2} /><input type="search" placeholder="生徒を検索" aria-label="生徒を検索" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="lst">
        {l.length === 0 ? <Empty title={data.length ? '該当する生徒がいません' : '生徒がまだ登録されていません'}>{data.length ? '検索ワードを変えてみてください。' : '生徒のアカウントは、登録されるとここに表示されます。'}</Empty> : l.map((u) => (
          <button key={u.id} className="sli" onClick={() => nav(`/admin/students/${u.id}`)}>
            <span className="av sm"><Avatar /></span>
            <span className="m"><b>{u.name || '（氏名未設定）'}</b><span className="d">{u.org || '所属なし'}</span></span>
            <span className={`tg ${u.status === 'active' ? 'ok2' : 'wip'}`}>{u.status === 'active' ? '有効' : '停止'}</span><Icon n="chev" size={14} sw={2} />
          </button>
        ))}
      </div>
      <p className="hint">保護者のアカウントは、この画面では管理できません。</p>
    </>
  )
}

export function AdminStudentEdit() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data, error, reload } = useLoad(() => backend.data.getStudent(id).then((s) => ({ s })), [id])
  const [name, setName] = useState<string | null>(null)
  const [org, setOrg] = useState<string | null>(null)
  const [st, setSt] = useState<Student['status'] | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!data) return <Loading />
  const s = data.s
  if (!s) return <Empty title="生徒が見つかりません" action={<p><button className="btn-l" onClick={() => nav('/admin/students')}>一覧に戻る</button></p>}>存在しないか、管理の対象外のアカウントです（保護者は管理できません）。</Empty>
  const v = { name: name ?? s.name, org: org ?? s.org, status: st ?? s.status }
  const save = async () => {
    setErr(''); setBusy(true)
    try { await backend.data.updateStudent(s.id, v); toast('保存しました'); nav('/admin/students') } catch (e) { const m = toAppError(e).message; setErr(m); toast(m) } finally { setBusy(false) }
  }
  return (
    <>
      <div className="form">
        <label className="fr"><span>氏名</span><input maxLength={30} value={v.name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="fr"><span>所属</span><input maxLength={40} value={v.org} onChange={(e) => setOrg(e.target.value)} /></label>
        <div className="fr"><span>ロール</span><input value="生徒" disabled /></div>
      </div>
      <div className="rs" style={{ borderStyle: 'solid' }}>
        <b>アカウントの状態</b>
        <div className="seg" role="group" aria-label="アカウントの状態">
          {([['active', '有効'], ['suspended', '停止']] as const).map(([k, t]) => <button key={k} aria-pressed={v.status === k} onClick={() => setSt(k)}>{t}</button>)}
        </div>
        <p className="hint" style={{ margin: '8px 0 0' }}>停止にすると、そのアカウントはログインしても利用できなくなります。</p>
      </div>
      <p className="hint" role="alert" style={{ color: 'var(--red)' }}>{err}</p>
      <div className="pad2"><button className="btn-p" disabled={busy} onClick={() => void save()}>{busy ? '保存中…' : '保存'}</button></div>
    </>
  )
}
