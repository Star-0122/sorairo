// 画面が依存するのは、このファイルの型だけ。バックエンドを替えるときは、実装（supabase.ts）だけを差し替える。
export type RoleId = 'student' | 'parent' | 'teacher' | 'staff' | 'admin'

export interface Me {
  id: string
  email: string
  name: string
  org: string
  status: 'active' | 'suspended'
  roles: RoleId[]
  lastSignIn: string | null
}
export interface Service { id: string; name: string; description: string; category: string; route: string | null; sortOrder: number }
export interface News { id: string; title: string; body: string; tag: string; important: boolean; publishAt: string; read: boolean }

export interface Employee { no: string; dept: string; title: string; status: 'active' | 'inactive' }
export interface Attendance { clockIn: string; clockOut: string | null; breakStart: string | null; breakEnd: string | null }
export interface Prefs { notifyNews: boolean; notifyImportant: boolean }
export interface Student { id: string; name: string; org: string; status: 'active' | 'suspended' }
export interface AdminNews { id: string; title: string; body: string; important: boolean; status: 'draft' | 'published'; publishAt: string }
export interface AdminDash { students: number; active: number; drafts: number; important: AdminNews[]; log: { id: number; text: string; at: string }[] }

export interface AuthApi {
  hasSession(): Promise<boolean>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestReset(email: string): Promise<void>
  setNewPassword(password: string): Promise<void>
  changePassword(password: string): Promise<void>
  onChange(cb: (event: 'signed_in' | 'signed_out' | 'recovery') => void): () => void
}
export interface DataApi {
  getMe(): Promise<Me | null>
  updateDisplayName(name: string): Promise<void>
  listServices(): Promise<Service[]>
  listNews(): Promise<News[]>
  markRead(id: string): Promise<void>
  // 社員
  getEmployee(): Promise<Employee | null>
  getAttendance(): Promise<Attendance | null>
  clockIn(): Promise<void>
  clockOut(): Promise<void>
  setBreak(startIso: string, endIso: string): Promise<void>
  // 設定
  getPrefs(): Promise<Prefs>
  setPref(key: keyof Prefs, value: boolean): Promise<void>
  // 管理者（対象は生徒のみ。保護者は対象外）
  getDash(): Promise<AdminDash>
  listStudents(): Promise<Student[]>
  getStudent(id: string): Promise<Student | null>
  updateStudent(id: string, v: { name: string; org: string; status: Student['status'] }): Promise<void>
  listAdminNews(): Promise<AdminNews[]>
  saveNews(v: { id?: string; title: string; body: string; important: boolean; status: AdminNews['status']; publishAt?: string }): Promise<string>
  deleteNews(id: string): Promise<void>
}
export interface Backend { auth: AuthApi; data: DataApi; kind: 'supabase' | 'mock' }

// 画面に出す日本語エラー
export class AppError extends Error {}
