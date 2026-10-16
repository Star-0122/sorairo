// 画面が依存するのは、このファイルの型だけ。バックエンドを替えるときは、実装（supabase.ts）だけを差し替える。
export type RoleId = 'student' | 'parent' | 'teacher' | 'staff' | 'admin'

export interface Me {
  id: string
  email: string
  name: string
  org: string
  status: 'active' | 'suspended'
  roles: RoleId[]
}
export interface Service { id: string; name: string; description: string; category: string; route: string | null; sortOrder: number }
export interface News { id: string; title: string; body: string; tag: string; important: boolean; publishAt: string; read: boolean }

export interface AuthApi {
  hasSession(): Promise<boolean>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestReset(email: string): Promise<void>
  setNewPassword(password: string): Promise<void>
  onChange(cb: (event: 'signed_in' | 'signed_out' | 'recovery') => void): () => void
}
export interface DataApi {
  getMe(): Promise<Me | null>
  updateDisplayName(name: string): Promise<void>
  listServices(): Promise<Service[]>
  listNews(): Promise<News[]>
  markRead(id: string): Promise<void>
}
export interface Backend { auth: AuthApi; data: DataApi; kind: 'supabase' | 'mock' }

// 画面に出す日本語エラー
export class AppError extends Error {}
