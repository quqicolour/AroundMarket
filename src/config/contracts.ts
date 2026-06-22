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
      url: "https://testnet.arcscan.app",
      apiUrl: "https://testnet.arcscan.app/api",
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
  PredictionMarketFactory: "0x5c1D5eFF4f320eAD937C5F5b6D08E827f011BD82",
  SettlementManager: "0x717D1F2548719A2a1da6b78f2F613c49E2B82260",
  ConditionalTokens: "0xeCda894e6d7965ca18A14D9b896682326696c779",
  Collateral: "0x9f44808f66EDD95542D8a4dF6E355E5D218cFc61",
} as const;
