import type { Backend } from './types'
import { supabaseBackend } from './supabase'

// 本番は常に Supabase。模擬バックエンドは `--mode mock`（動作確認用ビルド）のときだけ読み込まれ、本番の成果物には含まれない
export const backend: Backend =
  import.meta.env.MODE === 'mock' ? (await import('./mock')).mockBackend : supabaseBackend
