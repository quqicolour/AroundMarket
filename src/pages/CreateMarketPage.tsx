import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { encodeAbiParameters, keccak256 } from "viem";
import { CalendarClock, Database, FileText, Loader2, ShieldCheck } from "lucide-react";
import { ABIs } from "../abis";
import { CONTRACTS } from "../config/contracts";
import { useTxToast } from "../components/TxToastContext";

function defaultStartTime() {
  return toLocalDateTimeInput(new Date(Date.now() + 3600_000));
}

function defaultEndTime() {
  return toLocalDateTimeInput(new Date(Date.now() + 7 * 86400_000));
}

export default function CreateMarketPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { showPending, showSuccess, showError } = useTxToast();

  const [question, setQuestion] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [collateral, setCollateral] = useState<string>(CONTRACTS.Collateral);
  const [fee, setFee] = useState("0");
  const [startTime, setStartTime] = useState(defaultStartTime());
  const [endTime, setEndTime] = useState(defaultEndTime());
  const [errorMsg, setErrorMsg] = useState("");
  const [lastHash, setLastHash] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: factoryOwner, isLoading: isOwnerLoading, isError: isOwnerError } = useReadContract({
    abi: ABIs.PredictionMarketFactory,
    address: CONTRACTS.PredictionMarketFactory,
    functionName: "owner",
  } as any);

  const trimmedQuestion = question.trim();
  const trimmedDataSource = dataSource.trim();
  const feePercent = Number.parseFloat(fee || "0");
  const ownerAddress = typeof factoryOwner === "string" ? factoryOwner : "";
  const isCreatorWallet =
    Boolean(address && ownerAddress) && address?.toLowerCase() === ownerAddress.toLowerCase();
  const isWorking = isPending || isConfirming;
  const cannotCreate =
    !isConnected ||
    !trimmedQuestion ||
    !trimmedDataSource ||
    isOwnerLoading ||
    isOwnerError ||
    (Boolean(ownerAddress) && !isCreatorWallet) ||
    isWorking;

  const conditionId = useMemo(
    () => (trimmedQuestion ? computeConditionId(trimmedQuestion) : ""),
    [trimmedQuestion],
  );

  const durationDays = useMemo(() => {
    const start = Math.floor(new Date(startTime).getTime() / 1000);
    const end = Math.floor(new Date(endTime).getTime() / 1000);
    return start > 0 && end > start ? Math.max(1, Math.ceil((end - start) / 86400)) : null;
  }, [endTime, startTime]);

  useEffect(() => {
    if (!txHash || txHash === lastHash) return;
    setLastHash(txHash);
    showPending(txHash, "Signing...");
  }, [lastHash, showPending, txHash]);

  useEffect(() => {
    if (!isSuccess) return;
    showSuccess("Market created!", txHash);
    const timer = window.setTimeout(() => navigate("/markets"), 900);
    return () => window.clearTimeout(timer);
  }, [isSuccess, navigate, showSuccess, txHash]);

  useEffect(() => {
    if (!isError) return;
    const msg = "Transaction failed or was rejected.";
    setErrorMsg(msg);
    setLastHash(null);
    showError(msg);
  }, [isError, showError]);

  useEffect(() => {
    if (!writeError) return;
    const rawMsg = (writeError as any)?.shortMessage || (writeError as any)?.message || "Transaction failed";
    const msg = normalizeCreateMarketError(rawMsg, ownerAddress);
    setErrorMsg(msg);
    showError(msg);
  }, [ownerAddress, showError, writeError]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isConnected || !trimmedQuestion || !trimmedDataSource) return;

    const startTs = Math.floor(new Date(startTime).getTime() / 1000);
    const endTs = Math.floor(new Date(endTime).getTime() / 1000);
    setErrorMsg("");

    if (isOwnerError) {
      setErrorMsg("Unable to verify factory owner. Check RPC/network and try again.");
      return;
    }
    if (ownerAddress && !isCreatorWallet) {
      setErrorMsg(`Only the factory owner can create markets. Owner: ${shortAddress(ownerAddress)}`);
      return;
    }
    if (endTs <= startTs) {
      setErrorMsg("End time must be after start time.");
      return;
    }
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
      setErrorMsg("Fee must be between 0 and 100.");
      return;
    }

    try {
      writeContract({
        abi: ABIs.PredictionMarketFactory,
        address: CONTRACTS.PredictionMarketFactory,
        functionName: "createMarket",
        args: [
          collateral as `0x${string}`,
          computeConditionId(trimmedQuestion),
          trimmedQuestion,
          trimmedDataSource,
          BigInt(Math.floor(feePercent * 10_000)),
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

  return (
    <div className="create-page">
      <div className="create-page-header">
        <div>
          <h1>Create</h1>
          <p>Launch a YES / NO prediction market.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="create-page-grid">
        <div className="create-page-main">
          <CreateSection
            icon={<FileText size={16} />}
            title="Question"
            hint="A precise event that can resolve to YES or NO."
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="input create-textarea"
              rows={4}
              placeholder="Will ETH close above 5000 USD by the end of 2026?"
            />
            <div className="create-field-meta">
              <span>{trimmedQuestion.length}/160</span>
              <span>{trimmedQuestion ? "Ready" : "Required"}</span>
            </div>
          </CreateSection>

          <CreateSection
            icon={<Database size={16} />}
            title="Data Source"
            hint="The oracle, feed, or public source used for settlement."
          >
            <textarea
              value={dataSource}
              onChange={(event) => setDataSource(event.target.value)}
              className="input create-textarea compact"
              rows={3}
              placeholder="Chainlink ETH/USD and configured oracle"
            />
          </CreateSection>

          <CreateSection
            icon={<CalendarClock size={16} />}
            title="Schedule"
            hint="Set the trading window and fee."
          >
            <div className="create-form-two-col">
              <label>
                <span>Start Time</span>
                <input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="input" />
              </label>
              <label>
                <span>End Time</span>
                <input type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="input" />
              </label>
            </div>

            <div className="create-quick-picks">
              {[
                { label: "+1h", hours: 1 },
                { label: "+1d", hours: 24 },
                { label: "+3d", hours: 72 },
                { label: "+7d", hours: 168 },
                { label: "+30d", hours: 720 },
              ].map((pick) => (
                <button
                  key={pick.label}
                  type="button"
                  onClick={() => {
                    const start = new Date(startTime);
                    setEndTime(toLocalDateTimeInput(new Date(start.getTime() + pick.hours * 3600_000)));
                  }}
                >
                  End {pick.label}
                </button>
              ))}
            </div>

            <div className="create-form-terms-grid">
              <label>
                <span>Collateral Token</span>
                <input value={collateral} onChange={(event) => setCollateral(event.target.value)} className="input mono-input" />
              </label>
              <label>
                <span>Fee (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} className="input" />
              </label>
            </div>
          </CreateSection>

          {errorMsg && <div className="create-error">{errorMsg}</div>}
          {isConnected && ownerAddress && !isCreatorWallet && (
            <div className="create-access-note">
              Connected wallet cannot create markets. Switch to factory owner {shortAddress(ownerAddress)}.
            </div>
          )}

          <div className="create-page-actions">
            <button
              type="submit"
              disabled={cannotCreate}
              className="btn-primary"
            >
              {isWorking ? (
                <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> {isConfirming ? "Confirming..." : "Signing..."}</>
              ) : !isConnected ? "Connect Wallet" : isOwnerLoading ? "Checking Owner..." : isOwnerError ? "Owner Check Failed" : ownerAddress && !isCreatorWallet ? "Owner Wallet Required" : "Create"}
            </button>
          </div>
        </div>

        <aside className="create-preview-panel">
          <div className="create-preview-title">
            <span><ShieldCheck size={16} /></span>
            <div>
              <strong>Preview</strong>
              <p>Shown before trading</p>
            </div>
          </div>

          <div className="create-preview-card">
            <div className="create-preview-top">
              <span>NEW</span>
              <b>Active</b>
            </div>
            <h2>{trimmedQuestion || "Your market question will appear here"}</h2>
            <p>{trimmedDataSource || "Add a data source so traders understand how this market resolves."}</p>
            <div className="create-preview-bars"><span /><span /></div>
            <div className="create-preview-outcomes"><span>YES</span><span>NO</span></div>
          </div>

          <div className="create-preview-stats">
            <PreviewStat label="Duration" value={durationDays ? `${durationDays}d` : "Check"} />
            <PreviewStat label="Fee" value={`${Number.isFinite(feePercent) ? feePercent : 0}%`} />
          </div>

          {conditionId && (
            <div className="create-condition">
              <span>Condition ID</span>
              <p>{conditionId}</p>
            </div>
          )}
        </aside>
      </form>
    </div>
  );
}

function CreateSection({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="create-section">
      <div className="create-section-heading">
        <span>{icon}</span>
        <div>
          <strong>{title}</strong>
          <p>{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="create-preview-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toLocalDateTimeInput(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeCreateMarketError(message: string, ownerAddress: string) {
  if (message.includes("Factory: unauthorized")) {
    return ownerAddress
      ? `Only the factory owner can create markets. Owner: ${shortAddress(ownerAddress)}`
      : "Only the factory owner can create markets.";
  }
  return message;
}

function computeConditionId(question: string): string {
  const questionId = keccak256(new TextEncoder().encode(question));
  const packed = encodeAbiParameters(
    [{ type: "address" }, { type: "bytes32" }, { type: "uint256" }],
    [CONTRACTS.SettlementManager as `0x${string}`, questionId, 2n],
  );
  return keccak256(packed);
}
