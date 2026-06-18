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
  PredictionMarketFactory: "0x532C9455d213802b30ea0d53A55B730315A62dBc",
  SettlementManager: "0xBF53f4405399f2ae04Bafd4c40780BAf6E405Cb0",
  ConditionalTokens: "0xCA483FbA80931C18CdE752c35d547c7e5BF57d6b",
  Collateral: "0x2375504de874C2262776F640389bF31437627260",
} as const;
