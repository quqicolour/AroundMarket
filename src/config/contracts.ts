import { defineChain } from "viem";
import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const arcTestnet = defineChain({
  id: 5042002,
  name: "arc testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
    public: {
      http: ["https://rpc.quicknode.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.io",
      apiUrl: "https://testnet.arcscan.io/api",
    },
  },
});

const WALLET_CONNECT_PROJECT_ID =
  (import.meta as any).env?.VITE_WALLET_CONNECT_PROJECT_ID ||
  "2f05ae7f1116030fde2d36508f472bf1";

export const config = getDefaultConfig({
  appName: "AroundMarket",
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(),
  },
  projectId: WALLET_CONNECT_PROJECT_ID,
  ssr: false,
});

export const CONTRACTS = {
  PredictionMarketFactory: "0xD316E250a5696ff1Ae2a002F1D3cD8c3FdB313ab",
  SettlementManager: "0x3b75a482A2F0DAdB39CA2569dD1e9D25EfA391D8",
  ConditionalTokens: "0xD91517C321847AFB18cacf02D5305aeBc6eF8c38",
  Collateral: "0xAa080805663D0aaD1714B9910f2291658E2D24a0",
} as const;
