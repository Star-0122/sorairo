// 勤怠は日本時間で扱う（端末の地域設定に左右されない）
const TZ = 'Asia/Tokyo'
export const jstDate = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d) // YYYY-MM-DD
export const hm = (iso: string) => new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
export const nowHm = () => hm(new Date().toISOString())
export function jstLabel(d = new Date()): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}年${p.month}月${p.day}日(${p.weekday})`
}
export const toIso = (hhmm: string) => new Date(`${jstDate()}T${hhmm}:00+09:00`).toISOString()
export const minutes = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
export const dur = (m: number) => `${Math.floor(m / 60)}時間${String(Math.max(0, m) % 60).padStart(2, '0')}分`
export const toLocalInput = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
