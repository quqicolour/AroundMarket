import { useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { CONDITIONAL_TOKENS_POSITION_ABI, ERC20_BALANCE_ABI, ERC20_DECIMALS_ABI } from "../config/contractAbis";
import { useTxToast } from "./TxToastContext";
import { Loader2, Download, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAmount } from "../utils/format";

interface MarketSummary {
  marketId: number;
  marketAddr: string;
  collateral: string;
  conditionId: string;
  resolved: boolean;
}

interface Props {
  markets: MarketSummary[];
}

// ConditionalTokens positionId 计算约定（CTF 标准）：
// positionId = getPositionId(collateralToken, collectionId)
// collectionId = bytes32(keccak256(parentCollectionId, conditionId, indexSet))
// indexSet =1 << outcomeIndex (outcome0=1, outcome1=2)
//简化：直接用 CTF提供的 balanceOf 重载 (holder, conditionId, outcomeIndex)，
// 不需要自己算 positionId。
export default function MyPositions({ markets }: Props) {
  const { address, isConnected } = useAccount();
  const { showPending, showSuccess, showError } = useTxToast();

  const usdcBalance = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.Collateral as `0x${string}`,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      },
      {
        address: CONTRACTS.Collateral as `0x${string}`,
        abi: ERC20_DECIMALS_ABI,
        functionName: "decimals",
      },
    ],
    query: { enabled: !!address },
  });

  const perMarketCalls: any[] = markets.flatMap((m) => [
    {
      address: CONTRACTS.ConditionalTokens as `0x${string}`,
      abi: CONDITIONAL_TOKENS_POSITION_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`, m.conditionId as `0x${string}`, 0n],
    },
    {
      address: CONTRACTS.ConditionalTokens as `0x${string}`,
      abi: CONDITIONAL_TOKENS_POSITION_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`, m.conditionId as `0x${string}`, 1n],
    },
    {
      address: CONTRACTS.SettlementManager as `0x${string}`,
      abi: ABIs.SettlementManager,
      functionName: "computePayout",
      args: [address as `0x${string}`, BigInt(m.marketId)],
    },
    {
      address: m.collateral as `0x${string}`,
      abi: ERC20_DECIMALS_ABI,
      functionName: "decimals",
    },
  ]);

  const positionsRead = useReadContracts({
    contracts: perMarketCalls as any,
    query: { enabled: !!address && markets.length > 0 },
  });

  const { writeContract: writeRedeem, data: redeemTxHash, isPending: redeemPending } = useWriteContract();
  const { isLoading: redeemConfirming, isSuccess: redeemSuccess, isError: redeemError } = useWaitForTransactionReceipt({ hash: redeemTxHash });

  useEffect(() => {
    if (redeemTxHash && redeemConfirming) showPending(redeemTxHash, "Redeem winnings");
  }, [redeemTxHash, redeemConfirming]);

  useEffect(() => {
    if (!redeemTxHash || !redeemSuccess) return;
    showSuccess("Redeemed", redeemTxHash);
    positionsRead.refetch();
    usdcBalance.refetch();
  }, [redeemTxHash, redeemSuccess]);

  useEffect(() => {
    if (redeemTxHash && redeemError) showError("Redeem failed");
  }, [redeemTxHash, redeemError]);

  const handleRedeem = (marketId: number) => {
    if (!address) return;
    writeRedeem({
      address: CONTRACTS.SettlementManager as `0x${string}`,
      abi: ABIs.SettlementManager,
      functionName: "redeemForUser",
      args: [address as `0x${string}`, BigInt(marketId)],
    });
  };

  if (!isConnected) {
    return (
      <div className="empty-block" style={{ padding: 56 }}>
        <span className="empty-icon">👛</span>
        <p className="empty-title">Connect wallet</p>
        <p className="empty-desc">Connect to view positions and redeem winnings.</p>
      </div>
    );
  }

  const usdcAmt = (usdcBalance.data?.[0]?.result as bigint | undefined) ?? 0n;
  const collateralDecimals = Number((usdcBalance.data?.[1]?.result as number | undefined) ?? 18);
  const usdcDisplay = formatAmount(usdcAmt, collateralDecimals);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="portfolio-balance-card">
        <div className="portfolio-balance-label">
          <Wallet size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>USDC Balance</span>
        </div>
        <div className="portfolio-balance-value">{usdcDisplay} USDC</div>
      </div>

      {markets.length === 0 ? (
        <div className="empty-block" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 48 }}>
          <p className="empty-desc">No markets available</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {markets.map((m, i) => {
            const yesBal = (positionsRead.data?.[i * 4]?.result as bigint | undefined) ?? 0n;
            const noBal = (positionsRead.data?.[i * 4 + 1]?.result as bigint | undefined) ?? 0n;
            const payout = (positionsRead.data?.[i * 4 + 2]?.result as bigint | undefined) ?? 0n;
            const marketCollateralDecimals = Number((positionsRead.data?.[i * 4 + 3]?.result as number | undefined) ?? 18);
            const yesDisplay = Number(yesBal) / 1e18;
            const noDisplay = Number(noBal) / 1e18;
            const payoutDisplay = formatAmount(payout, marketCollateralDecimals);
            const isLoading = positionsRead.isLoading;
            const hasPosition = yesBal > 0n || noBal > 0n;
            const canRedeem = m.resolved && payout > 0n;

            if (!hasPosition && !canRedeem) return null;

            return (
              <div key={m.marketId} className="portfolio-card">
                <div className="portfolio-card-head">
                  <Link to={`/market/${m.marketId}`}>
                    Market #{m.marketId}
                  </Link>
                  {m.resolved && <span className="chip chip-neutral">Resolved</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="position-tile yes">
                    <span className="label">YES</span>
                    <span className="value">{isLoading ? "…" : yesDisplay.toFixed(2)}</span>
                  </div>
                  <div className="position-tile no">
                    <span className="label">NO</span>
                    <span className="value">{isLoading ? "…" : noDisplay.toFixed(2)}</span>
                  </div>
                </div>
                {canRedeem && (
                  <button
                    type="button"
                    onClick={() => handleRedeem(m.marketId)}
                    disabled={redeemPending || redeemConfirming}
                    className="btn btn-yes btn-block"
                  >
                    {redeemPending || redeemConfirming ? (
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" />
                    ) : (
                      <Download size={14} strokeWidth={2.2} aria-hidden="true" />
                    )}
                    Redeem {payoutDisplay} USDC
                  </button>
                )}
              </div>
            );
          })}
          {markets.every((_, i) => {
            const yesBal = (positionsRead.data?.[i * 4]?.result as bigint | undefined) ?? 0n;
            const noBal = (positionsRead.data?.[i * 4 + 1]?.result as bigint | undefined) ?? 0n;
            const payout = (positionsRead.data?.[i * 4 + 2]?.result as bigint | undefined) ?? 0n;
            return yesBal === 0n && noBal === 0n && payout === 0n;
          }) && !positionsRead.isLoading && (
            <div className="empty-block" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 48 }}>
              <span className="empty-icon">📈</span>
              <p className="empty-title">No positions yet</p>
              <p className="empty-desc">Trade to acquire YES / NO shares.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
