import React, { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { ABIs } from "../abis";
import { parsePrice, parseAmount } from "../utils/format";
import { cn } from "../utils/format";
import { Loader2 } from "lucide-react";
import TxToast, { getExplorerUrl } from "./TxToast";

interface Props {
  marketId: number;
  marketData: readonly [
    string,  // collateral
    string,  // conditionTokens
    string,  // orderBook
    string,  // matchingEngine (market clone address)
    string,  // conditionId
    boolean, // resolved
    bigint,  // fee
  ];
  initialSide?: "yes" | "no";
  onSideChange?: (side: "yes" | "no") => void;
}

type TradeMode = "maker" | "taker";

export default function TradingForm({
  marketId,
  marketData,
  initialSide = "yes",
  onSideChange,
}: Props) {
  const { isConnected } = useAccount();
  const [side, setSide] = useState<"yes" | "no">(initialSide);
  const [mode, setMode] = useState<TradeMode>("maker");
  const [priceInput, setPriceInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastHash, setToastHash] = useState("");

  // Market clone address is at index [3] (matchingEngine in MarketData struct)
  const marketAddr = marketData[3] as string;

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSideChange = (s: "yes" | "no") => {
    setSide(s);
    onSideChange?.(s);
  };

  const price = parseFloat(priceInput) || 0;
  const amount = parseFloat(amountInput) || 0;
  const cost = price * amount;
  const isResolved = marketData[5];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    try {
      const parsedPrice = parsePrice(priceInput);
      const parsedAmount = parseAmount(amountInput);

      if (mode === "maker") {
        writeContract({
          abi: ABIs.Market,
          address: marketAddr as `0x${string}`,
          functionName: "placeOrder",
          args: [side === "yes", parsedPrice, parsedAmount],
        });
      } else {
        writeContract({
          abi: ABIs.Market,
          address: marketAddr as `0x${string}`,
          functionName: "fillOrder",
          args: [side === "yes", parsedPrice, parsedAmount],
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Show toast on confirmed tx
  useEffect(() => {
    if (txHash && !isPending && !isConfirming) {
      setToastHash(txHash);
      setShowToast(true);
    }
  }, [txHash, isPending, isConfirming]);

  return (
    <>
      {showToast && (
        <TxToast
          txHash={toastHash}
          label={`${side === "yes" ? "买入 YES" : "买入 NO"} 成功`}
          explorerUrl={getExplorerUrl(toastHash, 84532)}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="font-semibold">交易 #{marketId}</h3>
          <div className="text-xs text-gray-500 mt-0.5">
            抵押品: {(marketData[0] as string).slice(0, 10)}...
          </div>
        </div>

        {/* Side Toggle */}
        <div className="p-4 border-b border-gray-800">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800/60 rounded-lg">
            <button
              type="button"
              onClick={() => handleSideChange("yes")}
              className={cn(
                "py-2.5 rounded-md text-sm font-semibold transition",
                side === "yes"
                  ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                  : "text-gray-400 hover:text-white"
              )}
            >
              买入 YES
            </button>
            <button
              type="button"
              onClick={() => handleSideChange("no")}
              className={cn(
                "py-2.5 rounded-md text-sm font-semibold transition",
                side === "no"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-gray-400 hover:text-white"
              )}
            >
              买入 NO
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800/60 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("maker")}
              className={cn(
                "py-2 rounded-md text-xs font-semibold transition",
                mode === "maker"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Maker 限价
            </button>
            <button
              type="button"
              onClick={() => setMode("taker")}
              className={cn(
                "py-2 rounded-md text-xs font-semibold transition",
                mode === "taker"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Taker 吃单
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {mode === "maker" ? "下限价单等待成交" : "即时吃单立即成交"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Price */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              价格 <span className="text-gray-600">(0 - 1 USDC)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0.50"
                disabled={isResolved}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 disabled:opacity-50 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                USDC
              </span>
            </div>
            {/* Quick prices */}
            <div className="flex gap-1.5 mt-2">
              {[0.25, 0.5, 0.75].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriceInput(String(p))}
                  className="flex-1 text-xs py-1 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                >
                  {p * 100}%
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              数量 (CTF)
            </label>
            <input
              type="number"
              min="1"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="100"
              disabled={isResolved}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 disabled:opacity-50 font-mono"
            />
          </div>

          {/* Cost Preview */}
          {cost > 0 && (
            <div className="bg-gray-800/40 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>预估成本</span>
                <span className="font-mono">{cost.toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>预期获得</span>
                <span className="font-mono">{amountInput || "0"} CTF</span>
              </div>
              {mode === "taker" && (
                <div className="flex justify-between text-amber-400">
                  <span>立即成交</span>
                  <span className="text-xs">价格可能波动</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2">
              {error.message?.slice(0, 80) ?? "交易失败"}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              !isConnected ||
              isPending ||
              isConfirming ||
              isResolved ||
              !priceInput ||
              !amountInput
            }
            className={cn(
              "w-full py-3 rounded-xl font-semibold text-white transition flex items-center justify-center gap-2",
              side === "yes"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isConfirming ? "区块链确认中..." : "钱包签名中..."}
              </>
            ) : isResolved ? (
              "市场已结算"
            ) : !isConnected ? (
              "连接钱包"
            ) : (
              `${mode === "maker" ? "下" : "吃"}单买入 ${side.toUpperCase()}`
            )}
          </button>
        </form>
      </div>
    </>
  );
}