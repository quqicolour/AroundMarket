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
  PredictionMarketFactory: "0x466a2D6030A51A804Fc3DBDa1b98b6559f51D6Cc",
  SettlementManager: "0xD5Cce848954Ab6370Cf34FED6F850Ada20A5Eb51",
  ConditionalTokens: "0x8c6eAfb47C562f849393d8eD576bB03a6763522a",
  Collateral: "0x47b67D03B0093D95C4591974569d3ee738c97Bb3",
} as const;
