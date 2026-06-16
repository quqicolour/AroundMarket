import { useState, useRef, useEffect } from "react";

interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Props {
  width?: number;
  height?: number;
}

// Generate realistic mock candles
// Generate candles based on timeframe string
function genCandles(tf: TF, basePrice: number): Candle[] {
  const now = Date.now();
  const msMap: Record<TF, number> = { "1m": 60_000, "15m": 15 * 60_000, "1H": 3600_000, "4H": 4 * 3600_000, "24H": 24 * 3600_000, "1W": 7 * 24 * 3600_000 };
  const countMap: Record<TF, number> = { "1m": 60, "15m": 48, "1H": 60, "4H": 24, "24H": 48, "1W": 30 };
  const ms = msMap[tf];
  const count = countMap[tf];
  const candles: Candle[] = [];
  let price = basePrice;
  for (let i = count; i >= 0; i--) {
    const ts = now - i * ms;
    const open = price;
    const ch = (Math.random() - 0.47) * 0.012 * price;
    price = Math.max(0.001, Math.min(0.999, price + ch));
    const close = price;
    const high = Math.max(open, close) + Math.random() * 0.006 * price;
    const low = Math.min(open, close) - Math.random() * 0.006 * price;
    candles.push({ ts, open, high, low, close, volume: Math.random() * 100 });
  }
  return candles;
}

const TIMEFRAMES = ["1m", "15m", "1H", "4H", "24H", "1W"] as const;
type TF = typeof TIMEFRAMES[number];

