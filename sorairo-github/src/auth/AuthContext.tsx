import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { backend } from '../repo'
import type { Me } from '../repo/types'
import { AppError } from '../repo/types'
import { toAppError } from '../lib/errors'

type Status = 'loading' | 'out' | 'in' | 'recovery'
export type Mode = 'student' | 'staff' | 'pending'
interface Ctx {
  status: Status
  me: Me | null
  mode: Mode
  isAdmin: boolean
  notice: string
  loadError: string
  login(idOrEmail: string, password: string, keep: boolean): Promise<void>
  logout(): Promise<void>
  finishRecovery(): Promise<void>
  reload(): Promise<void>
}
const C = createContext<Ctx | null>(null)
export const useAuth = () => { const c = useContext(C); if (!c) throw new Error('AuthProvider が必要です'); return c }

const KEEP = 'sorairo.keep', TAB = 'sorairo.tab'
// Supabase がURLを書き換える前に、パスワード再設定リンクから来たかを控える
const cameFromRecovery = typeof location !== 'undefined' && /type=recovery/.test(location.hash + location.search)

function deriveMode(me: Me | null): Mode {
  if (!me) return 'pending'
  if (me.roles.includes('staff') || me.roles.includes('admin')) return 'staff'
  if (me.roles.includes('student')) return 'student'
  return 'pending' // 保護者・講師などは、画面が未実装
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState('')
  const recovery = useRef(cameFromRecovery)

  const load = useCallback(async () => {
    try {
      const m = await backend.data.getMe()
      if (!m) { setMe(null); setStatus('out'); return }
      if (m.status === 'suspended') {
        await backend.auth.signOut().catch(() => {})
        setMe(null); setStatus('out'); setNotice('このアカウントは現在ご利用いただけません。管理者に連絡してください。'); return
      }
      setMe(m); setLoadError(''); setStatus(recovery.current ? 'recovery' : 'in')
    } catch (e) {
      setLoadError(toAppError(e).message); setStatus('in')
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      // 「ログイン状態を維持しない」を選んだ場合は、ブラウザを閉じたあとの再訪でログアウトする
      if (localStorage.getItem(KEEP) === '0' && !sessionStorage.getItem(TAB)) { await backend.auth.signOut().catch(() => {}) }
      sessionStorage.setItem(TAB, '1')
      try {
        if (!(await backend.auth.hasSession())) { if (alive) setStatus('out'); return }
      } catch (e) { if (alive) { setLoadError(toAppError(e).message); setStatus('out') }; return }
      if (alive) await load()
    })()
    const off = backend.auth.onChange(async (ev) => {
      if (ev === 'recovery') { recovery.current = true; setStatus('recovery') }
      else if (ev === 'signed_out') { setMe(null); setStatus('out') }
      else if (ev === 'signed_in' && !recovery.current) await load()
    })
    return () => { alive = false; off() }
  }, [load])

  const login: Ctx['login'] = async (idOrEmail, password, keep) => {
    const v = idOrEmail.trim()
    if (!v || !password) throw new AppError('メールアドレスとパスワードを入力してください。')
    if (!v.includes('@')) throw new AppError('ユーザーIDでのログインは準備中です。メールアドレスを入力してください。')
    setNotice('')
    localStorage.setItem(KEEP, keep ? '1' : '0')
    await backend.auth.signIn(v, password)
    await load()
  }
  const logout = async () => { await backend.auth.signOut(); setMe(null); setStatus('out') }
  const finishRecovery = async () => { recovery.current = false; await backend.auth.signOut().catch(() => {}); setMe(null); setStatus('out') }

  const value = useMemo<Ctx>(() => ({
    status, me, mode: deriveMode(me), isAdmin: Boolean(me?.roles.includes('admin')), notice, loadError,
    login, logout, finishRecovery, reload: load,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [status, me, notice, loadError, load])
  return <C.Provider value={value}>{children}</C.Provider>
}
