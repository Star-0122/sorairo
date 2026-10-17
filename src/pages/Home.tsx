import { useNavigate } from 'react-router-dom'
import { backend } from '../repo'
import { useLoad } from '../components/useLoad'
import { hm } from '../lib/time'
import { useAuth } from '../auth/AuthContext'
import { useData } from '../components/DataContext'
import { Avatar, Empty, Loading, ServiceIcon } from '../components/ui'
import { ago } from '../lib/format'
import { useToast } from '../components/Toast'

function StaffToday() {
  const nav = useNavigate()
  const { data: emp } = useLoad(() => backend.data.getEmployee().then((x) => ({ x })))
  const { data: att, error } = useLoad(() => backend.data.getAttendance().then((a) => ({ a })))
  const a = att?.a
  return (
    <>
      <button className="att emp" onClick={() => nav('/card')} aria-label="社員証を表示">
        <span className="av"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#7fc4c0" /><circle cx="16" cy="13" r="6" fill="#f0c9a8" /><path d="M9 12a7 7 0 0 1 14 0c-3-2-11-2-14 0z" fill="#2b2b3a" /><path d="M5 32a11 11 0 0 1 22 0z" fill="#2b3a55" /></svg></span>
        <span className="tx">
          {emp === null ? <span className="tm">読み込み中…</span> : emp.x ? (<><span className="l">社員証</span><span className="tm">社員番号 {emp.x.no}</span><span className="tm">所属 {emp.x.dept || '—'}　役職 {emp.x.title || '—'}</span></>) : (<><span className="l">社員証</span><span className="tm">社員情報が未登録です</span></>)}
        </span>
        {emp?.x && <span className={`tg ${emp.x.status === 'active' ? 'ok2' : 'wip'}`}>{emp.x.status === 'active' ? '有効' : '無効'}</span>}
      </button>
      <section className="sec" aria-label="本日の勤怠">
        <div className="sh"><h2>本日の勤怠</h2><a href="#" onClick={(e) => { e.preventDefault(); nav('/attendance') }}>勤怠へ</a></div>
        {error ? <p className="sub" style={{ margin: 0 }}>{error}</p> : att === null ? <p className="sub" style={{ margin: 0 }}>読み込み中…</p> : (
          <div className="row3"><span className={`stp${a && !a.clockOut ? ' on' : ''}`}>{a ? (a.clockOut ? '退勤済み' : '出勤中') : '未出勤'}</span><span className="tm">{a ? `${hm(a.clockIn)} 〜 ${a.clockOut ? hm(a.clockOut) : ''}` : 'まだ出勤していません'}</span></div>
        )}
      </section>
    </>
  )
}

export default function Home() {
  const { me, mode, isAdmin } = useAuth()
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
        mode === 'staff' ? <StaffToday /> : <>
          {/* 出欠・予定のデータ元が未定のため、連携済みのように見せない */}
          <section className="att" aria-label="今日の出欠">
            <div className="ic"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4zM8 10h8M8 14h5" /></svg></span></div>
            <div className="tx"><div className="l">今日の出欠</div><div className="st" style={{ color: 'var(--sub)' }}>未連携</div><div className="tm">この情報はまだ連携されていません</div></div>
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

      {isAdmin && (
        <section className="plain" aria-label="生徒の管理">
          <h2>生徒の管理</h2>
          <div className="svs" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {([['生徒管理', '/admin/students', '#e6f6ec', '#22a45d', 'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0'], ['お知らせ管理', '/admin/news', '#fbe3ee', '#e0508a', 'M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4'], ['ダッシュボード', '/admin', '#dfe9fb', '#4a6fe0', 'M4 20V10M10 20V4M16 20v-8M22 20H2']] as const).map(([t, to, bg, fg, d]) => (
              <button key={to} className="sv" onClick={() => nav(to)}>
                <span className="b" style={{ background: bg }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>{t}
              </button>
            ))}
          </div>
        </section>
      )}

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
