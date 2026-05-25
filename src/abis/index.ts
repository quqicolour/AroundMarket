import PredictionMarketFactory from '../../abis/PredictionMarketFactory.json'
import Market from '../../abis/Market.json'
import OrderBook from '../../abis/OrderBook.json'
import MatchingEngine from '../../abis/MatchingEngine.json'
import SettlementManager from '../../abis/SettlementManager.json'
import ConditionalTokens from '../../abis/ConditionalTokens.json'
import OracleAdapter from '../../abis/OracleAdapter.json'
import EchoOptimisticOracle from '../../abis/EchoOptimisticOracle.json'

export const ABIs = {
  PredictionMarketFactory: PredictionMarketFactory.abi,
  Market: Market.abi,
  OrderBook: OrderBook.abi,
  MatchingEngine: MatchingEngine.abi,
  SettlementManager: SettlementManager.abi,
  ConditionalTokens: ConditionalTokens.abi,
  OracleAdapter: OracleAdapter.abi,
  EchoOptimisticOracle: EchoOptimisticOracle.abi,
} as const

export { PredictionMarketFactory, Market, OrderBook, MatchingEngine, SettlementManager, ConditionalTokens, OracleAdapter, EchoOptimisticOracle }