// 画面の動作確認専用の模擬バックエンド（本番ビルドには含まれない: --mode mock のときだけ使う）
import type { Backend, Me, News, RoleId, Service } from './types'
import { AppError } from './types'

const USERS: Record<string, { pw: string; me: Me }> = {
  'student@test.invalid': { pw: 'password1', me: { id: 'u1', email: 'student@test.invalid', name: 'テスト生徒', org: 'テスト校', status: 'active', roles: ['student'] } },
  'admin@test.invalid': { pw: 'password1', me: { id: 'u2', email: 'admin@test.invalid', name: 'テスト管理者', org: '本部', status: 'active', roles: ['admin'] } },
  'stopped@test.invalid': { pw: 'password1', me: { id: 'u3', email: 'stopped@test.invalid', name: '停止中', org: '', status: 'suspended', roles: ['student'] } },
}
const h = 3600e3
const NEWS: (Omit<News, 'read'> & { to: RoleId[] })[] = [
  { id: 'a', title: '重要なテストのお知らせ', body: '本文A', tag: '重要', important: true, publishAt: new Date(Date.now() - 2 * h).toISOString(), to: ['student'] },
  { id: 'b', title: '社内向け', body: '本文B', tag: '社内', important: false, publishAt: new Date(Date.now() - 5 * h).toISOString(), to: ['staff'] },
  { id: 'c', title: '全員向け', body: '本文C', tag: 'お知らせ', important: false, publishAt: new Date(Date.now() - 30 * h).toISOString(), to: ['student', 'staff', 'admin'] },
]
const SERVICES: (Service & { to: RoleId[] })[] = [
  { id: 's1', name: 'sky+', description: '学習', category: '学習', route: null, sortOrder: 1, to: ['student'] },
  { id: 's2', name: 'お知らせ', description: 'お知らせ', category: '連絡', route: '/news', sortOrder: 2, to: ['student', 'admin'] },
]
let session: string | null = localStorage.getItem('mock.session')
const reads: Record<string, Set<string>> = {}
const listeners = new Set<(e: 'signed_in' | 'signed_out' | 'recovery') => void>()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const me = () => (session ? Object.values(USERS).find((u) => u.me.id === session)?.me ?? null : null)

export const mockBackend: Backend = {
  kind: 'mock',
  auth: {
    async hasSession() { return Boolean(session) },
    async signIn(email, password) {
      await sleep(150)
      if (email === 'offline@test.invalid') throw new AppError('ネットワークに接続できません。通信状況を確認して、もう一度お試しください。')
      const u = USERS[email]
      if (!u || u.pw !== password) throw new AppError('メールアドレスまたはパスワードが正しくありません。')
      session = u.me.id; localStorage.setItem('mock.session', session); listeners.forEach((l) => l('signed_in'))
    },
    async signOut() { session = null; localStorage.removeItem('mock.session'); listeners.forEach((l) => l('signed_out')) },
    async requestReset() { await sleep(100) },
    async setNewPassword(pw) { if (pw.length < 8) throw new AppError('パスワードは8文字以上にしてください。') },
    onChange(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
  },
  data: {
    async getMe() { return me() },
    async updateDisplayName(n) { const m = me(); if (m) m.name = n.trim() },
    async listServices() { const m = me(); return SERVICES.filter((s) => m?.roles.some((r) => s.to.includes(r))) },
    async listNews() {
      const m = me(); if (!m) return []
      return NEWS.filter((n) => m.roles.some((r) => n.to.includes(r))).map((n) => ({ ...n, read: Boolean(reads[m.id]?.has(n.id)) }))
    },
    async markRead(id) { const m = me(); if (m) (reads[m.id] ??= new Set()).add(id) },
  },
}
