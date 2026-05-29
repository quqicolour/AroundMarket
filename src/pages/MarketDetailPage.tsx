import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { formatAddress } from "../utils/format";
import KLineChart from "../components/KLineChart";
import OrderBookView from "../components/OrderBookView";
import RecentTrades from "../components/RecentTrades";
import MyOrders from "../components/MyOrders";

type TabType = "chart" | "orderbook" | "myorders";

const EXPLORER_BASE = "https://testnet.arcscan.io";

// Build explorer URL for an address or tx
function explorerUrl(type: "address" | "tx", value: string): string {
  return `${EXPLORER_BASE}/${type}/${value}`;
}

export default function MarketDetailPage() {
  const { marketId } = useParams();
  const id = Number(marketId ?? 1);
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [addrExpanded, setAddrExpanded] = useState(false);

  const { data: marketData, isLoading } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  if (isLoading) return <MarketDetailSkeleton />;

  if (!marketData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
        <p style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 16 }}>Market #{id} Not Found</p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>This market may not exist or has been removed</p>
        <Link to="/" className="btn-ghost" style={{ fontSize: 13 }}>← Back</Link>
      </div>
    );
  }

  const m = marketData as any;
  // Types.MarketData: [creator, market, collateral, conditionTokens, orderBook, matchingEngine, conditionId, startTime, endTime, resolved, fee]
  const creator       = Array.isArray(m) ? m[0]  : m.creator;
  const marketAddr    = Array.isArray(m) ? m[1]  : m.market;
  const collateral    = Array.isArray(m) ? m[2]  : m.collateral;
  const conditionAddr = Array.isArray(m) ? m[3]  : m.conditionTokens;
  const orderBookAddr = Array.isArray(m) ? m[4]  : m.orderBook;
  const matchingEngineAddr = Array.isArray(m) ? m[5] : m.matchingEngine;
  const conditionId  = Array.isArray(m) ? m[6]  : m.conditionId;
  const startTime    = Array.isArray(m) ? Number(m[7])  : Number(m.startTime);
  const endTime      = Array.isArray(m) ? Number(m[8])  : Number(m.endTime);
  const resolved     = Array.isArray(m) ? m[9]  : m.resolved;
  const fee          = Array.isArray(m) ? Number(m[10]) : Number(m.fee);

  if (!orderBookAddr || orderBookAddr === "0x0000000000000000000000000000000000000000") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
        <p style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 16 }}>Market #{id} Not Found</p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>This market may not exist or has been removed</p>
        <Link to="/" className="btn-ghost" style={{ fontSize: 13 }}>← Back</Link>
      </div>
    );
  }

  // Build marketData tuple for TradingForm: [creator, market, collateral, conditionTokens, orderBook, matchingEngine, conditionId, startTime, endTime, resolved, fee]
  const marketDataTuple: any = [creator, marketAddr, collateral, conditionAddr, orderBookAddr, matchingEngineAddr, conditionId, startTime, endTime, resolved, fee];

  const tabs: { key: TabType; label: string }[] = [
    { key: "chart", label: "Chart" },
    { key: "orderbook", label: "Order Book" },
    { key: "myorders", label: "My Orders" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back nav */}
      <Link to="/" style={backLink}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Markets
      </Link>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
        {/* Left — main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Market info */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-tertiary)" }}>#{id}</span>
                  <div style={{
                    padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
                    background: resolved ? "var(--bg-elevated)" : "var(--yes-light)",
                    color: resolved ? "var(--text-tertiary)" : "var(--yes)",
                    border: `1px solid ${resolved ? "var(--border)" : "var(--yes-border)"}`,
                  }}>
                    {resolved ? "Resolved" : "Active"}
                  </div>
                  {fee > 0 && (
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      Fee: {(fee / 1e6 * 100).toFixed(2)}%
                    </span>
                  )}
                </div>
                <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Market #{id}
                </h1>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                  {startTime > 0 && endTime > 0
                    ? `${new Date(startTime * 1000).toLocaleDateString()} – ${new Date(endTime * 1000).toLocaleDateString()}`
                    : "YES / NO Binary Prediction Market"}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Creator: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatAddress(creator, 4)}</span>
                </p>
              </div>
            </div>

            {/* Collapsible contract addresses */}
            <button
              type="button"
              onClick={() => setAddrExpanded(v => !v)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "8px 12px", borderRadius: 10,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                cursor: "pointer", transition: "all 150ms",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Contract Addresses</span>
              <svg
                width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2}
                viewBox="0 0 24 24" style={{ color: "var(--text-tertiary)", transition: "transform 200ms", transform: addrExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {addrExpanded && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                <InfoTileLink label="Market" value={formatAddress(marketAddr, 5)} address={marketAddr} mono />
                <InfoTileLink label="Order Book" value={formatAddress(orderBookAddr, 5)} address={orderBookAddr} mono />
                <InfoTileLink label="Collateral" value={formatAddress(collateral, 5)} address={collateral} mono />
                <InfoTileLink label="Condition Tokens" value={formatAddress(conditionAddr, 5)} address={conditionAddr} mono />
                <InfoTileLink label="Matching Engine" value={formatAddress(matchingEngineAddr, 5)} address={matchingEngineAddr} mono />
                <InfoTileLink label="Condition ID" value={formatAddress(conditionId, 5)} address={conditionId} mono />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, padding: "13px 8px", fontSize: 13, fontWeight: 600,
                    transition: "all 150ms",
                    background: activeTab === tab.key ? "var(--primary-light)" : "transparent",
                    color: activeTab === tab.key ? "var(--primary-text)" : "var(--text-tertiary)",
                    borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 0 }}>
              {activeTab === "chart" && (
                <div style={{ padding: "12px 16px 16px" }}>
                  <KLineChart width={600} height={260} />
                </div>
              )}
              {activeTab === "orderbook" && (
                <div style={{ padding: 16 }}>
                  <OrderBookView marketId={id} orderBookAddr={orderBookAddr} />
                </div>
              )}
              {activeTab === "myorders" && (
                <div style={{ padding: 16 }}>
                  <MyOrders orderBookAddr={orderBookAddr} />
                </div>
              )}
            </div>
          </div>

          {/* Recent Trades — at the bottom */}
          <RecentTrades marketId={id} matchingEngineAddr={matchingEngineAddr} />
        </div>

        {/* Right — sticky — TradingForm handles its own chart via KLineChart sub-component */}
        <div style={{ position: "sticky", top: 88 }}>
          {/* TradingForm now shows the ratio + K-line inline */}
          <TradingFormWrapper marketData={marketDataTuple} />
        </div>
      </div>
    </div>
  );
}

// Wrapper that imports TradingForm (avoids circular)
import TradingForm from "../components/TradingForm";

// ── InfoTile with external link ──────────────────────────────────────────────
function InfoTileLink({ label, value, address, mono }: { label: string; value: string; address: string; mono?: boolean }) {
  return (
    <a
      href={explorerUrl("address", address)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        background: "var(--bg-elevated)",
        borderRadius: 12,
        padding: "10px 14px",
        textDecoration: "none",
        transition: "all 150ms",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-overlay)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
    >
      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ opacity: 0.4 }}>
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
        </svg>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</div>
    </a>
  );
}

function TradingFormWrapper({ marketData }: { marketData: any }) {
  return <TradingForm marketData={marketData} initialSide="yes" />;
}

function MarketDetailSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ width: 80, height: 16, borderRadius: 6, background: "var(--bg-elevated)", marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: "var(--bg-elevated)" }} />)}
        </div>
      </div>
      <div className="card" style={{ padding: 24, height: 200 }} />
    </div>
  );
}

const backLink = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 13, color: "var(--text-tertiary)",
  transition: "color 150ms",
};