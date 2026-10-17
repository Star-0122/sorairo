import { useEffect } from 'react'
import { Link, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Cloud, Icon } from './ui'
import { useData } from './DataContext'

const TABS = [
  { key: 'home', to: '/', label: 'ホーム', icon: 'home' },
  { key: 'services', to: '/services', label: 'サービス', icon: 'svc' },
  { key: 'news', to: '/news', label: 'お知らせ', icon: 'bell' },
  { key: 'account', to: '/account', label: 'アカウント', icon: 'user' },
] as const

// 画面ごとの「どのタブを選択中にするか・見出し・戻り先」
const META: { path: string; key: string; title: string; back?: string }[] = [
  { path: '/', key: 'home', title: '' },
  { path: '/services', key: 'services', title: 'サービス' },
  { path: '/news/:id', key: 'news', title: 'お知らせ', back: '/news' },
  { path: '/news', key: 'news', title: 'お知らせ' },
  { path: '/account/profile', key: 'account', title: 'プロフィール編集', back: '/account' },
  { path: '/account/notifications', key: 'account', title: '通知設定', back: '/account' },
  { path: '/account/security', key: 'account', title: 'セキュリティ設定', back: '/account' },
  { path: '/account', key: 'account', title: 'アカウント' },
  { path: '/card', key: 'home', title: '社員証', back: '/' },
  { path: '/attendance', key: 'home', title: '勤怠', back: '/' },
  { path: '/admin', key: 'home', title: '管理者', back: '/' },
  { path: '/admin/students', key: 'home', title: '生徒管理', back: '/admin' },
  { path: '/admin/students/:id', key: 'home', title: '生徒の情報', back: '/admin/students' },
  { path: '/admin/news', key: 'home', title: 'お知らせ管理', back: '/admin' },
  { path: '/admin/news/new', key: 'home', title: 'お知らせの作成', back: '/admin/news' },
  { path: '/admin/news/:id', key: 'home', title: 'お知らせの編集', back: '/admin/news' },
]
function metaOf(pathname: string) {
  return META.find((m) => matchPath({ path: m.path, end: true }, pathname)) ?? META[0]
}

export default function Shell() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { unread } = useData()
  const t = metaOf(pathname)

  useEffect(() => {
    document.body.dataset.view = t.key === 'home' && t.title === '' ? 'home' : t.key + '-sub'
    document.title = t.title ? `${t.title} - そらいろ` : 'そらいろ'
    window.scrollTo(0, 0)
  }, [t.key, t.title, pathname])

  const links = TABS.map((x) => (
    <Link key={x.to} to={x.to} className={t.key === x.key ? 'on' : ''} aria-current={t.key === x.key && !t.back ? 'page' : undefined}>
      <Icon n={x.icon} />{x.label}
    </Link>
  ))
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
            {t.back ? <button className="bk" onClick={() => nav(t.back!)} aria-label="前の画面に戻る"><Icon n="back" size={20} sw={2} />{t.title}</button> : t.title}
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
