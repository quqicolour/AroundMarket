import { useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

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
    <div className="fixed bottom-6 right-6 z-50">
      <div className={
        `flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg text-white min-w-64 text-sm font-medium ${
          status === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
          status === "error" ? "bg-gradient-to-r from-rose-500 to-pink-500" :
          "bg-gradient-to-r from-gray-500 to-gray-600"
        }`
      }>
        {status === "pending" && <Loader2 size={18} className="animate-spin flex-shrink-0" />}
        {status === "success" && <CheckCircle2 size={18} className="flex-shrink-0" />}
        {status === "error" && <XCircle size={18} className="flex-shrink-0" />}
        <span className="flex-1">{label}</span>
        {explorerUrl && status !== "pending" && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

export { TxToast };
