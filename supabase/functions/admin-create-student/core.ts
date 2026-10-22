// 生徒アカウント発行の判断部分（テストできるよう、Deno に依存しない形で分離）

export interface Input { email: string; name: string; org: string }
export type Validated = { ok: true; value: Input } | { ok: false; message: string }

export function validateInput(raw: unknown): Validated {
  if (typeof raw !== 'object' || raw === null) return { ok: false, message: '入力内容が正しくありません。' }
  const r = raw as Record<string, unknown>
  const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const org = typeof r.org === 'string' ? r.org.trim() : ''
  if (!email) return { ok: false, message: 'メールアドレスを入力してください。' }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'メールアドレスの形式が正しくありません。' }
  if (!name) return { ok: false, message: '氏名を入力してください。' }
  if (name.length > 30) return { ok: false, message: '氏名は30文字以内で入力してください。' }
  if (org.length > 40) return { ok: false, message: '所属は40文字以内で入力してください。' }
  return { ok: true, value: { email, name, org } }
}

// 読み間違えやすい文字（0/O, 1/l/I）を除いた12文字。暗号論的な乱数で、偏りが出ないよう選ぶ
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
export function generatePassword(length = 12): string {
  const limit = 256 - (256 % ALPHABET.length)
  let out = ''
  while (out.length < length) {
    const buf = new Uint8Array(length * 2)
    crypto.getRandomValues(buf)
    for (const b of buf) { if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length] }
  }
  return out
}

// Supabase クライアントのうち、使う部分だけの型（テストで差し替えるため）
// deno-lint-ignore no-explicit-any
export type AdminClient = any
export interface Result { status: number; body: Record<string, unknown> }

export async function createStudent(admin: AdminClient, callerJwt: string, input: Input, password: string): Promise<Result> {
  // 1) 呼び出した人の確認
  const { data: u, error: ue } = await admin.auth.getUser(callerJwt)
  if (ue || !u?.user) return { status: 401, body: { message: 'ログインの有効期限が切れました。もう一度ログインしてください。' } }
  const callerId: string = u.user.id

  // 2) 管理者であることを、サーバー側で確認（画面の表示には頼らない）
  const { data: adminRole, error: re } = await admin.from('user_roles').select('role_id').eq('user_id', callerId).eq('role_id', 'admin').maybeSingle()
  if (re) return { status: 500, body: { message: '権限を確認できませんでした。時間をおいてお試しください。' } }
  if (!adminRole) return { status: 403, body: { message: 'この操作は管理者のみ行えます。' } }
  const { data: prof } = await admin.from('profiles').select('status').eq('id', callerId).maybeSingle()
  if (!prof || prof.status !== 'active') return { status: 403, body: { message: 'この操作は管理者のみ行えます。' } }

  // 3) アカウント作成
  const { data: created, error: ce } = await admin.auth.admin.createUser({
    email: input.email, password, email_confirm: true, user_metadata: { display_name: input.name },
  })
  if (ce || !created?.user) {
    const m = String(ce?.message ?? '')
    if (/already|registered|exists/i.test(m) || ce?.status === 422) return { status: 409, body: { message: 'このメールアドレスは、すでに登録されています。' } }
    return { status: 500, body: { message: 'アカウントを作成できませんでした。時間をおいてお試しください。' } }
  }
  const newId: string = created.user.id

  // 4) 所属・ロール(生徒に固定)・操作記録。途中で失敗したら、作成したアカウントを取り消す
  const rollback = async () => { try { await admin.auth.admin.deleteUser(newId) } catch { /* 取り消しに失敗しても、呼び出し元には作成失敗として返す */ } }
  const p = await admin.from('profiles').update({ display_name: input.name, org: input.org }).eq('id', newId)
  if (p.error) { await rollback(); return { status: 500, body: { message: 'アカウント情報を保存できませんでした。もう一度お試しください。' } } }
  const r = await admin.from('user_roles').insert({ user_id: newId, role_id: 'student' })
  if (r.error) { await rollback(); return { status: 500, body: { message: 'ロールを設定できませんでした。もう一度お試しください。' } } }
  await admin.from('audit_logs').insert({ actor_id: callerId, action: `生徒アカウントを作成: ${input.name}` })

  return { status: 200, body: { id: newId, email: input.email, password } }
}
