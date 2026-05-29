require('dns').setServers(['8.8.8.8']);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createPublicClient, http } = require('viem');

const client = createPublicClient({
  chain: {
    id: 5042002,
    name: 'arc testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
    blockExplorers: { default: { name: 'arcscan', url: 'https://testnet.arcscan.io' } },
  },
  transport: http(),
});

const factory = '0xDF708c771BD041e605d9F95C66dC02f15dF3cF5C';

async function main() {
  try {
    const owner = await client.readContract({
      address: factory,
      functionName: 'owner',
      abi: [{ type: 'function', name: 'owner', stateMutability: 'view', outputs: [{ type: 'address' }], inputs: [] }]
    });
    console.log('factory owner:', owner);
  } catch(e) {
    console.log('owner error:', e.message.slice(0, 200));
  }

  try {
    const obt = await client.readContract({
      address: factory,
      functionName: 'orderBookTemplate',
      abi: [{ type: 'function', name: 'orderBookTemplate', stateMutability: 'view', outputs: [{ type: 'address' }], inputs: [] }]
    });
    console.log('orderBookTemplate:', obt);
  } catch(e) {
    console.log('orderBookTemplate error:', e.message.slice(0, 300));
  }

  try {
    const mkt = await client.readContract({
      address: factory,
      functionName: 'marketTemplate',
      abi: [{ type: 'function', name: 'marketTemplate', stateMutability: 'view', outputs: [{ type: 'address' }], inputs: [] }]
    });
    console.log('marketTemplate:', mkt);
  } catch(e) {
    console.log('marketTemplate error:', e.message.slice(0, 300));
  }

  try {
    const met = await client.readContract({
      address: factory,
      functionName: 'matchingEngineTemplate',
      abi: [{ type: 'function', name: 'matchingEngineTemplate', stateMutability: 'view', outputs: [{ type: 'address' }], inputs: [] }]
    });
    console.log('matchingEngineTemplate:', met);
  } catch(e) {
    console.log('matchingEngineTemplate error:', e.message.slice(0, 300));
  }

  try {
    const ct = await client.readContract({
      address: factory,
      functionName: 'conditionalTokens',
      abi: [{ type: 'function', name: 'conditionalTokens', stateMutability: 'view', outputs: [{ type: 'address' }], inputs: [] }]
    });
    console.log('conditionalTokens:', ct);
  } catch(e) {
    console.log('conditionalTokens error:', e.message.slice(0, 300));
  }

  try {
    const fr = await client.readContract({
      address: factory,
      functionName: 'feeRecipient',
      abi: [{ type: 'function', name: 'feeRecipient', stateMutability: 'view', outputs: [{ type: 'address' }], inputs: [] }]
    });
    console.log('feeRecipient:', fr);
  } catch(e) {
    console.log('feeRecipient error:', e.message.slice(0, 300));
  }
}

main().catch(console.error);