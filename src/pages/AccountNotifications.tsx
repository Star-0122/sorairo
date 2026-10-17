import { backend } from '../repo'
import type { Prefs } from '../repo/types'
import { useLoad } from '../components/useLoad'
import { Empty, Loading } from '../components/ui'
import { useToast } from '../components/Toast'
import { toAppError } from '../lib/errors'

export default function AccountNotifications() {
  const { data, error, reload, setData } = useLoad(() => backend.data.getPrefs())
  const toast = useToast()
  if (error) return <Empty title="読み込めませんでした" action={<p><button className="btn-l" onClick={() => void reload()}>もう一度読み込む</button></p>}>{error}</Empty>
  if (!data) return <Loading />
  const flip = async (k: keyof Prefs) => {
    const v = !data[k]
    try { await backend.data.setPref(k, v); setData({ ...data, [k]: v }); toast('保存しました') } catch (e) { toast(toAppError(e).message) }
  }
  const row = (k: keyof Prefs, t: string, d: string) => (
    <div className="mrow"><span className="ml">{t}<span className="d">{d}</span></span><button className="sw" role="switch" aria-checked={data[k]} aria-label={t} onClick={() => void flip(k)} /></div>
  )
  return (
    <>
      <div className="menu">{row('notifyNews', '新しいお知らせ', 'お知らせが届いたときに通知を受け取る')}{row('notifyImportant', '重要なお知らせ', '重要なお知らせを優先して通知する')}</div>
      <p className="hint">通知の配信はまだ行われません。設定だけが保存されます。</p>
    </>
  )
}
