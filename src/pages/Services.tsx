import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../components/DataContext'
import { Empty, Icon, Loading, ServiceIcon } from '../components/ui'
import { useToast } from '../components/Toast'

export default function Services() {
  const { services, error, reload } = useData()
  const nav = useNavigate()
  const toast = useToast()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const cats = useMemo(() => ['all', ...Array.from(new Set((services ?? []).map((s) => s.category)))], [services])
  const list = (services ?? []).filter((s) => (cat === 'all' || s.category === cat) && (!q.trim() || (s.name + s.description).toLowerCase().includes(q.trim().toLowerCase())))

  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (services === null) return <Loading />
  return (
    <>
      <div className="search"><Icon n="search" size={16} sw={2} /><input type="search" placeholder="サービスを検索" aria-label="サービスを検索" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">{cats.map((c) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c === 'all' ? 'すべて' : c}</button>)}</div>
      <div className="lst">
        {list.length === 0 ? <Empty title="該当するサービスがありません">検索ワードやカテゴリを変えてみてください。</Empty> : list.map((s) => (
          <button key={s.id} className="sli" onClick={() => (s.route ? nav(s.route) : toast(`「${s.name}」は準備中です。`))}>
            <ServiceIcon id={s.id} />
            <span className="m"><b>{s.name}</b><span className="d">{s.description}</span></span>
            {s.route ? <Icon n="chev" size={14} sw={2} /> : <span className="tg wip">準備中</span>}
          </button>
        ))}
      </div>
    </>
  )
}
