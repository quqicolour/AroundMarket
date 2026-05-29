import { useState, useEffect, useCallback } from "react";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import MarketCard from "../components/MarketCard";
import EmptyState from "../components/EmptyState";

function HeroSection({ marketCount }: { marketCount: number }) {
  return (
    <section className="hero-section">
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Arc Testnet · Prediction Market</span>
        </div>

        <h1 className="font-display" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 600, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: 14 }}>
          Decentralized Prediction Market
          <span className="gradient-text" style={{ fontStyle: 'italic' }}> · On-chain</span>
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: 440 }}>
          Binary YES / NO markets on arc. Self-custodied funds, smart contract settlement, transparent and trustless.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{marketCount}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em' }}>ACTIVE</span>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>USDC</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em' }}>COLLATERAL</span>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>100%</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em' }}>SETTLED</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [marketIds, setMarketIds] = useState<number[]>([]);

  const { data: rawCount, isLoading: countLoading, isError: countError, refetch } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarketCount",
    query: { staleTime: 0, gcTime: 0, retry: 3 },
  });

  const count = Number(rawCount ?? 0n);

  useEffect(() => {
    if (count > 0) {
      const ids = Array.from({ length: count }, (_, i) => i + 1);
      setMarketIds(ids);
    } else {
      setMarketIds([]);
    }
  }, [count]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      <HeroSection marketCount={marketIds.length} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Markets</h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>Click a card to trade</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {marketIds.length > 0 && (
            <div className="tag-chip">
              {marketIds.length} markets
            </div>
          )}
          <button
            onClick={refresh}
            disabled={countLoading}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              opacity: countLoading ? 0.5 : 1,
              transition: 'all 150ms',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {countLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, opacity: 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border-strong)' }} />
                <div style={{ width: 36, height: 10, borderRadius: 4, background: 'var(--bg-elevated)' }} />
              </div>
              <div style={{ width: '60%', height: 16, borderRadius: 6, background: 'var(--bg-elevated)', marginBottom: 16 }} />
              <div style={{ height: 44, borderRadius: 10, background: 'var(--bg-elevated)', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 40, height: 10, borderRadius: 4, background: 'var(--bg-elevated)' }} />
                <div style={{ width: 40, height: 10, borderRadius: 4, background: 'var(--bg-elevated)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : countError ? (
        <EmptyState
          title="Unable to Load"
          desc="Check your network connection or verify the contract is deployed"
        />
      ) : marketIds.length === 0 ? (
        <EmptyState title="No markets yet" desc="Be the first to create a prediction market" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {marketIds.map((id) => (
            <MarketCard key={id} marketId={id} />
          ))}
        </div>
      )}
    </div>
  );
}