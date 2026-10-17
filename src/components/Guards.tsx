import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Empty } from './ui'

function Denied({ who }: { who: string }) {
  const nav = useNavigate()
  return <Empty title="このページを表示する権限がありません" action={<p><button className="btn-l" onClick={() => nav('/')}>ホームに戻る</button></p>}>{who}のみ利用できます。</Empty>
}
// 画面を隠すだけでなく、データ側でも拒否される（RLS）。これはその上の、利用者向けの案内
export const RequireStaff = ({ children }: { children: ReactNode }) => { const { mode } = useAuth(); return mode === 'staff' ? <>{children}</> : <Denied who="社員・管理者" /> }
export const RequireAdmin = ({ children }: { children: ReactNode }) => { const { isAdmin } = useAuth(); return isAdmin ? <>{children}</> : <Denied who="管理者" /> }
