import { createContext, useContext, useState, useCallback } from "react";
import TxToast from "./TxToast";

interface TxToastValue {
  showPending: (hash: string, label: string) => void;
  showSuccess: (label: string, explorerUrl?: string) => void;
  showError: (msg: string) => void;
}

const TxToastContext = createContext<TxToastValue>({
  showPending: () => {},
  showSuccess: () => {},
  showError: () => {},
});

export function TxToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{
    status: "pending" | "success" | "error";
    label: string;
    explorerUrl: string;
  } | null>(null);

  const showPending = useCallback((hash: string, label: string) => {
    setToast({ status: "pending", label, explorerUrl: `https://testnet.arcscan.io/tx/${hash}` });
  }, []);

  const showSuccess = useCallback((label: string, explorerUrl?: string) => {
    setToast({ status: "success", label, explorerUrl: explorerUrl ?? "" });
  }, []);

  const showError = useCallback((msg: string) => {
    setToast({ status: "error", label: msg, explorerUrl: "" });
  }, []);

  return (
    <TxToastContext.Provider value={{ showPending, showSuccess, showError }}>
      {children}
      {toast && (
        <TxToast
          status={toast.status}
          label={toast.label}
          explorerUrl={toast.explorerUrl}
          onClose={() => setToast(null)}
        />
      )}
    </TxToastContext.Provider>
  );
}

export function useTxToast() {
  return useContext(TxToastContext);
}
