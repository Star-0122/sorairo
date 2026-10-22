import type { AdminDash, AdminNews, Attendance, Backend, DataApi, AuthApi, Employee, Me, News, Prefs, RoleId, Service, Student } from './types'
import { jstDate } from '../lib/time'
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
  async changePassword(password) {
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
      status: p.data.status as Me['status'], roles: (r.data ?? []).map((x) => x.role_id as RoleId), lastSignIn: u.user.last_sign_in_at ?? null,
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
  async getEmployee(): Promise<Employee | null> {
    const { data: e, error } = await client().from('employee_profiles').select('employee_no,dept,title,status').eq('user_id', await userId()).maybeSingle()
    if (error) throw toAppError(error)
    return e ? { no: e.employee_no, dept: e.dept, title: e.title, status: e.status as Employee['status'] } : null
  },
  async getAttendance(): Promise<Attendance | null> {
    const { data: r, error } = await client().from('employee_attendance').select('clock_in,clock_out,break_start,break_end')
      .eq('user_id', await userId()).eq('work_date', jstDate()).maybeSingle()
    if (error) throw toAppError(error)
    return r ? { clockIn: r.clock_in, clockOut: r.clock_out, breakStart: r.break_start, breakEnd: r.break_end } : null
  },
  async clockIn() {
    // 時刻と日付はデータベース側がサーバー時刻（日本時間）で決める。端末の時計は使わない
    const { error } = await client().from('employee_attendance').insert({ user_id: await userId() })
    if (error) throw error.code === '23505' ? new AppError('すでに出勤済みです。') : toAppError(error)
  },
  async clockOut() {
    const { data: rows, error } = await client().from('employee_attendance').update({ clock_out: new Date().toISOString() })
      .eq('user_id', await userId()).eq('work_date', jstDate()).is('clock_out', null).select('id')
    if (error) throw toAppError(error)
    if (!rows || rows.length === 0) throw new AppError('出勤の記録がないか、すでに退勤済みです。')
  },
  async setBreak(startIso, endIso) {
    const { data: rows, error } = await client().from('employee_attendance').update({ break_start: startIso, break_end: endIso })
      .eq('user_id', await userId()).eq('work_date', jstDate()).is('clock_out', null).select('id')
    if (error) throw toAppError(error)
    if (!rows || rows.length === 0) throw new AppError('出勤中の記録がないため、休憩を記録できません。')
  },
  async getPrefs(): Promise<Prefs> {
    const { data: r, error } = await client().from('user_preferences').select('notify_news,notify_important').eq('user_id', await userId()).maybeSingle()
    if (error) throw toAppError(error)
    return { notifyNews: r?.notify_news ?? true, notifyImportant: r?.notify_important ?? true }
  },
  async setPref(key, value) {
    const col = key === 'notifyNews' ? 'notify_news' : 'notify_important'
    const { error } = await client().from('user_preferences').upsert({ user_id: await userId(), [col]: value }, { onConflict: 'user_id' })
    if (error) throw toAppError(error)
  },
  async listStudents(): Promise<Student[]> {
    const roles = await client().from('user_roles').select('user_id').eq('role_id', 'student')
    if (roles.error) throw toAppError(roles.error)
    const ids = (roles.data ?? []).map((x) => x.user_id as string)
    if (ids.length === 0) return []
    const { data: rows, error } = await client().from('profiles').select('id,display_name,org,status').in('id', ids).order('display_name')
    if (error) throw toAppError(error)
    return (rows ?? []).map((x) => ({ id: x.id, name: x.display_name, org: x.org, status: x.status as Student['status'] }))
  },
  async getStudent(id): Promise<Student | null> {
    // 権限(RLS)により、管理対象の生徒以外（保護者など）は取得できない
    const { data: x, error } = await client().from('profiles').select('id,display_name,org,status').eq('id', id).maybeSingle()
    if (error) throw toAppError(error)
    const role = await client().from('user_roles').select('role_id').eq('user_id', id).eq('role_id', 'student').maybeSingle()
    if (!x || !role.data) return null
    return { id: x.id, name: x.display_name, org: x.org, status: x.status as Student['status'] }
  },
  async createStudent(v) {
    // アカウントの作成は、サーバー側の関数（Edge Function）が行う。強い権限の鍵は、ブラウザには存在しない
    const { data: r, error } = await client().functions.invoke('admin-create-student', { body: { name: v.name, email: v.email, org: v.org } })
    if (error) {
      let msg = ''
      try { const j = await (error as { context?: Response }).context?.json(); msg = typeof j?.message === 'string' ? j.message : '' } catch { /* 本文が読めない場合は一般的なメッセージ */ }
      throw msg ? new AppError(msg) : toAppError(error, 'アカウントを作成できませんでした。時間をおいてもう一度お試しください。')
    }
    const x = r as { id?: string; email?: string; password?: string } | null
    if (!x?.id || !x.password) throw new AppError('アカウントを作成できませんでした。時間をおいてもう一度お試しください。')
    return { id: x.id, email: x.email ?? v.email, password: x.password }
  },
  async updateStudent(id, v) {
    const n = v.name.trim()
    if (!n) throw new AppError('氏名を入力してください。')
    if (n.length > 30) throw new AppError('氏名は30文字以内で入力してください。')
    if (v.org.trim().length > 40) throw new AppError('所属は40文字以内で入力してください。')
    const { error } = await client().rpc('admin_update_student', { p_id: id, p_name: n, p_org: v.org.trim(), p_status: v.status })
    if (error) throw toAppError(error)
  },
  async listAdminNews(): Promise<AdminNews[]> {
    const { data: rows, error } = await client().rpc('admin_list_announcements')
    if (error) throw toAppError(error)
    return ((rows ?? []) as { id: string; title: string; body: string; important: boolean; status: string; publish_at: string }[])
      .map((x) => ({ id: x.id, title: x.title, body: x.body, important: x.important, status: x.status as AdminNews['status'], publishAt: x.publish_at }))
  },
  async saveNews(v) {
    const t = v.title.trim(), b = v.body.trim()
    if (!t) throw new AppError('タイトルを入力してください。')
    if (t.length > 60) throw new AppError('タイトルは60文字以内で入力してください。')
    if (!b) throw new AppError('本文を入力してください。')
    if (b.length > 2000) throw new AppError('本文は2000文字以内で入力してください。')
    const { data: id, error } = await client().rpc('admin_save_announcement', {
      p_id: v.id ?? null, p_title: t, p_body: b, p_important: v.important, p_status: v.status, p_publish_at: v.publishAt ?? null,
    })
    if (error) throw toAppError(error)
    return id as string
  },
  async deleteNews(id) {
    const { error } = await client().rpc('admin_delete_announcement', { p_id: id })
    if (error) throw toAppError(error)
  },
  async getDash(): Promise<AdminDash> {
    const [students, news, log] = await Promise.all([
      data.listStudents(), data.listAdminNews(),
      client().from('audit_logs').select('id,action,created_at').order('created_at', { ascending: false }).limit(3),
    ])
    if (log.error) throw toAppError(log.error)
    return {
      students: students.length, active: students.filter((x) => x.status === 'active').length,
      drafts: news.filter((x) => x.status === 'draft').length,
      important: news.filter((x) => x.important && x.status === 'published').slice(0, 2),
      log: (log.data ?? []).map((x) => ({ id: x.id as number, text: x.action as string, at: x.created_at as string })),
    }
  },
}

export const supabaseBackend: Backend = { auth, data, kind: 'supabase' }
