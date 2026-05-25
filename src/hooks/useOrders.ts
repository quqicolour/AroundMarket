import { useReadContract } from 'wagmi'
import { ABIs } from '../abis'

export interface OrderData {
  id: bigint
  marketId: bigint
  maker: string
  isYes: boolean
  price: bigint
  amount: bigint
  filled: bigint
  timestamp: bigint
  isActive: boolean
}

export function useUserOrders(orderBookAddr: string, userAddr: string, marketId: number) {
  // Get user's order IDs for this market
  const { data: orderIds, isLoading: isLoadingIds } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: 'getUserOrders',
    args: [userAddr as `0x${string}`, BigInt(marketId)],
  })

  // Get each order's details
  const { data: orders, isLoading: isLoadingOrders } = useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: 'getOrder',
    args: orderIds && orderIds.length > 0 ? [orderIds[0]] : [BigInt(0)],
  })

  // Fetch all orders if we have IDs
  const orderDetails: OrderData[] = []
  
  if (orderIds && Array.isArray(orderIds)) {
    for (const orderId of orderIds) {
      // @ts-ignore - we'll fetch each order individually in the component
    }
  }

  return {
    orderIds: orderIds as bigint[] | undefined,
    orders,
    isLoading: isLoadingIds || isLoadingOrders,
  }
}

export function useOrderDetails(orderBookAddr: string, orderId: bigint) {
  return useReadContract({
    abi: ABIs.OrderBook,
    address: orderBookAddr as `0x${string}`,
    functionName: 'getOrder',
    args: [orderId],
  })
}