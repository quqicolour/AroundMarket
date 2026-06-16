import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import HomePage from './pages/HomePage'
import MarketsPage from './pages/MarketsPage'
import MyPage from './pages/MyPage'
import CreateMarketPage from './pages/CreateMarketPage'
import MarketDetailPage from './pages/MarketDetailPage'
import { TxToastProvider } from './components/TxToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

export default function App() {
  return (
    <TxToastProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
          <Header />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/create" element={<CreateMarketPage />} />
                <Route path="/my" element={<MyPage />} />
                <Route path="/market/:marketId" element={<MarketDetailPage />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </BrowserRouter>
    </TxToastProvider>
  )
}

function Header() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 header-glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-3 group flex-shrink-0">
          <div style={logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9"/>
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span style={{ color: 'var(--text-primary)' }}>Around</span>
            <span className="gradient-text">Market</span>
          </span>
        </NavLink>

        <nav className="flex items-center gap-1.5">
          <NavLink
            to="/"
            style={() => location.pathname === '/' ? activeNavStyle : navStyle}
            className="hidden sm:flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Home
          </NavLink>
          <NavLink
            to="/markets"
            style={() => location.pathname === '/markets' || location.pathname.startsWith('/market/') ? activeNavStyle : navStyle}
            className="hidden sm:flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 19V5M4 19h16M8 16V9M13 16V7M18 16v-4"/>
            </svg>
            Markets
          </NavLink>
          <NavLink
            to="/my"
            style={() => location.pathname === '/my' ? activeNavStyle : navStyle}
            className="hidden sm:flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            Portfolio
          </NavLink>
          <NavLink
            to="/create"
            style={() => location.pathname === '/create' ? activeNavStyle : navStyle}
            className="hidden sm:flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create
          </NavLink>
          <NavLink
            to="/create"
            style={() => location.pathname === '/create' ? activeNavStyle : navStyle}
            className="sm:hidden !px-3 !py-2"
            title="Create"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </NavLink>
        </nav>

        <div className="flex-shrink-0">
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
          />
        </div>
      </div>
    </header>
  )
}

const logoIcon = {
  width: 36, height: 36,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #1a7f5a, #059669)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
}

const navStyle = {
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  transition: 'all 150ms ease',
  border: '1px solid transparent',
}

const activeNavStyle = {
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--primary-text)',
  background: 'var(--primary-light)',
  border: '1px solid var(--yes-border)',
  transition: 'all 150ms ease',
}
