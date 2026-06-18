import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatAddress } from "../utils/format";
import KLineChart from "../components/KLineChart";
import OrderBookView from "../components/OrderBookView";
import RecentTrades from "../components/RecentTrades";
import MyOrders from "../components/MyOrders";
import CollateralSplitter from "../components/CollateralSplitter";
import { getMarketTimingStatus, useUnixNow } from "../utils/marketTime";
import { marketToTuple, useSubgraphMarket } from "../utils/subgraph";

type TabType = "chart" | "orderbook" | "myorders";

const EXPLORER_BASE = "https://testnet.arcscan.io";

// Build explorer URL for an address or tx
function explorerUrl(type: "address" | "tx", value: string): string {
  return `${EXPLORER_BASE}/${type}/${value}`;
}

function compactAmount(value?: string | null): string {
  if (!value) return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  if (parsed >= 1_000_000_000) return `${(parsed / 1_000_000_000).toFixed(2)}B`;
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(2)}M`;
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(2)}K`;
  return parsed.toLocaleString();
}

function compactCollateral(value?: string | null, decimals = 6): string {
  if (!value) return "-";
  const parsed = Number(value) / 10 ** decimals;
  if (!Number.isFinite(parsed)) return "-";
  if (parsed >= 1_000_000_000) return `$${(parsed / 1_000_000_000).toFixed(2)}B`;
  if (parsed >= 1_000_000) return `$${(parsed / 1_000_000).toFixed(2)}M`;
  if (parsed >= 1_000) return `$${(parsed / 1_000).toFixed(2)}K`;
  return `$${parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function MarketDetailPage() {
  const { marketId } = useParams();
  const id = Number(marketId ?? 1);
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [addrExpanded, setAddrExpanded] = useState(false);
  const [balanceRefreshSignal, setBalanceRefreshSignal] = useState(0);

  const { data: marketData, isLoading } = useSubgraphMarket(id);
  const nowTime = useUnixNow();

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

  const creator = marketData.creator;
  const marketAddr = marketData.market;
  const collateral = marketData.collateral;
  const conditionAddr = marketData.conditionTokens;
  const orderBookAddr = marketData.orderBook;
  const matchingEngineAddr = marketData.matchingEngine;
  const conditionId = marketData.conditionId;
  const startTime = Number(marketData.startTime);
  const endTime = Number(marketData.endTime);
  const resolved = marketData.resolved;
  const fee = Number(marketData.fee);
  const question = marketData.question?.trim() || `Market #${id}`;
  const dataSource = marketData.dataSource?.trim() || "Data source not provided";
  const tradeCount = compactAmount(marketData.tradeCount);
  const volume = compactCollateral(marketData.volume);
  const expiryTimeLabel = endTime > 0 ? new Date(endTime * 1000).toLocaleString() : "Schedule pending";

  if (!orderBookAddr || orderBookAddr === "0x0000000000000000000000000000000000000000") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
        <p style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 16 }}>Market #{id} Not Found</p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>This market may not exist or has been removed</p>
        <Link to="/" className="btn-ghost" style={{ fontSize: 13 }}>← Back</Link>
      </div>
    );
  }

  // Build marketData tuple for TradingForm.
  const marketDataTuple: any = marketToTuple(marketData);
  const timing = getMarketTimingStatus(startTime, endTime, resolved, nowTime);

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
          <div className="market-detail-hero">
            <div className="market-detail-copy">
              <div className="market-detail-meta-row">
                <span className="market-id-chip">#{id}</span>
                <span className={timing.kind === "active" ? "market-state-chip active" : "market-state-chip"}>
                  {timing.statusLabel}
                </span>
                <span>{timing.settlementLabel}</span>
                {fee > 0 && <span>Fee {(fee / 1e6 * 100).toFixed(2)}%</span>}
              </div>

              <h1>{question}</h1>
              <p>{dataSource}</p>

              <div className="market-detail-owner">
                <span>Creator</span>
                <a href={explorerUrl("address", creator)} target="_blank" rel="noreferrer">
                  {formatAddress(creator, 5)}
                </a>
              </div>
            </div>

            <div className="market-detail-stats">
              <MarketStat label="Trades" value={tradeCount} />
              <MarketStat label="Volume" value={volume} />
              <div className="market-time-card">
                <strong>{timing.countdownLabel}</strong>
                <small>{expiryTimeLabel}</small>
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
                <div className="market-chart-section">
                  <KLineChart marketId={id} isYes width={760} height={380} />
                </div>
              )}
              {activeTab === "orderbook" && (
                <div style={{ padding: 16 }}>
                  <OrderBookView marketId={id} collateralAddr={collateral} />
                </div>
              )}
 {activeTab === "myorders" && (
 <div style={{ padding:16 }}>
  <MyOrders marketAddr={marketAddr} marketId={id} collateralAddr={collateral} />
 </div>
 )}
            </div>
          </div>

          {/* Recent Trades — at the bottom */}
          <RecentTrades marketId={id} matchingEngineAddr={matchingEngineAddr} collateralAddr={collateral} />
        </div>

        {/* Right — sticky trading rail */}
        <div style={{ position: "sticky", top: 88, display: "flex", flexDirection: "column", gap: 12 }}>
          <CollateralSplitter
            marketAddr={marketAddr}
            collateralAddr={collateral}
            isResolved={resolved}
            onSplitSuccess={() => setBalanceRefreshSignal(value => value + 1)}
          />
          <TradingFormWrapper
            marketData={marketDataTuple}
            marketId={id}
            balanceRefreshSignal={balanceRefreshSignal}
          />
        </div>
      </div>
    </div>
  );
}

// Wrapper that imports TradingForm (avoids circular)
import TradingForm from "../components/TradingForm";

function MarketStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="market-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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

function TradingFormWrapper({
  marketData,
  marketId,
  balanceRefreshSignal,
}: {
  marketData: any;
  marketId: number;
  balanceRefreshSignal: number;
}) {
  return (
    <TradingForm
      marketData={marketData}
      marketId={marketId}
      initialSide="yes"
      balanceRefreshSignal={balanceRefreshSignal}
    />
  );
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
