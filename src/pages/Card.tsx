import { useState } from 'react'
import { backend } from '../repo'
import { useAuth } from '../auth/AuthContext'
import { useLoad } from '../components/useLoad'
import { Avatar, Cloud, Empty, Loading } from '../components/ui'
import QrCode from '../components/QrCode'

export default function Card() {
  const { me } = useAuth()
  const { data: e, error, reload } = useLoad(() => backend.data.getEmployee().then((x) => ({ x })))
  const [qr, setQr] = useState(false)
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!e) return <Loading />
  if (!e.x) return <Empty title="社員情報が登録されていません">社員番号などが未登録です。管理者に連絡してください。</Empty>
  const emp = e.x
  return (
    <>
      <div className="idc">
        <div className="lg2"><Cloud w={26} h={20} />そらのほしグループ</div>
        <Avatar big /><b>{me?.name}</b>
        <dl>
          <div><dt>社員番号</dt><dd>{emp.no}</dd></div>
          <div><dt>所属</dt><dd>{emp.dept || '—'}</dd></div>
          <div><dt>役職</dt><dd>{emp.title || '—'}</dd></div>
        </dl>
        <span className={`tg ${emp.status === 'active' ? 'ok2' : 'wip'}`}>{emp.status === 'active' ? '有効' : '無効'}</span>
      </div>
      <div className="pad2"><button className="btn-p" aria-expanded={qr} onClick={() => setQr(!qr)}>{qr ? 'QRコードを隠す' : 'QRコードを表示'}</button></div>
      {qr && <div className="qrp"><QrCode text={`sorairo:employee:${emp.no}`} /><p className="hint" style={{ textAlign: 'center' }}>社員番号を含むQRコードです。読み取り・照合の仕組みは未実装のため、現時点では入館や打刻には使えません。</p></div>}
    </>
  )
}
