const p2 = (n: number) => String(n).padStart(2, '0')
export const fmt = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}` }
export const ago = (iso: string) => {
  const m = (Date.now() - new Date(iso).getTime()) / 6e4
  return m < 60 ? `${Math.max(1, Math.floor(m))}分前` : m < 1440 ? `${Math.floor(m / 60)}時間前` : `${Math.floor(m / 1440)}日前`
}
