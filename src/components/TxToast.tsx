import React, { useEffect } from "react";
import { ExternalLink } from "lucide-react";

interface TxToastProps {
  txHash: string;
  label?: string;
  onClose: () => void;
  explorerUrl?: string;
  chainId?: number;
}

const EXPLORER_BASE: Record<number, string> = {
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
  1: "https://etherscan.io",
};

export function getExplorerUrl(txHash: string, chainId: number = 84532): string {
  const base = EXPLORER_BASE[chainId] ?? EXPLORER_BASE[84532];
  return `${base}/tx/${txHash}`;
}

export default function TxToast({ txHash, label = "交易成功", onClose, explorerUrl }: TxToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const url = explorerUrl ?? getExplorerUrl(txHash);

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className="bg-gray-900 border border-emerald-800/40 rounded-xl shadow-2xl p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{label}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-gray-500 font-mono truncate max-w-[160px]">
                {txHash}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition flex-shrink-0"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}