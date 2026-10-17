import { useCallback, useEffect, useState } from 'react'
import { toAppError } from '../lib/errors'

// 読み込み中・エラー・再読み込みを1か所で扱う
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const run = useCallback(async () => {
    setError('')
    try { setData(await fn()) } catch (e) { setError(toAppError(e).message) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { setData(null); void run() }, [run])
  return { data, error, reload: run, setData }
}
