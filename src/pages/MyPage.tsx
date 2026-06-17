import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import MyPositions from "../components/MyPositions";
import { Loader2 } from "lucide-react";
import { useSubgraphAllUserOrders, useSubgraphMarkets } from "../utils/subgraph";

interface MarketSummary {
 marketId: number;
 marketAddr: string;
 collateral: string;
 conditionId: string;
 resolved: boolean;
}

export default function MyPage() {
 const { isConnected } = useAccount();
 const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");

 if (!isConnected) {
 return (
 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight:300, gap:16 }}>
 <div style={{ fontSize:40, opacity:0.3 }}>👛</div>
 <div style={{ textAlign: "center" }}>
 <p style={{ fontWeight:600, color: "var(--text-secondary)" }}>Connect Wallet</p>
 <p style={{ fontSize:13, color: "var(--text-tertiary)", marginTop:6 }}>
 Connect your wallet to view positions and orders
 </p>
 </div>
 </div>
 );
 }

 return (
 <div style={{ display: "flex", flexDirection: "column", gap:20 }}>
 <div>
 <h1 className="font-display" style={{ fontSize:26, fontWeight:600, color: "var(--text-primary)" }}>My Portfolio</h1>
 <p style={{ fontSize:13, color: "var(--text-tertiary)", marginTop:4 }}>Positions, orders, and history</p>
 </div>

 <div style={{ display: "flex", gap:8 }}>
 {(["positions", "orders"] as const).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 style={{
 padding: "8px18px", borderRadius:10, fontSize:13, fontWeight:600,
 border: "none", cursor: "pointer", transition: "all150ms",
 background: activeTab === tab ? "var(--primary)" : "var(--bg-surface)",
 color: activeTab === tab ? "white" : "var(--text-secondary)",
 boxShadow: activeTab === tab ? "02px8px rgba(26,127,90,0.2)" : "none",
 borderWidth:1, borderStyle: "solid",
 borderColor: activeTab === tab ? "var(--primary)" : "var(--border)",
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
 <div className="flex items-center justify-center py-12">
 <Loader2 size={20} className="animate-spin text-gray-400" />
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
 <div className="flex items-center justify-center py-12">
 <Loader2 size={20} className="animate-spin text-gray-400" />
 </div>
 );
 }

 if (orders.length ===0) {
 return (
 <div className="card" style={{ padding:24 }}>
 <h2 style={{ fontSize:16, fontWeight:600, color: "var(--text-primary)", marginBottom:20 }}>My Orders</h2>
 <div style={{ textAlign: "center", padding: "40px0", color: "var(--text-tertiary)", fontSize:14 }}>
 No active orders — place an order in a market
 </div>
 </div>
 );
 }

 return (
 <div className="card" style={{ padding:24 }}>
 <h2 style={{ fontSize:16, fontWeight:600, color: "var(--text-primary)", marginBottom:8 }}>My Orders</h2>
 <p style={{ fontSize:13, color: "var(--text-tertiary)", marginBottom:20 }}>
 Your limit orders indexed from The Graph.
 </p>
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap:8 }}>
 {orders.slice(0, 24).map(order => (
 <Link
 key={order.id}
 to={`/market/${order.marketId}`}
 className="btn-ghost"
 style={{
 fontSize:13,
 padding: "10px14px",
 borderRadius:10,
 border: "1px solid var(--border)",
 background: "var(--bg-elevated)",
 color: "var(--text-primary)",
 textDecoration: "none",
 display: "flex",
 justifyContent: "space-between",
 alignItems: "center",
 }}
 >
 <span>Market #{order.marketId}</span>
 <span style={{ color: "var(--text-tertiary)" }}>{order.status}</span>
 </Link>
 ))}
 </div>
 </div>
 );
}
