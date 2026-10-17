import { useState } from 'react'
import { backend } from '../repo'
import { useLoad } from '../components/useLoad'
import { Empty, Loading } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'
import { dur, hm, jstLabel, minutes, nowHm, toIso } from '../lib/time'

export default function Attendance() {
  const { data, error, reload } = useLoad(() => backend.data.getAttendance().then((a) => ({ a })))
  const toast = useToast()
  const [bs, setBs] = useState('')
  const [be, setBe] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!data) return <Loading />
  const a = data.a
  const working = Boolean(a && !a.clockOut)

  const act = async (fn: () => Promise<void>, ok: string) => {
    setErr(''); setBusy(true)
    try { await fn(); toast(ok); await reload() } catch (e) { const m = toAppError(e).message; setErr(m); toast(m); await reload() } finally { setBusy(false) }
  }
  const total = a ? Math.max(0, minutes(a.clockIn, a.clockOut ?? new Date().toISOString()) - (a.breakStart && a.breakEnd ? minutes(a.breakStart, a.breakEnd) : 0)) : 0
  const saveBreak = () => {
    if (!bs || !be) { setErr('休憩の開始と終了の時刻を入力してください。'); return }
    if (be <= bs) { setErr('休憩の終了は、開始より後の時刻にしてください。'); return }
    void act(() => backend.data.setBreak(toIso(bs), toIso(be)), '休憩を記録しました')
  }
  return (
    <>
      <div className="card2">
        <div className="sub">{jstLabel()}</div>
        <div style={{ margin: '6px 0' }}><span className={`stp${working ? ' on' : ''}`}>{a ? (a.clockOut ? '退勤済み' : '出勤中') : '未出勤'}</span></div>
        <div className="big">{a ? `${hm(a.clockIn)} 〜 ${a.clockOut ? hm(a.clockOut) : '—'}` : '—'}</div>
      </div>
      <div className="pad2">
        {!a && <button className="btn-p" disabled={busy} onClick={() => void act(() => backend.data.clockIn(), '出勤を記録しました')}>出勤する</button>}
        {working && <button className="btn-p" disabled={busy} onClick={() => void act(() => backend.data.clockOut(), '退勤を記録しました')}>退勤する</button>}
        {a?.clockOut && <button className="btn-p" disabled>退勤済み</button>}
      </div>
      <div className="menu">
        <div className="mrow"><span className="ml">勤務時間</span><span className="v">{a ? `${hm(a.clockIn)} 〜 ${a.clockOut ? hm(a.clockOut) : '勤務中'}` : '—'}</span></div>
        <div className="mrow"><span className="ml">休憩時間</span>
          {working ? (
            <span className="brk">
              <input type="time" aria-label="休憩の開始" value={bs || (a?.breakStart ? hm(a.breakStart) : '')} onChange={(e) => setBs(e.target.value)} /> 〜
              <input type="time" aria-label="休憩の終了" value={be || (a?.breakEnd ? hm(a.breakEnd) : '')} max={nowHm()} onChange={(e) => setBe(e.target.value)} />
              <button className="btn-l" disabled={busy} onClick={saveBreak}>記録</button>
            </span>
          ) : <span className="v">{a?.breakStart && a.breakEnd ? `${hm(a.breakStart)} 〜 ${hm(a.breakEnd)}` : '—'}</span>}
        </div>
        <div className="mrow"><span className="ml">合計勤務時間</span><span className="v">{a ? dur(total) : '—'}</span></div>
      </div>
      <p className="hint" role="alert" style={{ color: 'var(--red)' }}>{err}</p>
      <p className="hint">{a?.clockOut ? '退勤後の記録は変更できません。修正が必要な場合は管理者に依頼してください。' : '出勤・退勤の時刻は、サーバーの時刻（日本時間）で記録されます。休憩は時刻を入力して記録します。合計は表示した時点の値です。'}</p>
      <p className="hint">過去の日付の記録の確認は、まだ実装していません。</p>
    </>
  )
}
