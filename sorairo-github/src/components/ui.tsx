import type { ReactNode } from 'react'

const P: Record<string, ReactNode> = {
  home: <path d="M4 11l8-7 8 7v9H4zM10 20v-6h4v6" />,
  svc: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
  bell: <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  chev: <path d="M9 5l7 7-7 7" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></>,
  out: <path d="M10 5H6v14h4M14 8l4 4-4 4M18 12H9" />,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
}
export function Icon({ n, size = 22, sw = 1.8 }: { n: keyof typeof P; size?: number; sw?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
}
export const Cloud = ({ w = 56, h = 44 }: { w?: number; h?: number }) => (
  <svg width={w} height={h} viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" aria-hidden="true"><path d="M10 38a10 10 0 0 1 4-19 14 14 0 0 1 27-3 11 11 0 0 1 11 22z" /></svg>
)
export const Avatar = ({ big }: { big?: boolean }) => (
  <span className={`av${big ? ' big' : ''}`}>
    <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#7fc4c0" /><circle cx="16" cy="13" r="6" fill="#f0c9a8" /><path d="M9 12a7 7 0 0 1 14 0c-3-2-11-2-14 0z" fill="#2b2b3a" /><path d="M5 32a11 11 0 0 1 22 0z" fill="#2b3a55" /></svg>
  </span>
)
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><Cloud /><b>{title}</b>{children}{action}</div>
}
export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return <div className="empty" role="status" aria-live="polite"><Cloud /><b>{label}</b></div>
}

// サービスごとの色とアイコン（デザイン画像の配色）
const SI: Record<string, [string, string, ReactNode]> = {
  sky: ['#dfe9fb', '#4a6fe0', <path d="M8 12l3 3 5-6" />],
  att: ['#fdeccc', '#f5a623', <path d="M8 8h8M8 12h8M8 16h5" />],
  nws: ['#fbe3ee', '#e0508a', <path d="M7 16v-4a5 5 0 0 1 10 0v4l1 1.5H6zM10.5 20h3" />],
  hw: ['#ece6f8', '#8a5fd0', <path d="M8 9h8M8 13h5" />],
  log: ['#d9f1ee', '#2aa89a', <path d="M7 16l3-4 3 2 4-6" />],
  wk: ['#dcecfb', '#3f8fd8', <><circle cx="12" cy="12" r="5" /><path d="M12 9v3l2 1" /></>],
  card: ['#e6f6ec', '#22a45d', <><rect x="6" y="8" width="12" height="8" rx="1" /><path d="M9 12h3" /></>],
  info: ['#fdf1c4', '#d9a400', <path d="M12 8v5M12 16h.01" />],
}
export function ServiceIcon({ id, size = 22 }: { id: string; size?: number }) {
  const [bg, fg, g] = SI[id] ?? SI.sky
  return (
    <span className="b" style={{ background: bg }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill={fg} fillOpacity=".18" />{g}
      </svg>
    </span>
  )
}
