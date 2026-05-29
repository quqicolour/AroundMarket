import React, { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { Loader2 } from "lucide-react";
import { keccak256, encodeAbiParameters } from "viem";
import { useTxToast } from "./TxToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Default: market starts in 1 hour, ends in 7 days
function defaultStartTime(): string {
  const d = new Date(Date.now() + 3600_000);
  return d.toISOString().slice(0, 16);
}
function defaultEndTime(): string {
  const d = new Date(Date.now() + 7 * 86400_000);
  return d.toISOString().slice(0, 16);
}

export default function CreateMarketModal({ isOpen, onClose }: Props) {
  const { showPending, showSuccess, showError } = useTxToast();
  const { isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [collateral, setCollateral] = useState<string>(CONTRACTS.Collateral);
  const [fee, setFee] = useState("0");
  const [startTimeLocal, setStartTimeLocal] = useState(defaultStartTime());
  const [endTimeLocal, setEndTimeLocal] = useState(defaultEndTime());
  const [errorMsg, setErrorMsg] = useState("");

  const { writeContract, data: txHash, isPending: isSigning, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({ hash: txHash });

  const [lastHash, setLastHash] = useState<string | null>(null);

  React.useEffect(() => {
    if (!txHash) return;
    if (txHash !== lastHash) {
      setLastHash(txHash);
      showPending(txHash, "Signing...");
    }
  }, [txHash]);

  React.useEffect(() => {
    if (isConfirmed) {
      showSuccess("Market created!", txHash);
      setTimeout(() => {
        onClose();
        setTitle("");
        setFee("0");
        setStartTimeLocal(defaultStartTime());
        setEndTimeLocal(defaultEndTime());
        setErrorMsg("");
        setLastHash(null);
      }, 1200);
    }
  }, [isConfirmed]);

  React.useEffect(() => {
    if (isTxError) {
      const msg = "Transaction failed or was rejected.";
      setErrorMsg(msg);
      showError(msg);
      setLastHash(null);
    }
  }, [isTxError]);

  React.useEffect(() => {
    if (writeError) {
      const msg = (writeError as any)?.shortMessage || (writeError as any)?.message || "Transaction failed";
      setErrorMsg(msg);
      showError(msg);
    }
  }, [writeError]);

  const isWorking = isSigning || isConfirming;
  const conditionId = title ? computeConditionId(title) : null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !title) return;
    setErrorMsg("");

    const startTs = Math.floor(new Date(startTimeLocal).getTime() / 1000);
    const endTs = Math.floor(new Date(endTimeLocal).getTime() / 1000);

    if (endTs <= startTs) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    try {
      const conditionIdVal = computeConditionId(title);
      // _fee in basis points: 1 = 0.001%, 100 = 0.1%, 10000 = 100%
      const feeVal = BigInt(Math.floor(parseFloat(fee) * 100));
      writeContract({
        abi: ABIs.PredictionMarketFactory,
        address: CONTRACTS.PredictionMarketFactory,
        functionName: "createMarket",
        args: [
          collateral as `0x${string}`,
          conditionIdVal,
          feeVal,
          BigInt(startTs),
          BigInt(endTs),
        ],
      } as any);
    } catch (err: any) {
      const msg = err?.shortMessage ?? err?.message ?? "Failed to create market";
      setErrorMsg(msg);
      showError(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modalPanel} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <h2 style={modalTitle}>Create Market</h2>
            <p style={modalSub}>YES / NO binary market on arc testnet</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleCreate} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Market Question */}
          <div>
            <label style={fieldLabel}>Market Question *</label>
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Will BTC exceed $100,000 by end of 2025?"
              rows={3}
              className="input"
              style={{ resize: "none", fontSize: 14 }}
            />
          </div>

          {/* Condition ID preview */}
          {conditionId && (
            <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Condition ID (auto-computed)</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)", wordBreak: "break-all" }}>{conditionId}</div>
            </div>
          )}

          {/* Collateral */}
          <div>
            <label style={fieldLabel}>Collateral Token</label>
            <input
              type="text"
              value={collateral}
              onChange={e => setCollateral(e.target.value)}
              placeholder="0x..."
              className="input"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Fee */}
          <div>
            <label style={fieldLabel}>Fee (basis points) <span style={{ color: "var(--text-tertiary)" }}>— 100 = 1%</span></label>
            <input
              type="number"
              value={fee}
              onChange={e => setFee(e.target.value)}
              placeholder="0"
              className="input"
              style={{ fontSize: 14 }}
            />
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>1 = 0.001%, 100 = 0.1%, 10000 = 100%</p>
          </div>

          {/* Time range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Start Time</label>
              <input
                type="datetime-local"
                value={startTimeLocal}
                onChange={e => setStartTimeLocal(e.target.value)}
                className="input"
                style={{ fontSize: 13, colorScheme: "dark" }}
              />
            </div>
            <div>
              <label style={fieldLabel}>End Time</label>
              <input
                type="datetime-local"
                value={endTimeLocal}
                onChange={e => setEndTimeLocal(e.target.value)}
                className="input"
                style={{ fontSize: 13, colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Time quick picks */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "+1h", hours: 1 },
              { label: "+1d", hours: 24 },
              { label: "+3d", hours: 24 * 3 },
              { label: "+7d", hours: 24 * 7 },
              { label: "+1m", hours: 24 * 30 },
            ].map(pick => (
              <button
                key={pick.label}
                type="button"
                onClick={() => {
                  const start = new Date(startTimeLocal);
                  const end = new Date(start.getTime() + pick.hours * 3600_000);
                  setEndTimeLocal(end.toISOString().slice(0, 16));
                }}
                style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                End {pick.label}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div style={{
              fontSize: 12, color: "var(--no)", background: "var(--no-light)",
              border: "1px solid var(--no-border)", borderRadius: 10, padding: "10px 12px",
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-ghost" disabled={isWorking} style={{ flex: 1 }}>Cancel</button>
            <button
              type="submit"
              disabled={!isConnected || !title || isWorking}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 12, fontWeight: 700, fontSize: 14,
                background: "var(--primary)", color: "white", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: (!isConnected || !title || isWorking) ? 0.5 : 1,
              }}
            >
              {isWorking ? (
                <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> {isConfirming ? "Confirming..." : "Signing..."}</>
              ) : !isConnected ? "Connect Wallet" : "Create Market"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function computeConditionId(title: string): string {
  const questionId = keccak256(new TextEncoder().encode(title));
  const oracle = CONTRACTS.SettlementManager;
  const outcomeSlotCount = 2n;
  const packed = encodeAbiParameters(
    [{ type: "address" }, { type: "bytes32" }, { type: "uint256" }],
    [oracle as `0x${string}`, questionId, outcomeSlotCount]
  );
  return keccak256(packed);
}

const overlay: React.CSSProperties = {
  position: "fixed",
  top: 0, right: 0, bottom: 0, left: 0,
  zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16, background: "rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
};

const modalPanel = {
  background: "var(--bg-surface)", borderRadius: 24,
  width: "100%", maxWidth: 480, overflow: "hidden",
  boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
};

const modalHeader = {
  padding: "20px 24px", borderBottom: "1px solid var(--border)",
  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
};

const modalTitle = { fontSize: 18, fontWeight: 800, color: "var(--text-primary)" };
const modalSub = { fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 };

const closeBtn = {
  width: 32, height: 32, borderRadius: 8,
  background: "var(--bg-elevated)", border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14, color: "var(--text-tertiary)",
};

const fieldLabel = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--text-secondary)", marginBottom: 6,
};