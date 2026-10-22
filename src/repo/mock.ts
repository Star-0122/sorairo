// 画面の動作確認専用の模擬バックエンド（本番ビルドには含まれない: --mode mock のときだけ読み込まれる）
// サーバー(データベース)と同じルールをまねる: 権限・保護者の除外・勤怠のチェック・サーバー時刻での記録
import type { AdminNews, Attendance, Backend, Employee, Me, News, Prefs, RoleId, Service, Student } from './types'
import { AppError } from './types'

interface Person { id: string; email: string; pw: string; name: string; org: string; status: 'active' | 'suspended'; roles: RoleId[] }
const PEOPLE: Person[] = [
  { id: 'u1', email: 'student@test.invalid', pw: 'password1', name: 'テスト生徒', org: 'テスト校', status: 'active', roles: ['student'] },
  { id: 'u2', email: 'admin@test.invalid', pw: 'password1', name: 'テスト管理者', org: '本部', status: 'active', roles: ['admin'] },
  { id: 'u3', email: 'stopped@test.invalid', pw: 'password1', name: '停止中', org: '', status: 'suspended', roles: ['student'] },
  { id: 'u4', email: 'staff@test.invalid', pw: 'password1', name: 'テスト社員', org: '教務部', status: 'active', roles: ['staff'] },
  { id: 'u5', email: 'parent@test.invalid', pw: 'password1', name: 'テスト保護者', org: '', status: 'active', roles: ['parent'] },
  { id: 'u6', email: 'student2@test.invalid', pw: 'password1', name: '佐藤 花', org: 'テスト校', status: 'active', roles: ['student'] },
]
const EMP: Record<string, Employee> = {
  u4: { no: 'T-1001', dept: '教務部', title: '主任', status: 'active' },
  // 管理者(u2)は社員情報が未登録のケースの確認用
}
const h = 3600e3
const ago = (x: number) => new Date(Date.now() - x * h).toISOString()
const NEWS: (Omit<News, 'read'> & { to: RoleId[] })[] = [
  { id: 'a', title: '重要なテストのお知らせ', body: '本文A', tag: '重要', important: true, publishAt: ago(2), to: ['student'] },
  { id: 'b', title: '社内向け', body: '本文B', tag: '社内', important: false, publishAt: ago(5), to: ['staff'] },
  { id: 'c', title: '全員向け', body: '本文C', tag: 'お知らせ', important: false, publishAt: ago(30), to: ['student', 'staff', 'admin'] },
]
const ANEWS: (AdminNews & { to: RoleId[] })[] = [
  { id: 'm1', title: '生徒向けの公開済み', body: '本文', important: true, status: 'published', publishAt: ago(3), to: ['student'] },
  { id: 'm2', title: '生徒向けの下書き', body: '本文', important: false, status: 'draft', publishAt: ago(1), to: ['student'] },
  { id: 'm3', title: '保護者向け（対象外）', body: '本文', important: false, status: 'published', publishAt: ago(4), to: ['parent'] },
  { id: 'm4', title: '全員宛て（対象外）', body: '本文', important: false, status: 'published', publishAt: ago(6), to: ['student', 'parent'] },
]
const SERVICES: (Service & { to: RoleId[] })[] = [
  { id: 'sky', name: 'sky+', description: '学習', category: '学習', route: null, sortOrder: 1, to: ['student'] },
  { id: 'nws', name: 'お知らせ', description: 'お知らせ', category: '連絡', route: '/news', sortOrder: 2, to: ['student', 'admin', 'staff'] },
  { id: 'wk', name: '勤怠', description: '勤怠', category: '社員', route: '/attendance', sortOrder: 3, to: ['staff', 'admin'] },
  { id: 'card', name: '社員証', description: '社員証', category: '社員', route: '/card', sortOrder: 4, to: ['staff', 'admin'] },
]
const jst = (d = Date.now()) => new Date(d + 9 * h).toISOString().slice(0, 10)
const sess = () => localStorage.getItem('mock.session')
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d } }
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v))
const listeners = new Set<(e: 'signed_in' | 'signed_out' | 'recovery') => void>()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const who = () => { const id = sess(); return PEOPLE.find((p) => p.id === id) ?? null }
const must = () => { const p = who(); if (!p) throw new AppError('ログインの有効期限が切れました。もう一度ログインしてください。'); return p }
const needStaff = () => { const p = must(); if (!p.roles.some((r) => r === 'staff' || r === 'admin')) throw new AppError('この操作を行う権限がありません。'); return p }
const needAdmin = () => { const p = must(); if (!p.roles.includes('admin')) throw new AppError('この操作は管理者のみ行えます。'); return p }
const managed = (p: Person) => p.roles.includes('student') && !p.roles.includes('parent')
const isManagedNews = (n: { to: RoleId[] }) => n.to.length === 1 && n.to[0] === 'student'
const audit = (t: string) => { const a = load<{ id: number; text: string; at: string }[]>('mock.audit', []); a.unshift({ id: Date.now(), text: t, at: new Date().toISOString() }); save('mock.audit', a.slice(0, 50)) }
const OUT = 'このアカウントは管理の対象外です（保護者は管理できません）。'
const att = () => load<Record<string, { clockIn: string; clockOut: string | null; breakStart: string | null; breakEnd: string | null }>>('mock.att', {})

