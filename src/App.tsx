import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import HomePage from './pages/HomePage'
import MyPage from './pages/MyPage'
import MarketDetailPage from './pages/MarketDetailPage'
import CreateMarketModal from './components/CreateMarketModal'
import { TxToastProvider } from './components/TxToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

export default function App() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <TxToastProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
          <Header onCreateMarket={() => setShowCreateModal(true)} />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/my" element={<MyPage />} />
                <Route path="/market/:marketId" element={<MarketDetailPage />} />
              </Routes>
            </ErrorBoundary>
          </main>

          <CreateMarketModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />
        </div>
      </BrowserRouter>
    </TxToastProvider>
  )
}

function Header({ onCreateMarket }: { onCreateMarket: () => void }) {
  const location = typeof window !== 'undefined' ? window.location.pathname : '/'

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
            style={() => location === '/' ? activeNavStyle : navStyle}
            className="hidden sm:flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Markets
          </NavLink>
          <NavLink
            to="/my"
            style={() => location === '/my' ? activeNavStyle : navStyle}
            className="hidden sm:flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            Portfolio
          </NavLink>
          <button
            type="button"
            onClick={onCreateMarket}
            style={createBtnStyle}
            className="hidden sm:flex items-center gap-1.5 text-sm"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Market
          </button>
          <button
            type="button"
            onClick={onCreateMarket}
            style={createBtnStyle}
            className="sm:hidden !px-3 !py-2"
            title="Create Market"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
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

const createBtnStyle = {
  background: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  padding: '8px 16px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
  transition: 'all 150ms ease',
  marginLeft: 8,
}
