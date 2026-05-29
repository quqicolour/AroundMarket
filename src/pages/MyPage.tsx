import { useState } from "react";
import { useAccount } from "wagmi";

export default function MyPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");

  if (!isConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>👛</div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Connect Wallet</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 }}>Connect your wallet to view positions and orders</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: 'var(--text-primary)' }}>My Portfolio</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Positions, orders, and history</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(["positions", "orders"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              background: activeTab === tab ? 'var(--primary)' : 'var(--bg-surface)',
              color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(26,127,90,0.2)' : 'none',
              borderWidth: 1, borderStyle: 'solid',
              borderColor: activeTab === tab ? 'var(--primary)' : 'var(--border)',
            }}
          >
            {tab === "positions" ? "Positions" : "Orders"}
          </button>
        ))}
      </div>

      {activeTab === "positions" && <PositionsSection />}
      {activeTab === "orders" && <OrdersSection />}
    </div>
  );
}

function PositionsSection() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>My Positions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>USDC Balance</p>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--primary-text)' }}>—</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Get test tokens from faucet</p>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>Total Positions</p>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--primary-text)' }}>0</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Appears after trading</p>
        </div>
      </div>
    </div>
  );
}

function OrdersSection() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>My Orders</h2>
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
        No active orders — place an order in a market
      </div>
    </div>
  );
}