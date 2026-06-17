import { useMemo, useRef, useState } from "react";
import {
  CandleInterval,
  SubgraphMarketCandle,
  useSubgraphMarketCandles,
} from "../utils/subgraph";

interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

interface Props {
  marketId: number;
  isYes?: boolean;
  width?: number;
  height?: number;
}

const TIMEFRAMES = [
  { label: "1m", interval: "ONE_MINUTE" },
  { label: "15m", interval: "FIFTEEN_MINUTES" },
  { label: "30m", interval: "THIRTY_MINUTES" },
  { label: "1H", interval: "ONE_HOUR" },
  { label: "4H", interval: "FOUR_HOURS" },
  { label: "12H", interval: "TWELVE_HOURS" },
  { label: "1D", interval: "ONE_DAY" },
] as const;

type TF = (typeof TIMEFRAMES)[number]["label"];

const intervalByLabel = TIMEFRAMES.reduce<Record<TF, CandleInterval>>((acc, item) => {
  acc[item.label] = item.interval;
  return acc;
}, {} as Record<TF, CandleInterval>);

function weiPriceToProbability(value: string): number {
  return Number(value) / 1e18;
}

function bigIntStringToNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCandle(candle: SubgraphMarketCandle): Candle {
  return {
    ts: Number(candle.periodStart) * 1000,
    open: weiPriceToProbability(candle.open),
    high: weiPriceToProbability(candle.high),
    low: weiPriceToProbability(candle.low),
    close: weiPriceToProbability(candle.close),
    volume: bigIntStringToNumber(candle.volume),
    tradeCount: bigIntStringToNumber(candle.tradeCount),
  };
}

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(2)}%`;
}

function formatAxisTime(ts: number, tf: TF): string {
  const d = new Date(ts);
  if (tf === "1m" || tf === "15m" || tf === "30m" || tf === "1H") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (tf === "4H" || tf === "12H") {
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function KLineChart({
  marketId,
  isYes = true,
  width = 340,
  height = 200,
}: Props) {
  const [tf, setTf] = useState<TF>("1H");
  const [tooltip, setTooltip] = useState<Candle | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interval = intervalByLabel[tf];

  const { data: rawCandles = [], isLoading, isError } = useSubgraphMarketCandles(
    marketId,
    interval,
    isYes,
  );

  const candles = useMemo(
    () => rawCandles.map(toCandle).filter((c) => c.high > 0 && c.low > 0),
    [rawCandles],
  );

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const changePct =
    lastCandle && prevCandle && prevCandle.close > 0
      ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
      : 0;
  const isUp = changePct >= 0;

  if (isLoading) {
    return (
      <ChartShell>
        <ChartTopBar
          tf={tf}
          setTf={setTf}
          priceLabel="Loading"
          changeLabel=""
          isUp
          sideLabel={isYes ? "YES" : "NO"}
        />
        <div style={{ height, borderRadius: "0 0 12px 12px", background: "var(--bg-elevated)", padding: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 18, marginBottom: 14, borderRadius: 6, background: "rgba(255,255,255,0.75)" }} />
          ))}
        </div>
      </ChartShell>
    );
  }

  if (isError || candles.length === 0) {
    return (
      <ChartShell>
        <ChartTopBar
          tf={tf}
          setTf={setTf}
          priceLabel="-"
          changeLabel=""
          isUp
          sideLabel={isYes ? "YES" : "NO"}
        />
        <div style={{
          minHeight: height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: "0 0 12px 12px",
          background: "var(--bg-elevated)",
          color: "var(--text-tertiary)",
          textAlign: "center",
          padding: 18,
        }}>
          <strong style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            {isError ? "K-line data unavailable" : "No K-line data yet"}
          </strong>
          <span style={{ fontSize: 12 }}>
            {isError ? "The subgraph returned an error or is still indexing." : "Candles will appear after matched trades are indexed."}
          </span>
        </div>
      </ChartShell>
    );
  }

  const priceMin = Math.min(...candles.map((c) => c.low));
  const priceMax = Math.max(...candles.map((c) => c.high));
  const priceRange = priceMax - priceMin || 0.001;
  const volMax = Math.max(...candles.map((c) => c.volume || c.tradeCount || 1));

  const chartH = Math.floor(height * 0.72);
  const volH = Math.floor(height * 0.18);
  const gap = Math.floor(height * 0.04);
  const padTop = 8;
  const padBottom = 20;
  const padLeft = 8;
  const padRight = 8;

  const plotW = width - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const totalStep = plotW / Math.max(candles.length - 1, 1);

  function pxY(price: number): number {
    return chartH - padBottom - ((price - priceMin) / priceRange) * plotH;
  }

  function pxX(i: number): number {
    return padLeft + i * totalStep;
  }

  function pxVol(v: number): number {
    return chartH + gap + volH - (v / (volMax || 1)) * volH;
  }

  function snapToCandle(mouseX: number): number {
    return Math.round((mouseX - padLeft) / totalStep);
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

  const gridPrices = Array.from(
    { length: 5 },
    (_, i) => priceMin + (priceRange * i) / 4,
  );

  const volBars = candles.map((c, i) => {
    const isGreen = c.close >= c.open;
    const volume = c.volume || c.tradeCount;
    const barH = Math.max(2, (volume / (volMax || 1)) * volH);
    return { x: pxX(i) - totalStep / 2, y: pxVol(volume), w: totalStep, h: barH, isGreen };
  });

  return (
    <ChartShell>
      <ChartTopBar
        tf={tf}
        setTf={setTf}
        priceLabel={formatPrice(lastCandle.close)}
        changeLabel={`${isUp ? "+" : ""}${changePct.toFixed(2)}%`}
        isUp={isUp}
        sideLabel={isYes ? "YES" : "NO"}
      />

      <div style={{ position: "relative", userSelect: "none" }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", borderRadius: "0 0 12px 12px", background: "var(--bg-elevated)" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {gridPrices.map((p, i) => {
            const y = pxY(p);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
                <text x={padLeft - 2} y={y + 3} textAnchor="end" fontSize={9} fill="var(--text-tertiary)" fontFamily="'JetBrains Mono',monospace">
                  {formatPrice(p)}
                </text>
              </g>
            );
          })}

          {volBars.map((v, i) => (
            <rect key={i} x={v.x + 1} y={v.y} width={Math.max(1, v.w - 2)} height={v.h} fill={v.isGreen ? "rgba(26,127,90,0.25)" : "rgba(201,98,111,0.25)"} rx={1} />
          ))}

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
              <g key={`${c.ts}-${i}`}>
                <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={col} strokeWidth={1} />
                <rect
                  x={cx - totalStep / 2 + 1}
                  y={bodyTop}
                  width={Math.max(2, totalStep - 2)}
                  height={bodyH}
                  fill={col}
                  rx={1}
                  opacity={isHighlighted ? 1 : 0.85}
                />
                {isHighlighted && (
                  <rect x={cx - totalStep / 2} y={bodyTop - 2} width={totalStep} height={bodyH + 4} fill="none" stroke={col} strokeWidth={1.5} rx={2} />
                )}
              </g>
            );
          })}

          {selectedIdx !== null && (
            <>
              <line x1={pxX(selectedIdx)} y1={padTop} x2={pxX(selectedIdx)} y2={chartH - padBottom} stroke="rgba(100,100,100,0.4)" strokeWidth={0.8} strokeDasharray="3,3" />
              {tooltip && (
                <line x1={padLeft} y1={pxY(tooltip.close)} x2={width - padRight} y2={pxY(tooltip.close)} stroke="rgba(100,100,100,0.3)" strokeWidth={0.8} strokeDasharray="3,3" />
              )}
            </>
          )}

          {[0, Math.floor(candles.length / 2), candles.length - 1].map((i) => (
            candles[i] ? (
              <text key={i} x={pxX(i)} y={chartH + volH + gap + 12} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)" fontFamily="'JetBrains Mono',monospace">
                {formatAxisTime(candles[i].ts, tf)}
              </text>
            ) : null
          ))}
        </svg>

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
            minWidth: 120,
          }}>
            <div style={{ color: "var(--text-tertiary)", marginBottom: 3 }}>
              {new Date(tooltip.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
            <TooltipRow label="O" value={formatPrice(tooltip.open)} />
            <TooltipRow label="H" value={formatPrice(tooltip.high)} tone="yes" />
            <TooltipRow label="L" value={formatPrice(tooltip.low)} tone="no" />
            <TooltipRow label="C" value={formatPrice(tooltip.close)} />
            <TooltipRow label="Trades" value={tooltip.tradeCount.toFixed(0)} />
          </div>
        )}
      </div>
    </ChartShell>
  );
}

function ChartShell({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>{children}</div>;
}

function ChartTopBar({
  tf,
  setTf,
  priceLabel,
  changeLabel,
  isUp,
  sideLabel,
}: {
  tf: TF;
  setTf: (tf: TF) => void;
  priceLabel: string;
  changeLabel: string;
  isUp: boolean;
  sideLabel: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 4px", flexWrap: "wrap", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
          {priceLabel}
        </span>
        {changeLabel && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            fontSize: 12,
            color: isUp ? "var(--yes)" : "var(--no)",
          }}>
            {changeLabel}
          </span>
        )}
        <span style={{ fontSize: 11, fontWeight: 800, color: sideLabel === "YES" ? "var(--yes)" : "var(--no)" }}>
          {sideLabel}
        </span>
      </div>

      <div style={{ display: "flex", gap: 3 }}>
        {TIMEFRAMES.map((f) => (
          <button
            key={f.label}
            onClick={() => setTf(f.label)}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 100ms",
              background: tf === f.label ? "var(--primary)" : "var(--bg-elevated)",
              color: tf === f.label ? "white" : "var(--text-tertiary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "yes" | "no";
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ color: tone === "yes" ? "var(--yes)" : tone === "no" ? "var(--no)" : "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

export type { Candle };
