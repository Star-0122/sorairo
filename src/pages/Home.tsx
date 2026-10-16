import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useData } from '../components/DataContext'
import { Avatar, Empty, Loading, ServiceIcon } from '../components/ui'
import { ago } from '../lib/format'
import { useToast } from '../components/Toast'

export default function Home() {
  const { me, mode } = useAuth()
  const { news, services, error, reload } = useData()
  const nav = useNavigate()
  const toast = useToast()
  if (!me) return null

  return (
    <>
      <section className="wl" aria-label="ウェルカム">
        <Avatar />
        <div><b>こんにちは、{me.name || 'ユーザー'}さん</b><span>{mode === 'staff' ? '社員モード' : '今日もがんばりましょう！'}</span></div>
      </section>

      {mode === 'pending' ? (
        <div className="sec" style={{ marginTop: -46, position: 'relative' }}>
          <Empty title="この画面は準備中です">お使いのロールの画面は、まだ提供していません。</Empty>
        </div>
      ) : (
        <>
          {/* 出欠・予定のデータ元が未定のため、連携済みのように見せない */}
          <section className="att" aria-label="今日の出欠">
            <div className="ic"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4zM8 10h8M8 14h5" /></svg></span></div>
            <div className="tx"><div className="l">{mode === 'staff' ? '本日の勤怠' : '今日の出欠'}</div><div className="st" style={{ color: 'var(--sub)' }}>未連携</div><div className="tm">この情報はまだ連携されていません</div></div>
          </section>
          <section className="sec" aria-label="今日の予定">
            <div className="sh"><h2>今日の予定</h2></div>
            <p className="sub" style={{ margin: 0 }}>予定のデータは、まだ連携されていません。</p>
          </section>
        </>
      )}

      <section className="plain" aria-label="よく使うサービス">
        <h2>よく使うサービス</h2>
        {services === null && !error ? <Loading /> : (
          <div className="svs">
            {(services ?? []).slice(0, 4).map((s) => (
              <button key={s.id} className="sv" onClick={() => (s.route ? nav(s.route) : toast(`「${s.name}」は準備中です。`))}>
                <ServiceIcon id={s.id} />{s.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="plain" aria-label="最近のお知らせ">
        <h2>最近のお知らせ</h2>
        {error ? (
          <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
        ) : news === null ? <Loading /> : news.length === 0 ? (
          <Empty title="お知らせはありません">新しいお知らせが届くとここに表示されます。</Empty>
        ) : news.slice(0, 2).map((x) => (
          <button key={x.id} className="nw" style={{ marginBottom: 8 }} onClick={() => nav(`/news/${x.id}`)}>
            <span className="m"><b>{x.title}</b><span>{ago(x.publishAt)}</span></span>{!x.read && <i aria-label="未読" />}
          </button>
        ))}
      </section>
    </>
  )
}
