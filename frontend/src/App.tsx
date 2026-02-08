import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Shield, LayoutDashboard, Lock, LogOut, ArrowRightLeft, Trophy } from 'lucide-react'
import { useNavigate, useLocation, Routes, Route, Link, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import Vault from './components/Vault'
import Bridge from './components/Bridge'
import RewardCenter from './components/RewardCenter'
import Docs from './components/Docs'

function App() {
  // 1. Khởi tạo trạng thái hoàn toàn dựa vào localStorage
  // Nếu chưa bao giờ ấn "Start" thì mặc định luôn là false để xem Landing Page
  const [isLaunched, setIsLaunched] = useState(() => {
    return localStorage.getItem('neon_launched') === 'true'
  })
  
  const { isConnected } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  // 2. Cập nhật localStorage khi isLaunched thay đổi
  useEffect(() => {
    if (isLaunched) {
      localStorage.setItem('neon_launched', 'true')
    } else {
      localStorage.removeItem('neon_launched')
    }
  }, [isLaunched])

  // Gỡ bỏ logic tự động redirect sang /dashboard khi ở trang chủ
  // Điều này giúp người dùng có thể xem Landing Page ngay cả khi đã từng "Launch" trước đó
  // (Nếu họ chọn quay lại trang chủ)

  if (!isLaunched && location.pathname !== '/docs') {
    return (
      <Routes>
        <Route path="/" element={<LandingPage onLaunch={() => {
          setIsLaunched(true)
          navigate('/dashboard')
        }} />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'white' }}>
      {/* Global Navbar */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 4rem', 
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10, 15, 26, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to={isLaunched ? "/dashboard" : "/"} className="logo" style={{ fontSize: '1.25rem', fontWeight: 900, textDecoration: 'none', color: 'white' }}>
            <Shield className="neon-text" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> 
            NEON<span className="neon-text">SLASH</span>
          </Link>
          
          {isLaunched && isConnected && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`nav-btn ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard size={18} /> Markets
              </button>
              <button 
                className={`nav-btn ${location.pathname === '/bridge' ? 'active' : ''}`}
                onClick={() => navigate('/bridge')}
              >
                <ArrowRightLeft size={18} /> Bridge
              </button>
              <button 
                className={`nav-btn ${location.pathname === '/vault' ? 'active' : ''}`}
                onClick={() => navigate('/vault')}
              >
                <Lock size={18} /> Vault
              </button>
              <button 
                className={`nav-btn ${location.pathname === '/rewards' ? 'active' : ''}`}
                onClick={() => navigate('/rewards')}
              >
                <Trophy size={18} /> Rewards
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/docs" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>Docs</Link>
          <ConnectButton showBalance={false} chainStatus="icon" />
          <button 
            className="icon-btn" 
            title="Exit to Landing"
            onClick={() => {
                setIsLaunched(false)
                navigate('/')
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Page Content with Routing */}
      <div className="content">
        <Routes>
          <Route path="/" element={<LandingPage onLaunch={() => {
            setIsLaunched(true)
            navigate('/dashboard')
          }} />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/dashboard" element={<Dashboard onNavigate={(v) => navigate(`/${v}`)} />} />
          <Route path="/bridge" element={<Bridge />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/rewards" element={<RewardCenter />} />
          <Route path="*" element={<Navigate to={isLaunched ? "/dashboard" : "/"} replace />} />
        </Routes>
      </div>

      <style>{`
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: none;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 600;
          transition: 0.3s;
        }
        .nav-btn:hover { color: white; background: rgba(255,255,255,0.05); }
        .nav-btn.active { color: var(--primary); background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }
        .icon-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 0.6rem;
          border-radius: 8px;
          cursor: pointer;
          transition: 0.3s;
        }
        .icon-btn:hover { color: #ef4444; border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
      `}</style>
    </div>
  )
}

export default App
