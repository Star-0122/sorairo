import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from '../repo'
import type { News, Service } from '../repo/types'
import { toAppError } from '../lib/errors'
import { useAuth } from '../auth/AuthContext'

interface Ctx {
  news: News[] | null
  services: Service[] | null
  error: string
  unread: number
  reload(): Promise<void>
  markRead(id: string): Promise<void>
}
const D = createContext<Ctx | null>(null)
export const useData = () => { const c = useContext(D); if (!c) throw new Error('DataProvider が必要です'); return c }

export function DataProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth()
  const [news, setNews] = useState<News[] | null>(null)
  const [services, setServices] = useState<Service[] | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setError('')
    try {
      const [n, s] = await Promise.all([backend.data.listNews(), backend.data.listServices()])
      setNews(n); setServices(s)
    } catch (e) { setError(toAppError(e).message) }
  }, [])
  useEffect(() => { setNews(null); setServices(null); if (me) void reload() }, [me?.id, reload]) // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (id: string) => {
    await backend.data.markRead(id)
    setNews((l) => l && l.map((x) => (x.id === id ? { ...x, read: true } : x)))
  }, [])
  const value = useMemo<Ctx>(() => ({ news, services, error, unread: news ? news.filter((x) => !x.read).length : 0, reload, markRead }), [news, services, error, reload, markRead])
  return <D.Provider value={value}>{children}</D.Provider>
}
