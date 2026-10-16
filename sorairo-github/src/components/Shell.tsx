import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Cloud, Icon } from './ui'
import { useData } from './DataContext'

const TABS = [
  { to: '/', label: 'ホーム', icon: 'home', end: true },
  { to: '/services', label: 'サービス', icon: 'svc', end: false },
  { to: '/news', label: 'お知らせ', icon: 'bell', end: false },
  { to: '/account', label: 'アカウント', icon: 'user', end: false },
] as const

function titleOf(path: string): { key: string; title: string; back?: string } {
  if (path === '/') return { key: 'home', title: '' }
  if (path.startsWith('/services')) return { key: 'services', title: 'サービス' }
  if (path.startsWith('/news/')) return { key: 'news', title: 'お知らせ', back: '/news' }
  if (path.startsWith('/news')) return { key: 'news', title: 'お知らせ' }
  if (path.startsWith('/account')) return { key: 'account', title: 'アカウント' }
  return { key: 'home', title: '' }
}

export default function Shell() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { unread } = useData()
  const t = titleOf(pathname)

  useEffect(() => {
    document.body.dataset.view = t.key
    document.title = t.title ? `${t.title} - そらいろ` : 'そらいろ'
    window.scrollTo(0, 0)
  }, [t.key, t.title, pathname])

  const links = (
    <>
      {TABS.map((x) => (
        <NavLink key={x.to} to={x.to} end={x.end} className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icon n={x.icon} />{x.label}
        </NavLink>
      ))}
    </>
  )
  return (
    <>
      <aside className="side" aria-label="メイン">
        <div className="logo"><Cloud w={26} h={20} />そらいろ</div>
        <div id="sidenav" className="navlinks">{links}</div>
      </aside>
      <div className="app">
        <header className="hd">
          <div className="logo"><Cloud w={26} h={20} />そらいろ</div>
          <h1 className="ttl">
            {t.back && <button className="bk" onClick={() => nav(t.back!)} aria-label="お知らせ一覧に戻る"><Icon n="back" size={20} sw={2} />{t.title}</button>}
            {!t.back && t.title}
          </h1>
          <div className="hd-r">
            <button className="bell" onClick={() => nav('/news')} aria-label={unread ? 'お知らせ（未読あり）' : 'お知らせ'}>
              <Icon n="bell" size={24} />{unread > 0 && <i />}
            </button>
            <button className="av" onClick={() => nav('/account')} aria-label="アカウント"><Avatar /></button>
          </div>
        </header>
        <main className="main" id="main"><Outlet /></main>
        <nav id="tabs" aria-label="メイン" className="navlinks">{links}</nav>
      </div>
    </>
  )
}
