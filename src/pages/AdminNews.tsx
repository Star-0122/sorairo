import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { backend } from '../repo'
import type { AdminNews } from '../repo/types'
import { useLoad } from '../components/useLoad'
import { Empty, Icon, Loading } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'
import { fmt } from '../lib/format'
import { toLocalInput } from '../lib/time'

const state = (x: AdminNews): [string, string] => x.status === 'draft' ? ['下書き', 'wip'] : new Date(x.publishAt) > new Date() ? ['公開予約', ''] : ['公開中', 'ok2']

export function AdminNewsList() {
  const nav = useNavigate()
  const { data, error, reload } = useLoad(() => backend.data.listAdminNews())
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!data) return <Loading />
  return (
    <>
      <div className="pad2" style={{ marginBottom: 0 }}><button className="btn-p" onClick={() => nav('/admin/news/new')}>新規作成</button></div>
      <div className="lst">
        {data.length === 0 ? <Empty title="生徒向けのお知らせはありません">「新規作成」から追加できます。</Empty> : data.map((x) => {
          const [t, c] = state(x)
          return (
            <button key={x.id} className="nrow" onClick={() => nav(`/admin/news/${x.id}`)}>
              <span className={`tg ${c}`}>{t}</span>
              <span className="nm"><span className="meta">{x.important ? '重要・' : ''}{fmt(x.publishAt)}</span><b>{x.title}</b></span><Icon n="chev" size={14} sw={2} />
            </button>
          )
        })}
      </div>
      <p className="hint">配信対象は生徒です。保護者には配信されません。</p>
    </>
  )
}

export function AdminNewsEdit() {
  const { id = 'new' } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const toast = useToast()
  const { data, error, reload } = useLoad(() => (isNew ? Promise.resolve({ x: null as AdminNews | null }) : backend.data.listAdminNews().then((l) => ({ x: l.find((n) => n.id === id) ?? null }))), [id])
  const [f, setF] = useState<{ title: string; body: string; important: boolean; at: string } | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [arm, setArm] = useState(false)
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!data) return <Loading />
  const cur = data.x
  if (!isNew && !cur) return <Empty title="お知らせが見つかりません" action={<p><button className="btn-l" onClick={() => nav('/admin/news')}>一覧に戻る</button></p>}>削除されたか、管理の対象外のお知らせです。</Empty>
  const v = f ?? { title: cur?.title ?? '', body: cur?.body ?? '', important: cur?.important ?? false, at: cur && cur.status !== 'draft' ? toLocalInput(cur.publishAt) : '' }
  const set = (p: Partial<typeof v>) => setF({ ...v, ...p })

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setErr(''); setBusy(true)
    try { await fn(); toast(ok); nav('/admin/news') } catch (e) { const m = toAppError(e).message; setErr(m); toast(m); setArm(false) } finally { setBusy(false) }
  }
  const save = (status: 'draft' | 'published') => run(() => backend.data.saveNews({ id: isNew ? undefined : id, title: v.title, body: v.body, important: v.important, status, publishAt: v.at ? new Date(v.at).toISOString() : undefined }), status === 'draft' ? '下書きを保存しました' : '公開しました')
  return (
    <>
      <div className="form">
        <label className="fr"><span>タイトル</span><input maxLength={60} value={v.title} onChange={(e) => set({ title: e.target.value })} /></label>
        <label className="fr" style={{ alignItems: 'flex-start' }}><span style={{ paddingTop: 8 }}>本文</span><textarea maxLength={2000} rows={6} value={v.body} onChange={(e) => set({ body: e.target.value })} /></label>
        <label className="fr"><span>公開日時</span><input type="datetime-local" value={v.at} onChange={(e) => set({ at: e.target.value })} /></label>
        <div className="fr"><span>配信対象</span><input value="生徒のみ" disabled /></div>
        <label className="fr"><span>重要</span><input type="checkbox" style={{ flex: 'none', width: 20, height: 20 }} checked={v.important} onChange={(e) => set({ important: e.target.checked })} /><span style={{ width: 'auto' }}>重要なお知らせにする</span></label>
      </div>
      <p className="hint">公開日時を空にすると、公開したときすぐに配信されます。保護者には配信されません。</p>
      <p className="hint" role="alert" style={{ color: 'var(--red)' }}>{err}</p>
      <div className="pad2"><button className="btn-p" disabled={busy} onClick={() => void save('published')}>公開</button></div>
      <div className="pad2" style={{ marginTop: -6 }}><button className="btn-g" disabled={busy} onClick={() => void save('draft')}>下書き保存</button></div>
      {!isNew && (
        <div className="pad2" style={{ marginTop: -6, display: 'flex', gap: 8 }}>
          {cur?.status !== 'draft' && <button className="btn-g" disabled={busy} onClick={() => void save('draft')}>公開停止</button>}
          <button className="btn-g dng" disabled={busy} onClick={() => (arm ? void run(() => backend.data.deleteNews(id), '削除しました') : (setArm(true), window.setTimeout(() => setArm(false), 4000)))}>{arm ? '本当に削除する' : '削除'}</button>
        </div>
      )}
    </>
  )
}
