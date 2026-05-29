import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS } from "../config/contracts";
import { formatAmount } from "../utils/format";

export default function MyPositions() {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: CONTRACTS.Collateral as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  });

  if (!address) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Connect wallet to view your positions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">我的 USDC 余额</p>
        <p className="text-2xl font-bold text-emerald-600">
          {balance ? formatAmount(balance as bigint, 6) : "0.00"} USDC
        </p>
      </div>
    </div>
  );
}
