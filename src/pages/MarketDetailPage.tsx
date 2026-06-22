import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronDown, ExternalLink } from "lucide-react";
import { formatAddress } from "../utils/format";
import KLineChart from "../components/KLineChart";
import OrderBookView from "../components/OrderBookView";
import RecentTrades from "../components/RecentTrades";
import MyOrders from "../components/MyOrders";
import CollateralSplitter from "../components/CollateralSplitter";
import TradingForm from "../components/TradingForm";
import { getMarketTimingStatus, useUnixNow } from "../utils/marketTime";
import { marketToTuple, useSubgraphMarket } from "../utils/subgraph";

type TabType = "chart" | "orderbook" | "myorders";

const EXPLORER_BASE = "https://testnet.arcscan.app";
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
      <NotFound id={id} />
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
    return <NotFound id={id} />;
  }

  const marketDataTuple: any = marketToTuple(marketData);
  const timing = getMarketTimingStatus(startTime, endTime, resolved, nowTime);

  const tabs: { key: TabType; label: string }[] = [
    { key: "chart", label: "Chart" },
    { key: "orderbook", label: "Order Book" },
    { key: "myorders", label: "My Orders" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Link to="/" className="back-link">
        <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
        Back to Markets
      </Link>

      <div className="market-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <section className="detail-hero">
            <div className="detail-hero-meta">
              <span className="chip chip-mono">#{id}</span>
              <span className={`chip ${timing.kind === "active" ? "chip-yes" : timing.kind === "awaiting" ? "chip-warning" : "chip-neutral"}`}>
                <span className={`status-dot ${timing.kind === "active" ? "live" : ""}`} aria-hidden="true" />
                {timing.statusLabel}
              </span>
              <span className="eyebrow" style={{ color: "var(--text-tertiary)" }}>{timing.settlementLabel}</span>
              {fee > 0 && <span className="chip chip-neutral">Fee {(fee / 1e6 * 100).toFixed(2)}%</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h1 className="detail-hero-title">{question}</h1>
              <p className="detail-hero-desc">{dataSource}</p>
            </div>

            <div className="detail-hero-creator">
              <span>Creator</span>
              <a href={explorerUrl("address", creator)} target="_blank" rel="noreferrer">
                {formatAddress(creator, 5)}
              </a>
            </div>

            <div className="detail-hero-stats">
              <div className="stat-tile">
                <span className="stat-label">Trades</span>
                <span className="stat-value">{tradeCount}</span>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Volume</span>
                <span className="stat-value">{volume}</span>
              </div>
              <div className="stat-tile stat-tile-time">
                <span className="stat-label">Ends in</span>
                <span className="stat-value">{timing.countdownLabel}</span>
                <small style={{ color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.25 }}>{expiryTimeLabel}</small>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAddrExpanded((v) => !v)}
              aria-expanded={addrExpanded}
              className="collapsible-trigger"
            >
              <span>Contract Addresses</span>
              <ChevronDown size={14} className="chev" aria-hidden="true" />
            </button>

            {addrExpanded && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                <InfoTileLink label="Market" value={formatAddress(marketAddr, 5)} address={marketAddr} />
                <InfoTileLink label="Order Book" value={formatAddress(orderBookAddr, 5)} address={orderBookAddr} />
                <InfoTileLink label="Collateral" value={formatAddress(collateral, 5)} address={collateral} />
                <InfoTileLink label="Condition Tokens" value={formatAddress(conditionAddr, 5)} address={conditionAddr} />
                <InfoTileLink label="Matching Engine" value={formatAddress(matchingEngineAddr, 5)} address={matchingEngineAddr} />
                <InfoTileLink label="Condition ID" value={formatAddress(conditionId, 5)} address={conditionId} />
              </div>
            )}
          </section>

          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            <div role="tablist" className="segmented underlined" style={{ borderRadius: 0, padding: "0 12px" }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`seg-item ${activeTab === tab.key ? "active" : ""}`}
                  style={{ flex: 1 }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div>
              {activeTab === "chart" && (
                <KLineChart marketId={id} isYes width={760} height={380} />
              )}
              {activeTab === "orderbook" && (
                <div style={{ padding: 16 }}>
                  <OrderBookView marketId={id} collateralAddr={collateral} />
                </div>
              )}
              {activeTab === "myorders" && (
                <div style={{ padding: 16 }}>
                  <MyOrders marketAddr={marketAddr} marketId={id} collateralAddr={collateral} />
                </div>
              )}
            </div>
          </div>

          <RecentTrades marketId={id} matchingEngineAddr={matchingEngineAddr} collateralAddr={collateral} />
        </div>

        <div className="trade-rail">
          <CollateralSplitter
            marketAddr={marketAddr}
            collateralAddr={collateral}
            isResolved={resolved}
            onSplitSuccess={() => setBalanceRefreshSignal((value) => value + 1)}
          />
          <TradingForm
            marketData={marketDataTuple}
            marketId={id}
            initialSide="yes"
            balanceRefreshSignal={balanceRefreshSignal}
          />
        </div>
      </div>
    </div>
  );
}

function NotFound({ id }: { id: number }) {
  return (
    <div className="empty-block" style={{ minHeight: 300 }}>
      <span className="empty-icon">🔍</span>
      <p className="empty-title">Market #{id} Not Found</p>
      <p className="empty-desc">This market may not exist or has been removed.</p>
      <Link to="/" className="btn btn-soft btn-sm" style={{ marginTop: 12 }}>
        <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
        Back to Markets
      </Link>
    </div>
  );
}

function InfoTileLink({ label, value, address }: { label: string; value: string; address: string }) {
  return (
    <a href={explorerUrl("address", address)} target="_blank" rel="noopener noreferrer" className="info-tile-link">
      <span className="info-label">
        {label}
        <ExternalLink size={10} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="info-value">{value}</span>
    </a>
  );
}

function MarketDetailSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: 24 }}>
        <div className="skeleton" style={{ width: 80, height: 16, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "60%", height: 24, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: "80%", height: 14, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 78, borderRadius: 12 }} />
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 48, borderBottom: "1px solid var(--border)" }} />
        <div className="skeleton" style={{ height: 380, margin: 16, borderRadius: 12 }} />
      </div>
    </div>
  );
}