export const mockBackend: Backend = {
  kind: 'mock',
  auth: {
    async hasSession() { return Boolean(sess()) },
    async signIn(email, password) {
      await sleep(120)
      if (email === 'offline@test.invalid') throw new AppError('ネットワークに接続できません。通信状況を確認して、もう一度お試しください。')
      const u = PEOPLE.find((p) => p.email === email)
      if (!u || u.pw !== password) throw new AppError('メールアドレスまたはパスワードが正しくありません。')
      localStorage.setItem('mock.session', u.id); listeners.forEach((l) => l('signed_in'))
    },
    async signOut() { localStorage.removeItem('mock.session'); listeners.forEach((l) => l('signed_out')) },
    async requestReset() { await sleep(100) },
    async setNewPassword(pw) { if (pw.length < 8) throw new AppError('パスワードは8文字以上にしてください。') },
    async changePassword(pw) { must(); if (pw.length < 8) throw new AppError('パスワードは8文字以上にしてください。'); if (pw === 'password1') throw new AppError('以前と異なるパスワードを入力してください。') },
    onChange(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
  },
  data: {
    async getMe(): Promise<Me | null> {
      const p = who(); if (!p) return null
      return { id: p.id, email: p.email, name: p.name, org: p.org, status: p.status, roles: p.roles, lastSignIn: '2026-10-16T09:00:00Z' }
    },
    async updateDisplayName(n) { const p = must(); const v = n.trim(); if (!v) throw new AppError('氏名を入力してください。'); p.name = v },
    async listServices() { const p = must(); return SERVICES.filter((s) => p.roles.some((r) => s.to.includes(r))) },
    async listNews() {
      const p = must(); const reads = load<Record<string, string[]>>('mock.reads', {})
      return NEWS.filter((n) => p.roles.some((r) => n.to.includes(r))).map((n) => ({ ...n, read: (reads[p.id] ?? []).includes(n.id) }))
    },
    async markRead(id) { const p = must(); const r = load<Record<string, string[]>>('mock.reads', {}); r[p.id] = [...new Set([...(r[p.id] ?? []), id])]; save('mock.reads', r) },
    async getEmployee() { const p = needStaff(); return EMP[p.id] ?? null },
    async getAttendance(): Promise<Attendance | null> { const p = needStaff(); return att()[`${p.id}:${jst()}`] ?? null },
    async clockIn() {
      const p = needStaff(); const a = att(); const k = `${p.id}:${jst()}`
      if (a[k]) throw new AppError('すでに出勤済みです。')
      a[k] = { clockIn: new Date().toISOString(), clockOut: null, breakStart: null, breakEnd: null }; save('mock.att', a)
    },
    async clockOut() {
      const p = needStaff(); const a = att(); const r = a[`${p.id}:${jst()}`]
      if (!r || r.clockOut) throw new AppError('出勤の記録がないか、すでに退勤済みです。')
      r.clockOut = new Date().toISOString(); save('mock.att', a)
    },
    async setBreak(s, e) {
      const p = needStaff(); const a = att(); const r = a[`${p.id}:${jst()}`]
      if (!r || r.clockOut) throw new AppError('出勤中の記録がないため、休憩を記録できません。')
      if (new Date(e) <= new Date(s)) throw new AppError('休憩の終了は、開始より後の時刻にしてください。')
      if (new Date(s) < new Date(r.clockIn)) throw new AppError('休憩は、出勤時刻以降で入力してください。')
      if (new Date(e).getTime() > Date.now() + 60000) throw new AppError('現在より先の時刻は入力できません。')
      r.breakStart = s; r.breakEnd = e; save('mock.att', a)
    },
    async getPrefs(): Promise<Prefs> { const p = must(); return load<Record<string, Prefs>>('mock.prefs', {})[p.id] ?? { notifyNews: true, notifyImportant: true } },
    async setPref(k, v) { const p = must(); const all = load<Record<string, Prefs>>('mock.prefs', {}); all[p.id] = { ...(all[p.id] ?? { notifyNews: true, notifyImportant: true }), [k]: v }; save('mock.prefs', all) },
    async listStudents(): Promise<Student[]> { needAdmin(); return PEOPLE.filter(managed).map((x) => ({ id: x.id, name: x.name, org: x.org, status: x.status })) },
    async getStudent(id) { needAdmin(); const x = PEOPLE.find((p) => p.id === id); return x && managed(x) ? { id: x.id, name: x.name, org: x.org, status: x.status } : null },
    async createStudent(v) {
      needAdmin()
      const email = v.email.trim().toLowerCase(), name = v.name.trim()
      if (!email) throw new AppError('メールアドレスを入力してください。')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('メールアドレスの形式が正しくありません。')
      if (!name) throw new AppError('氏名を入力してください。')
      if (name.length > 30) throw new AppError('氏名は30文字以内で入力してください。')
      if (PEOPLE.some((x) => x.email === email)) throw new AppError('このメールアドレスは、すでに登録されています。')
      const password = 'Zx' + Math.random().toString(36).slice(2, 12).replace(/[01lIO]/g, 'k')
      const id = 'n' + Date.now(); PEOPLE.push({ id, email, pw: password, name, org: v.org.trim(), status: 'active', roles: ['student'] })
      audit(`生徒アカウントを作成: ${name}`); return { id, email, password }
    },
    async updateStudent(id, v) {
      needAdmin(); const x = PEOPLE.find((p) => p.id === id)
      if (!x || !managed(x)) throw new AppError(OUT)
      if (!v.name.trim()) throw new AppError('氏名を入力してください。')
      x.name = v.name.trim(); x.org = v.org.trim(); x.status = v.status; audit(`生徒「${x.name}」の情報を更新しました`)
    },
    async listAdminNews() { needAdmin(); const extra = load<(AdminNews & { to: RoleId[] })[]>('mock.anews', []); return [...ANEWS.filter((n) => !load<string[]>('mock.deleted', []).includes(n.id)), ...extra].filter(isManagedNews).map(({ to: _t, ...n }) => n) },
    async saveNews(v) {
      needAdmin(); if (!v.title.trim()) throw new AppError('タイトルを入力してください。'); if (!v.body.trim()) throw new AppError('本文を入力してください。')
      const extra = load<(AdminNews & { to: RoleId[] })[]>('mock.anews', [])
      if (v.id) {
        const seed = ANEWS.find((n) => n.id === v.id); if (seed && !isManagedNews(seed)) throw new AppError('このお知らせは管理の対象外です（生徒向けのみ管理できます）。')
        const i = extra.findIndex((n) => n.id === v.id)
        const rec = { id: v.id, title: v.title.trim(), body: v.body.trim(), important: v.important, status: v.status, publishAt: v.publishAt ?? new Date().toISOString(), to: ['student'] as RoleId[] }
        if (i >= 0) extra[i] = rec; else extra.push(rec)
        save('mock.anews', extra); audit(`お知らせ「${rec.title}」を保存しました`); return v.id
      }
      const id = 'x' + Date.now(); extra.push({ id, title: v.title.trim(), body: v.body.trim(), important: v.important, status: v.status, publishAt: v.publishAt ?? new Date().toISOString(), to: ['student'] })
      save('mock.anews', extra); audit(`お知らせ「${v.title.trim()}」を${v.status === 'draft' ? '下書き保存' : '公開'}しました`); return id
    },
    async deleteNews(id) {
      needAdmin(); const seed = ANEWS.find((n) => n.id === id)
      if (seed && !isManagedNews(seed)) throw new AppError('このお知らせは管理の対象外です（生徒向けのみ管理できます）。')
      save('mock.deleted', [...load<string[]>('mock.deleted', []), id]); save('mock.anews', load<{ id: string }[]>('mock.anews', []).filter((n) => n.id !== id)); audit('お知らせを削除しました')
    },
    async getDash() {
      needAdmin(); const st = PEOPLE.filter(managed); const news = await mockBackend.data.listAdminNews()
      return { students: st.length, active: st.filter((x) => x.status === 'active').length, drafts: news.filter((n) => n.status === 'draft').length, important: news.filter((n) => n.important && n.status === 'published').slice(0, 2), log: load<{ id: number; text: string; at: string }[]>('mock.audit', []).slice(0, 3) }
    },
  },
}
