import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import { Loader2, Receipt } from "lucide-react";
import MyPositions from "../components/MyPositions";
import { useSubgraphAllUserOrders, useSubgraphMarkets } from "../utils/subgraph";

interface MarketSummary {
  marketId: number;
  marketAddr: string;
  collateral: string;
  conditionId: string;
  resolved: boolean;
}

type Tab = "positions" | "orders";

export default function MyPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("positions");

  if (!isConnected) {
    return (
      <div className="page-container">
        <div className="empty-block" style={{ minHeight: 320 }}>
          <span className="empty-icon" style={{ fontSize: 40 }}>👛</span>
          <p className="empty-title">Connect Wallet</p>
          <p className="empty-desc">Connect your wallet to view positions and orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>My Portfolio</h1>
          <p>Positions, orders, and redeemable winnings across all markets.</p>
        </div>
      </div>

      <div className="segmented" style={{ maxWidth: 320 }}>
        {(["positions", "orders"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`seg-item ${activeTab === tab ? "active" : ""}`}
            style={{ height: 38 }}
          >
            {tab === "positions" ? "Positions" : "Orders"}
          </button>
        ))}
      </div>

      {activeTab === "positions" ? <PositionsSection /> : <OrdersSection />}
    </div>
  );
}

function PositionsSection() {
  const { data: marketsRaw = [], isLoading } = useSubgraphMarkets();

  const markets = useMemo<MarketSummary[]>(() => {
    return marketsRaw.map((market) => ({
      marketId: Number(market.marketId),
      marketAddr: market.market,
      collateral: market.collateral,
      conditionId: market.conditionId,
      resolved: market.resolved,
    }));
  }, [marketsRaw]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--text-tertiary)" }} aria-hidden="true" />
      </div>
    );
  }

  return <MyPositions markets={markets} />;
}

function OrdersSection() {
  const { address } = useAccount();
  const { data: orders = [], isLoading } = useSubgraphAllUserOrders(address);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--text-tertiary)" }} aria-hidden="true" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="list-card-head">
          <h3><Receipt size={14} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 6 }} />My Orders</h3>
        </div>
        <div className="empty-block" style={{ padding: 48 }}>
          <span className="empty-icon">📭</span>
          <p className="empty-title">No active orders</p>
          <p className="empty-desc">Place an order in a market to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="list-card-head">
        <h3><Receipt size={14} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 6 }} />My Orders</h3>
        <span className="meta">{orders.length} total</span>
      </div>
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {orders.slice(0, 24).map((order) => (
          <Link
            key={order.id}
            to={`/market/${order.marketId}`}
            className="info-tile-link"
          >
            <span className="info-label">Market #{order.marketId}</span>
            <span className="info-value">{order.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
