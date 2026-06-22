import { useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink, X } from "lucide-react";

interface Props {
  status: "pending" | "success" | "error";
  label: string;
  explorerUrl?: string;
  onClose: () => void;
}

export default function TxToast({ status, label, explorerUrl, onClose }: Props) {
  useEffect(() => {
    if (status !== "pending") {
      const t = setTimeout(onClose, 5000);
      return () => clearTimeout(t);
    }
  }, [status, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        maxWidth: 360,
      }}
    >
      <div className={`tx-toast ${status}`} role="status" aria-live="polite">
        <span className="tx-icon" aria-hidden="true">
          {status === "pending" && <Loader2 size={16} strokeWidth={2.2} />}
          {status === "success" && <CheckCircle2 size={16} strokeWidth={2.2} />}
          {status === "error" && <XCircle size={16} strokeWidth={2.2} />}
        </span>
        <span className="tx-label">{label}</span>
        {explorerUrl && status !== "pending" && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="tx-explorer" aria-label="View on explorer">
            <ExternalLink size={12} strokeWidth={2.2} />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="tx-explorer"
          aria-label="Dismiss"
        >
          <X size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

export { TxToast };
