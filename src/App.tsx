import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DataProvider } from './components/DataContext'
import { ToastProvider } from './components/Toast'
import Shell from './components/Shell'
import { Cloud } from './components/ui'
import { supabaseConfigured } from './lib/supabaseClient'
import Login from './pages/Login'
import Forgot from './pages/Forgot'
import Reset from './pages/Reset'
import Home from './pages/Home'
import Services from './pages/Services'
import { NewsList, NewsDetail } from './pages/News'
import Account from './pages/Account'

function Splash() {
  return <div className="splash2" role="status" aria-label="読み込み中"><div><Cloud w={64} h={48} /><b>そらいろ</b><span>毎日を、ひとつの空で。</span></div></div>
}

function Guard() {
  const { status } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'recovery') return <Navigate to="/reset" replace />
  if (status === 'out') return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <DataProvider><Shell /></DataProvider>
}

export default function App() {
  if (!(import.meta.env.MODE === 'mock') && !supabaseConfigured) {
    return <div className="auth"><div className="nt" role="alert"><b>接続設定がありません</b><br />Supabase の URL と公開用キーが設定されていないため、起動できません。管理者に連絡してください。</div></div>
  }
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/reset" element={<Reset />} />
            <Route element={<Guard />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/news" element={<NewsList />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/account" element={<Account />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
