import { type FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { erc20Abi } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ABIs } from "../abis";
import { decimalToUnits } from "../utils/tradingMath";
import { useTxToast } from "./TxToastContext";

interface CollateralSplitterProps {
  marketAddr: string;
  collateralAddr: string;
  isResolved: boolean;
  onSplitSuccess?: () => void;
}

export default function CollateralSplitter({
  marketAddr,
  collateralAddr,
  isResolved,
  onSplitSuccess,
}: CollateralSplitterProps) {
  const { showPending, showSuccess, showError } = useTxToast();
  const { address: user, isConnected } = useAccount();
  const [amountInput, setAmountInput] = useState("");

  const { data: collateralDecimalsRaw } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !!collateralAddr },
  });

  const collateralDecimals = Number(collateralDecimalsRaw ?? 18);
  const splitAmount = decimalToUnits(amountInput, collateralDecimals);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: collateralAddr as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [user as `0x${string}`, marketAddr as `0x${string}`],
    query: {
      enabled: isConnected && !!user && !!collateralAddr && !!marketAddr && splitAmount > 0n,
    },
  });

  const currentAllowance = (allowance as bigint | undefined) ?? 0n;
  const needsApproval = splitAmount > 0n && currentAllowance < splitAmount;

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract();
  const {
    isLoading: isApproving,
    isSuccess: approveSuccess,
    isError: approveError,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeSplit,
    data: splitHash,
    isPending: isSplitPending,
  } = useWriteContract();
  const {
    isLoading: isSplitting,
    isSuccess: splitSuccess,
    isError: splitError,
  } = useWaitForTransactionReceipt({ hash: splitHash });

  function splitCollateral() {
    if (splitAmount <= 0n) return;
    writeSplit({
      address: marketAddr as `0x${string}`,
      abi: ABIs.Market as any,
      functionName: "splitCollateral",
      args: [splitAmount],
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isConnected || isResolved || splitAmount <= 0n) return;

    if (needsApproval) {
      writeApprove({
        address: collateralAddr as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [marketAddr as `0x${string}`, splitAmount],
      });
      return;
    }

    splitCollateral();
  }

  useEffect(() => {
    if (approveHash && isApproving) showPending(approveHash, "Approve USDC");
  }, [approveHash, isApproving]);

  useEffect(() => {
    if (!approveHash || !approveSuccess) return;
    showSuccess("Approved", approveHash);
    refetchAllowance();
    splitCollateral();
  }, [approveHash, approveSuccess]);

  useEffect(() => {
    if (splitHash && isSplitting) showPending(splitHash, "Split Collateral");
  }, [splitHash, isSplitting]);

  useEffect(() => {
    if (!splitHash || !splitSuccess) return;
    showSuccess("Collateral Split", splitHash);
    setAmountInput("");
    refetchAllowance();
    onSplitSuccess?.();
  }, [splitHash, splitSuccess]);

  useEffect(() => {
    if (approveError) showError("Approve failed");
  }, [approveError]);

  useEffect(() => {
    if (splitError) showError("Split failed");
  }, [splitError]);

  const amountNumber = parseFloat(amountInput) || 0;
  const isBusy = isApprovePending || isApproving || isSplitPending || isSplitting;
  const disabled = !isConnected || isResolved || splitAmount <= 0n || isBusy;
  const buttonLabel = !isConnected
    ? "Connect Wallet"
    : isResolved
      ? "Resolved"
      : isBusy
        ? "Confirming"
        : needsApproval
          ? "Approve"
          : "Split";

  return (
    <form className="splitter-card" onSubmit={handleSubmit}>
      <div className="splitter-card-head">
        <div>
          <span>Inventory</span>
          <strong>Split Collateral</strong>
        </div>
        <div className="splitter-ratio">
          <span>1 USDC</span>
          <strong>1 YES + 1 NO</strong>
        </div>
      </div>

      <div className="splitter-input-row">
        <div className="splitter-input-wrap">
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amountInput}
            onChange={event => setAmountInput(event.target.value)}
            placeholder="0.00"
            disabled={isResolved}
            className="input splitter-input"
          />
          <span>USDC</span>
        </div>
        <button type="submit" disabled={disabled} className="splitter-button">
          {isBusy && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
          {buttonLabel}
        </button>
      </div>

      <div className="splitter-preview">
        <span>Output</span>
        <strong>
          {amountNumber > 0 ? `${amountNumber.toFixed(4)} YES + ${amountNumber.toFixed(4)} NO` : "-- YES + -- NO"}
        </strong>
      </div>
    </form>
  );
}
