import { useMemo, useState } from "react";
import { useAccount, useReadContracts, useReadContract } from "wagmi";
import { Link } from "react-router-dom";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import MyPositions from "../components/MyPositions";
import { Loader2 } from "lucide-react";

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
 const { data: countRaw } = useReadContract({
 abi: ABIs.PredictionMarketFactory,
 address: CONTRACTS.PredictionMarketFactory,
 functionName: "getMarketCount",
 });
 const count = Number(countRaw ??0n);

 // 获取每个 market 的元数据
 const marketCalls: any[] = Array.from({ length: count }, (_, i) => ({
 address: CONTRACTS.PredictionMarketFactory as `0x${string}`,
 abi: ABIs.PredictionMarketFactory,
 functionName: "getMarket",
 args: [BigInt(i +1)],
 }));

 const { data: marketsRaw, isLoading } = useReadContracts({
 contracts: marketCalls,
 query: { enabled: count >0 },
 });

 const markets = useMemo<MarketSummary[]>(() => {
 if (!marketsRaw) return [];
 return marketsRaw
 .map((r, i) => {
 const data = r.result as any;
 if (!data) return null;
 const orderBook = Array.isArray(data) ? data[4] : data.orderBook;
 if (!orderBook || orderBook === "0x0000000000000000000000000000000000000000") return null;
  return {
  marketId: i +1,
  marketAddr: (Array.isArray(data) ? data[1] : data.market) as string,
  collateral: (Array.isArray(data) ? data[2] : data.collateral) as string,
  conditionId: (Array.isArray(data) ? data[6] : data.conditionId) as string,
  resolved: (Array.isArray(data) ? data[9] : data.resolved) as boolean,
  };
 })
 .filter((x): x is MarketSummary => x !== null);
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
 const { data: countRaw } = useReadContract({
 abi: ABIs.PredictionMarketFactory,
 address: CONTRACTS.PredictionMarketFactory,
 functionName: "getMarketCount",
 });
 const count = Number(countRaw ??0n);

 if (count ===0) {
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
 Open a market to view and cancel your orders there.
 </p>
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap:8 }}>
 {Array.from({ length: count }, (_, i) => i +1).slice(-12).reverse().map(id => (
 <Link
 key={id}
 to={`/market/${id}`}
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
 <span>Market #{id}</span>
 <span style={{ color: "var(--text-tertiary)" }}>→</span>
 </Link>
 ))}
 </div>
 </div>
 );
}
