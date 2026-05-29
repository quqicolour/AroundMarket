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
  PredictionMarketFactory: "0xDF708c771BD041e605d9F95C66dC02f15dF3cF5C",
  SettlementManager: "0xD89DDFDF5c6F60B284923E499c703346D2eAB540",
  ConditionalTokens: "0x83113DA858c644C3d0b2619bc28dAc57A666ADB9",
  Collateral: "0x8ec174Ef35f9dEAbe5F24Bd95331Db049066ECAA",
} as const;
