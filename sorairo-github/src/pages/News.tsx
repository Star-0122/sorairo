import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../components/DataContext'
import { Empty, Icon, Loading } from '../components/ui'
import { fmt } from '../lib/format'
import { toAppError } from '../lib/errors'
import { useToast } from '../components/Toast'

export function NewsList() {
  const { news, error, reload } = useData()
  const nav = useNavigate()
  const [f, setF] = useState<'all' | 'unread' | 'imp'>('all')
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (news === null) return <Loading />
  const l = f === 'unread' ? news.filter((x) => !x.read) : f === 'imp' ? news.filter((x) => x.important) : news
  return (
    <>
      <div className="chips">{([['all', 'すべて'], ['unread', '未読'], ['imp', '重要']] as const).map(([k, t]) => <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{t}</button>)}</div>
      <div className="lst">
        {l.length === 0 ? <Empty title={f === 'unread' ? '未読のお知らせはありません' : f === 'imp' ? '重要なお知らせはありません' : 'お知らせはありません'}>新しいお知らせが届くとここに表示されます。</Empty> : l.map((x) => (
          <button key={x.id} className={`nrow${x.read ? ' rd' : ''}`} onClick={() => nav(`/news/${x.id}`)}>
            <span className={`tg${x.important ? ' imp' : ''}`}>{x.tag}</span>
            <span className="nm"><span className="meta">{fmt(x.publishAt)}</span><b>{x.title}</b></span>
            {!x.read && <i className="ud" aria-label="未読" />}<Icon n="chev" size={14} sw={2} />
          </button>
        ))}
      </div>
    </>
  )
}

export function NewsDetail() {
  const { id } = useParams()
  const { news, error, markRead } = useData()
  const toast = useToast()
  const item = news?.find((x) => x.id === id)
  useEffect(() => {
    if (item && !item.read) markRead(item.id).catch((e) => toast(toAppError(e).message))
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <Empty title="読み込めませんでした">{error}</Empty>
  if (news === null) return <Loading />
  if (!item) return <Empty title="お知らせが見つかりません">公開が終了したか、閲覧できないお知らせです。</Empty>
  return (
    <article className="dt">
      <span className={`tg${item.important ? ' imp' : ''}`}>{item.tag}</span><span className="meta">{fmt(item.publishAt)}</span>
      <h2>{item.title}</h2><p>{item.body}</p>
    </article>
  )
}
