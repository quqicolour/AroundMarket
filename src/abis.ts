import ConditionalTokensArtifact from "./abis/ConditionalTokens.json";
import MarketArtifact from "./abis/Market.json";
import MatchingEngineArtifact from "./abis/MatchingEngine.json";
import OracleAdapterArtifact from "./abis/OracleAdapter.json";
import OrderBookArtifact from "./abis/OrderBook.json";
import PredictionMarketFactoryArtifact from "./abis/PredictionMarketFactory.json";
import SettlementManagerArtifact from "./abis/SettlementManager.json";

export const ABIs = {
  ConditionalTokens: ConditionalTokensArtifact.abi,
  Market: MarketArtifact.abi,
  MatchingEngine: MatchingEngineArtifact.abi,
  OracleAdapter: OracleAdapterArtifact.abi,
  OrderBook: OrderBookArtifact.abi,
  PredictionMarketFactory: PredictionMarketFactoryArtifact.abi,
  SettlementManager: SettlementManagerArtifact.abi,
} as const;
