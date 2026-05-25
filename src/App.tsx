import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import HomePage from './pages/HomePage'
import MyPage from './pages/MyPage'
import MarketDetailPage from './pages/MarketDetailPage'
import CreateMarketModal from './components/CreateMarketModal'
import './styles/index.css'

export default function App() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white font-sans">
        <Header onCreateMarket={() => setShowCreateModal(true)} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/market/:marketId" element={<MarketDetailPage />} />
          </Routes>
        </main>
        <CreateMarketModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
        />
      </div>
    </BrowserRouter>
  )
}

interface HeaderProps {
  onCreateMarket: () => void
}

function Header({ onCreateMarket }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            A
          </div>
          <span className="text-lg font-bold tracking-tight">
            Around
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Market
            </span>
          </span>
        </a>

        <nav className="flex items-center gap-1">
          <a
            href="/"
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/60 transition"
          >
            市场
          </a>
          <a
            href="/my"
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/60 transition"
          >
            我的仓位
          </a>
          <button
            type="button"
            onClick={onCreateMarket}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition ml-2"
          >
            创建市场
          </button>
        </nav>

        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
    </header>
  )
}