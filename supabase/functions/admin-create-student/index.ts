import { createClient } from 'npm:@supabase/supabase-js@2'
import { createStudent, generatePassword, validateInput } from './core.ts'

// service_role キーは、この関数の実行環境（サーバー内）にだけ存在する。ブラウザには渡らない
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://star-0122.github.io').split(',').map((s) => s.trim())

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' }
  if (origin && ALLOWED.includes(origin)) h['Access-Control-Allow-Origin'] = origin
  return h
}
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ message: '許可されていない操作です。' }, 405, origin)

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return json({ message: 'ログインが必要です。' }, 401, origin)

  let body: unknown
  try { body = await req.json() } catch { return json({ message: '入力内容が正しくありません。' }, 400, origin) }
  const v = validateInput(body)
  if (!v.ok) return json({ message: v.message }, 400, origin)

  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ message: 'サーバーの設定が不足しています。管理者に連絡してください。' }, 500, origin)
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const r = await createStudent(admin, jwt, v.value, generatePassword())
    return json(r.body, r.status, origin)
  } catch (_e) {
    return json({ message: '処理に失敗しました。時間をおいてもう一度お試しください。' }, 500, origin)
  }
})