export default function KLineChart({ width = 340, height = 200 }: Props) {
  const [tf, setTf] = useState<TF>("24H");
  const [candles, setCandles] = useState<Candle[]>(() => genCandles(tf, 0.58));
  const [tooltip, setTooltip] = useState<Candle | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Regenerate on timeframe change
  useEffect(() => {
    setCandles(genCandles(tf, 0.58));
    setSelectedIdx(null);
    setTooltip(null);
  }, [tf]);

  const priceMin = Math.min(...candles.map(c => c.low));
  const priceMax = Math.max(...candles.map(c => c.high));
  const priceRange = priceMax - priceMin || 0.001;

  const volMax = Math.max(...candles.map(c => c.volume ?? 1));

  const CHART_H = Math.floor(height * 0.72);
  const VOL_H = Math.floor(height * 0.18);
  const GAP = Math.floor(height * 0.04);
  const PAD_TOP = 8;
  const PAD_BOTTOM = 20;
  const PAD_LEFT = 8;
  const PAD_RIGHT = 8;

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const totalStep = plotW / Math.max(candles.length - 1, 1);

  function pxY(price: number, h = CHART_H) {
    return h - PAD_BOTTOM - ((price - priceMin) / priceRange) * plotH;
  }
  function pxX(i: number) {
    return PAD_LEFT + i * totalStep;
  }
  function pxVol(v: number) {
    return CHART_H + GAP + VOL_H - (v / (volMax || 1)) * VOL_H;
  }

  // Y-axis grid labels
  const gridPrices = Array.from({ length: 5 }, (_, i) => priceMin + (priceRange * i) / 4);

  // Crosshair snap
  function snapToCandle(mouseX: number): number {
    return Math.round((mouseX - PAD_LEFT) / totalStep);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = snapToCandle(mouseX);
    const clamped = Math.max(0, Math.min(candles.length - 1, idx));
    setSelectedIdx(clamped);
    setTooltip(candles[clamped]);
  }

  function handleMouseLeave() {
    setSelectedIdx(null);
    setTooltip(null);
  }

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const changePct = prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100 : 0;
  const isUp = changePct >= 0;

  // Format price display
  const lastPrice = lastCandle?.close ?? 0;
  const fmtPrice = (p: number) => p.toFixed(4);

  // Format axis time
  function fmtAxisTime(ts: number): string {
    const d = new Date(ts);
    if (tf === "1H") return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (tf === "4H" || tf === "24H") return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Volume bars
  const volBars = candles.map((c, i) => {
    const isGreen = c.close >= c.open;
    const barH = Math.max(2, ((c.volume ?? 0) / (volMax || 1)) * VOL_H);
    return { x: pxX(i) - totalStep / 2, y: pxVol(c.volume ?? 0), w: totalStep, h: barH, isGreen };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Top bar: price + change + timeframe selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 4px", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
            ${fmtPrice(lastPrice)}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600, fontSize: 12,
            color: isUp ? "var(--yes)" : "var(--no)",
          }}>
            {isUp ? "+" : ""}{changePct.toFixed(2)}%
          </span>
        </div>

        {/* Timeframe pills */}
        <div style={{ display: "flex", gap: 3 }}>
          {TIMEFRAMES.map(f => (
            <button
              key={f}
              onClick={() => setTf(f)}
              style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 100ms",
                background: tf === f ? "var(--primary)" : "var(--bg-elevated)",
                color: tf === f ? "white" : "var(--text-tertiary)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ position: "relative", userSelect: "none" }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", borderRadius: "0 0 12px 12px", background: "var(--bg-elevated)" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Price grid */}
          {gridPrices.map((p, i) => {
            const y = pxY(p);
            return (
              <g key={i}>
                <line x1={PAD_LEFT} y1={y} x2={width - PAD_RIGHT} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
                <text x={PAD_LEFT - 2} y={y + 3} textAnchor="end" fontSize={9} fill="var(--text-tertiary)" fontFamily="'JetBrains Mono',monospace">
                  {(p * 100).toFixed(2)}%
                </text>
              </g>
            );
          })}

          {/* Volume bars */}
          {volBars.map((v, i) => (
            <rect key={i} x={v.x + 1} y={v.y} width={Math.max(1, v.w - 2)} height={v.h} fill={v.isGreen ? "rgba(26,127,90,0.25)" : "rgba(201,98,111,0.25)"} rx={1} />
          ))}

          {/* Candlesticks */}
          {candles.map((c, i) => {
            const cx = pxX(i);
            const openY = pxY(c.open);
            const closeY = pxY(c.close);
            const highY = pxY(c.high);
            const lowY = pxY(c.low);
            const isGreen = c.close >= c.open;
            const col = isGreen ? "#1a7f5a" : "#c9626f";
            const bodyTop = Math.min(openY, closeY);
            const bodyH = Math.max(Math.abs(openY - closeY), 1);

            const isHighlighted = selectedIdx === i;

            return (
              <g key={i}>
                {/* wick */}
                <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={col} strokeWidth={1} />
                {/* body */}
                <rect
                  x={cx - totalStep / 2 + 1}
                  y={bodyTop}
                  width={Math.max(2, totalStep - 2)}
                  height={bodyH}
                  fill={col}
                  rx={1}
                  opacity={isHighlighted ? 1 : 0.85}
                />
                {/* highlighted outline */}
                {isHighlighted && (
                  <rect x={cx - totalStep / 2} y={bodyTop - 2} width={totalStep} height={bodyH + 4} fill="none" stroke={col} strokeWidth={1.5} rx={2} />
                )}
              </g>
            );
          })}

          {/* Crosshair */}
          {selectedIdx !== null && (
            <>
              <line x1={pxX(selectedIdx)} y1={PAD_TOP} x2={pxX(selectedIdx)} y2={CHART_H - PAD_BOTTOM} stroke="rgba(100,100,100,0.4)" strokeWidth={0.8} strokeDasharray="3,3" />
              {tooltip && (
                <>
                  <line x1={PAD_LEFT} y1={pxY(tooltip.close)} x2={width - PAD_RIGHT} y2={pxY(tooltip.close)} stroke="rgba(100,100,100,0.3)" strokeWidth={0.8} strokeDasharray="3,3" />
                </>
              )}
            </>
          )}

          {/* X-axis labels */}
          {[0, Math.floor(candles.length / 2), candles.length - 1].map((i, _) => (
            candles[i] ? (
              <text key={i} x={pxX(i)} y={CHART_H + VOL_H + GAP + 12} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)" fontFamily="'JetBrains Mono',monospace">
                {fmtAxisTime(candles[i].ts)}
              </text>
            ) : null
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && selectedIdx !== null && (
          <div style={{
            position: "absolute",
            left: Math.min(pxX(selectedIdx) + 8, width - 130),
            top: Math.max(pxY(tooltip.high) - 10, 4),
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--text-primary)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: 110,
          }}>
            <div style={{ color: "var(--text-tertiary)", marginBottom: 3 }}>{new Date(tooltip.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "var(--text-secondary)" }}>O</span><span>{tooltip.open.toFixed(4)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "var(--text-secondary)" }}>H</span><span style={{ color: "var(--yes)" }}>{tooltip.high.toFixed(4)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "var(--text-secondary)" }}>L</span><span style={{ color: "var(--no)" }}>{tooltip.low.toFixed(4)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "var(--text-secondary)" }}>C</span><span>{tooltip.close.toFixed(4)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export standalone chart for embedding anywhere
export { genCandles };
export type { Candle };