import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Home, LineChart, Wallet, Plus } from 'lucide-react'
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
        <div className="min-h-screen">
          <Header />
          <main className="page-container">
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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    if (path === "/markets") return location.pathname === "/markets" || location.pathname.startsWith("/market/")
    return location.pathname.startsWith(path)
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <NavLink to="/" className="flex items-center gap-3 group flex-shrink-0">
          <span className="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.92"/>
              <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-light">Around</span>
            <span className="brand-accent">Market</span>
          </span>
        </NavLink>

        <nav className="nav-list" aria-label="Primary">
          <NavLink
            to="/"
            className={`nav-item ${isActive("/") ? "active" : ""}`}
          >
            <Home size={14} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden sm:inline">Home</span>
          </NavLink>
          <NavLink
            to="/markets"
            className={`nav-item ${isActive("/markets") ? "active" : ""}`}
          >
            <LineChart size={14} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden sm:inline">Markets</span>
          </NavLink>
          <NavLink
            to="/my"
            className={`nav-item ${isActive("/my") ? "active" : ""}`}
          >
            <Wallet size={14} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden sm:inline">Portfolio</span>
          </NavLink>
          <NavLink
            to="/create"
            className={`nav-item ${isActive("/create") ? "active" : ""}`}
          >
            <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
            <span className="hidden sm:inline">Create</span>
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
