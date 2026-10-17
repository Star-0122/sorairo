import { AppError } from '../repo/types'

// バックエンドの生のエラーを、原因と次の操作が分かる日本語にそろえる
export function toAppError(e: unknown, fallback = '処理に失敗しました。時間をおいてもう一度お試しください。'): AppError {
  if (e instanceof AppError) return e
  const msg = String((e as { message?: string })?.message ?? e ?? '')
  const code = String((e as { code?: string })?.code ?? '')
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) return new AppError('ネットワークに接続できません。通信状況を確認して、もう一度お試しください。')
  if (/invalid login credentials/i.test(msg)) return new AppError('メールアドレスまたはパスワードが正しくありません。')
  if (/email not confirmed/i.test(msg)) return new AppError('メールアドレスの確認が完了していません。')
  if (/rate limit|too many/i.test(msg)) return new AppError('短時間に操作が集中しています。しばらく待ってからお試しください。')
  if (/jwt expired|refresh_token|session.*(missing|expired)/i.test(msg)) return new AppError('ログインの有効期限が切れました。もう一度ログインしてください。')
  if (code === '42501' || /permission denied|row-level security/i.test(msg)) return new AppError('この操作を行う権限がありません。')
  if (/password should be at least/i.test(msg)) return new AppError('パスワードは8文字以上にしてください。')
  if (/same password|different from the old/i.test(msg)) return new AppError('以前と異なるパスワードを入力してください。')
  return new AppError(fallback)
}
