import React, { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "../config/contracts";
import MarketABI from "../abis/Market.json";
import { parsePrice, parseAmount } from "../utils/format";
import { toast } from "react-hot-toast";
import { Loader2, X } from "lucide-react";

interface Props {
  marketId: number;
  marketData: readonly [
    string,
    string,
    string,
    string,
    string,
    boolean,
    bigint,
  ];
  onClose: () => void;
}

export default function TradingPanel({ marketId, marketData, onClose }: Props) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [priceInput, setPriceInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [action, setAction] = useState<"buy" | "sell">("buy");

  const marketAddress = marketData[3]; // matchingEngine 实际是 market 地址，但 factory 返回 [collateral, conditionTokens, orderBook, matchingEngine, conditionId, resolved, fee]
  // 重新确认：markets 返回 (collateral, conditionTokens, orderBook, matchingEngine, conditionId, resolved, fee)
  // marketAddress 应该是 orderBook? 不对，我们需要 market 合约地址来交易
  // 根据 Market.sol，market 有 collateral/conditionId/fee/orderBook/matchingEngine/conditionalTokens/factory
  // 从 factory.getMarket 返回的是 (collateral, conditionTokens, orderBook, matchingEngine, conditionId, resolved, fee)
  // 这实际上是 MarketData struct，但 orderBook 是市场自己的 orderBook，不是 factory 的

  const { data: marketAddr } = useWriteContract();

  // PlaceOrder: placeOrder(bool isYes, uint128 price, uint128 amount) => uint64 orderId
  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const price = parsePrice(priceInput);
      const amount = parseAmount(amountInput);

      if (action === "buy") {
        writeContract({
          abi: MarketABI.abi,
          address: marketAddress as `0x${string}`,
          functionName: "placeOrder",
          args: [side === "yes", price, amount],
        });
        toast.success("订单已提交！");
      }
    } catch (err: any) {
      toast.error(err.message ?? "下单失败");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold">交易 #{marketId}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Market Info */}
        <div className="px-5 py-3 bg-gray-800/50 text-sm text-gray-400">
          抵押品: {marketData[0]}
        </div>

        {/* Trading Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Side Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSide("yes")}
              className={`py-2 rounded-md text-sm font-medium transition ${
                side === "yes"
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => setSide("no")}
              className={`py-2 rounded-md text-sm font-medium transition ${
                side === "no"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              NO
            </button>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              价格 (0-1)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.50"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">数量</label>
            <input
              type="number"
              min="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="100"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Cost Preview */}
          {priceInput && amountInput && (
            <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>成本</span>
                <span>
                  {(
                    (parseFloat(priceInput) || 0) *
                    (parseFloat(amountInput) || 0)
                  ).toFixed(4)}{" "}
                  USDC
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isConfirming ? "确认中..." : "签名中..."}
              </>
            ) : (
              `买入 ${side.toUpperCase()}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
