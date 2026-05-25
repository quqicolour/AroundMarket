import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { metaMask } from 'wagmi/connectors'

const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '2f05ae7f1116030fde2d36508f472bf1'

export const config = getDefaultConfig({
  appName: 'AroundMarket',
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  connectors: [
    metaMask(),
  ],
  projectId: WALLET_CONNECT_PROJECT_ID,
  ssr: false,
})

export const CONTRACTS = {
  PredictionMarketFactory: '0xe5F297E7291145dCe2aB176BfB12c26473511966',
  SettlementManager: '0xf52dFb3558dAA72F016EE0693ac47405d77a0186',
  ConditionalTokens: '0xe18dE10E06545D978ECe02E2f308c353480b9E2d',
  Collateral: '0xb70A27B166A940F93cfFa743b22c29d4907394C2',
} as const