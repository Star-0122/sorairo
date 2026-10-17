import { useNavigate } from 'react-router-dom'
import { backend } from '../repo'
import { useLoad } from '../components/useLoad'
import { Empty, Icon, Loading } from '../components/ui'
import { fmt } from '../lib/format'

export default function AdminDash() {
  const nav = useNavigate()
  const { data: d, error, reload } = useLoad(() => backend.data.getDash())
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!d) return <Loading />
  return (
    <>
      <div className="stats"><div><span>生徒数</span><b>{d.students}</b></div><div><span>有効</span><b>{d.active}</b></div><div><span>下書き</span><b>{d.drafts}</b></div></div>
      <div className="menu">
        <button className="mrow" onClick={() => nav('/admin/students')}><span className="ml">生徒管理</span><Icon n="chev" size={14} sw={2} /></button>
        <button className="mrow" onClick={() => nav('/admin/news')}><span className="ml">お知らせ管理（生徒向け）</span><Icon n="chev" size={14} sw={2} /></button>
      </div>
      <h2 className="h2p">重要なお知らせ</h2>
      <div className="menu">{d.important.length ? d.important.map((x) => <button key={x.id} className="mrow" onClick={() => nav(`/admin/news/${x.id}`)}><span className="ml">{x.title}<span className="d">{fmt(x.publishAt)}</span></span><Icon n="chev" size={14} sw={2} /></button>) : <div className="mrow"><span className="d">該当するお知らせはありません</span></div>}</div>
      <h2 className="h2p">最近のアクティビティ</h2>
      <div className="menu">{d.log.length ? d.log.map((x) => <div key={x.id} className="mrow"><span className="ml">{x.text}<span className="d">{fmt(x.at)}</span></span></div>) : <div className="mrow"><span className="d">まだ操作の記録はありません</span></div>}</div>
      <p className="hint">管理の対象は生徒です。保護者のアカウントとお知らせは、ここでは管理できません。</p>
    </>
  )
}
