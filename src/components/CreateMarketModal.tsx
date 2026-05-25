import React, { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { Loader2, X } from "lucide-react";
import { keccak256, encodeAbiParameters } from "viem";
import TxToast, { getExplorerUrl } from "./TxToast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const USDC_ADDRESS = CONTRACTS.Collateral;
const ORACLE_ADDRESS = CONTRACTS.SettlementManager;

function computeConditionId(title: string, oracle: string): string {
  const questionId = keccak256(new TextEncoder().encode(title));
  const outcomeSlotCount = 2n;
  const packed = encodeAbiParameters(
    [
      { type: "address" },
      { type: "bytes32" },
      { type: "uint256" },
    ],
    [oracle as `0x${string}`, questionId, outcomeSlotCount]
  );
  return keccak256(packed);
}

export default function CreateMarketModal({ isOpen, onClose }: Props) {
  const { isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [collateral, setCollateral] = useState(USDC_ADDRESS);
  const [fee, setFee] = useState("0");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Show toast on confirmed tx
  const [showToast, setShowToast] = useState(false);
  const [confirmedHash, setConfirmedHash] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (txHash && !isPending && !isConfirming && !done) {
      setConfirmedHash(txHash);
      setShowToast(true);
      setDone(true);
    }
  }, [txHash, isPending, isConfirming, done]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !title.trim()) return;
    setDone(false);

    try {
      const conditionId = computeConditionId(title, ORACLE_ADDRESS);

      writeContract({
        abi: ABIs.PredictionMarketFactory,
        address: CONTRACTS.PredictionMarketFactory,
        functionName: "createMarket",
        args: [collateral as `0x${string}`, conditionId as `0x${string}`, BigInt(fee)],
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClose = () => {
    setTitle("");
    setFee("0");
    setDone(false);
    setShowToast(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {showToast && (
        <TxToast
          txHash={confirmedHash}
          label="市场创建成功"
          explorerUrl={getExplorerUrl(confirmedHash, 84532)}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">创建预测市场</h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                问题描述 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如: 2024年美国总统大选结果"
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-medium"
              />
              <p className="mt-1 text-xs text-gray-500">清晰描述这个市场将要预测的事件</p>
            </div>

            {/* Collateral */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">抵押品地址</label>
              <input
                type="text"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500"
              />
              <p className="mt-1 text-xs text-gray-500">默认使用 USDC</p>
            </div>

            {/* Fee */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                费率 <span className="text-gray-600">(可选)</span>
              </label>
              <input
                type="number"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">设为 0 使用平台默认费率 (0.02%)</p>
            </div>

            {/* Condition ID Preview */}
            {title && (
              <div className="bg-gray-800/40 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">自动生成的条件 ID</p>
                <p className="text-xs font-mono text-violet-400 break-all">
                  {computeConditionId(title, ORACLE_ADDRESS)}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 rounded-lg p-3">
                {error.message?.slice(0, 100) ?? "创建市场失败"}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isConnected || isPending || isConfirming || !title.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isConfirming ? "区块链确认中..." : "钱包签名中..."}
                </>
              ) : !isConnected ? (
                "连接钱包"
              ) : (
                "创建市场"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}