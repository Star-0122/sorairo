import { createClient } from '@supabase/supabase-js'

// 公開してよい値（URL と公開用キー）。環境変数があればそちらを優先する。
// 隠しファイル(.env.production)がアップロードされなかった場合でも動くよう、既定値を持つ。
// ※ service_role / sb_secret_ で始まる秘密鍵は、絶対にここへ書かないこと
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://clyuelsvrqhxrilshnpm.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable_lNLCDuVg2neI0xWlApAZzQ_mYm19ol9'

// 設定が無い場合は、接続済みのふりをせず、起動時にその旨を表示する（App.tsx）
export const supabaseConfigured = Boolean(url && key)
export const supabase = supabaseConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
