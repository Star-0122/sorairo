import type { Backend, DataApi, AuthApi, Me, News, RoleId, Service } from './types'
import { AppError } from './types'
import { toAppError } from '../lib/errors'
import { supabase } from '../lib/supabaseClient'

function client() {
  if (!supabase) throw new AppError('接続設定がありません。管理者に連絡してください。')
  return supabase
}
async function userId(): Promise<string> {
  const { data, error } = await client().auth.getUser()
  if (error || !data.user) throw new AppError('ログインの有効期限が切れました。もう一度ログインしてください。')
  return data.user.id
}

const auth: AuthApi = {
  async hasSession() {
    const { data } = await client().auth.getSession()
    return Boolean(data.session)
  },
  async signIn(email, password) {
    const { error } = await client().auth.signInWithPassword({ email, password })
    if (error) throw toAppError(error)
  },
  async signOut() {
    const { error } = await client().auth.signOut()
    if (error) throw toAppError(error)
  },
  async requestReset(email) {
    // 登録の有無は応答に出ない（アカウント探索の防止）。リンク先は /reset
    const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${import.meta.env.BASE_URL}reset` })
    if (error) throw toAppError(error)
  },
  async setNewPassword(password) {
    const { error } = await client().auth.updateUser({ password })
    if (error) throw toAppError(error)
  },
  onChange(cb) {
    const { data } = client().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') cb('recovery')
      else if (event === 'SIGNED_OUT') cb('signed_out')
      else if (event === 'SIGNED_IN') cb('signed_in')
    })
    return () => data.subscription.unsubscribe()
  },
}

const data: DataApi = {
  async getMe(): Promise<Me | null> {
    const { data: u } = await client().auth.getUser()
    if (!u.user) return null
    const id = u.user.id
    const [p, r] = await Promise.all([
      client().from('profiles').select('display_name, org, status').eq('id', id).maybeSingle(),
      client().from('user_roles').select('role_id').eq('user_id', id),
    ])
    if (p.error) throw toAppError(p.error)
    if (r.error) throw toAppError(r.error)
    if (!p.data) throw new AppError('アカウント情報が見つかりません。管理者に連絡してください。')
    return {
      id, email: u.user.email ?? '', name: p.data.display_name, org: p.data.org,
      status: p.data.status as Me['status'], roles: (r.data ?? []).map((x) => x.role_id as RoleId),
    }
  },
  async updateDisplayName(name) {
    const n = name.trim()
    if (!n) throw new AppError('氏名を入力してください。')
    if (n.length > 30) throw new AppError('氏名は30文字以内で入力してください。')
    const { error } = await client().from('profiles').update({ display_name: n }).eq('id', await userId())
    if (error) throw toAppError(error)
  },
  async listServices(): Promise<Service[]> {
    const { data: rows, error } = await client().from('services').select('id,name,description,category,route,sort_order').order('sort_order')
    if (error) throw toAppError(error)
    return (rows ?? []).map((s) => ({ id: s.id, name: s.name, description: s.description, category: s.category, route: s.route, sortOrder: s.sort_order }))
  },
  async listNews(): Promise<News[]> {
    const id = await userId()
    const now = new Date().toISOString()
    const [a, r] = await Promise.all([
      // 権限(RLS)に加え、管理者の下書き・公開予約が一般の一覧に混ざらないよう、ここでも絞る
      client().from('announcements').select('id,title,body,tag,important,publish_at')
        .eq('status', 'published').lte('publish_at', now).order('publish_at', { ascending: false }),
      client().from('announcement_reads').select('announcement_id').eq('user_id', id),
    ])
    if (a.error) throw toAppError(a.error)
    if (r.error) throw toAppError(r.error)
    const read = new Set((r.data ?? []).map((x) => x.announcement_id as string))
    return (a.data ?? []).map((x) => ({ id: x.id, title: x.title, body: x.body, tag: x.tag, important: x.important, publishAt: x.publish_at, read: read.has(x.id) }))
  },
  async markRead(newsId) {
    const { error } = await client().from('announcement_reads')
      .upsert({ announcement_id: newsId, user_id: await userId() }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true })
    if (error) throw toAppError(error)
  },
}

export const supabaseBackend: Backend = { auth, data, kind: 'supabase' }
