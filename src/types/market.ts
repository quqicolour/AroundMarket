export interface MarketInfo {
  marketId: number
  collateral: string
  orderBook: string
  matchingEngine: string
  conditionId: string
  resolved: boolean
  fee: bigint
}

export interface OrderData {
  id: number
  marketId: number
  maker: string
  isYes: boolean
  price: bigint
  amount: bigint
  filled: bigint
  timestamp: number
  isActive: boolean
}

export interface Trade {
  orderId: number
  maker: string
  taker: string
  isYes: boolean
  price: bigint
  amount: bigint
  makerFee: bigint
  takerFee: bigint
  timestamp: number
}

export interface UserPosition {
  marketId: number
  yesBalance: bigint
  noBalance: bigint
  resolved: boolean
  yesPayout?: bigint
  noPayout?: bigint
}