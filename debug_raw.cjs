require('dns').setServers(['8.8.8.8']);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const rpcUrl = 'https://rpc.testnet.arc.network';

function rpc(method, params) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const req = https.request(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({raw: d}); } });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(10000, () => { try { req.destroy(); } catch {} resolve({ error: 'TIMEOUT' }); });
    req.write(body); req.end();
  });
}

async function main() {
  const factory = '0xDF708c771BD041e605d9F95C66dC02f15dF3cF5C';
  const owner = '0x93561385F0192956036537804fc4E90307cE38F7';
  const usdc = '0x8ec174Ef35f9dEAbe5F24Bd95331Db049066ECAA';
  
  // Use raw eth_call to see error data (not decoded by viem)
  const calldata = '0xf527febd' + // correct createMarket selector
    '000000000000000000000000' + usdc.slice(2).toLowerCase() + // collateral
    '0000000000000000000000000000000000000000000000000000000000000000' + // conditionId
    '00000000000000000000000000000000000000000000000000000000000000c8' + // fee 200
    '000000000000000000000000000000000000000000000000006a05c01e' +       // startTime ~now+3600
    '000000000000000000000000000000000000000000000000006a198be0';       // endTime ~now+7d
  
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'eth_call',
    params: [{ to: factory, data: '0x' + calldata, from: owner }, 'latest']
  });
  
  const req = https.request(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => {
      const r = JSON.parse(d);
      console.log('Full response:', JSON.stringify(r));
      if (r.error) {
        console.log('Error code:', r.error.code);
        console.log('Error message:', r.error.message);
        console.log('Error data:', r.error.data);
        // Check if data matches any known error selector
        const data = r.error.data;
        if (data && data.startsWith('0x')) {
          const sel = data.slice(0, 10);
          console.log('Error selector:', sel);
          // Try to decode as string
          if (data.length > 10 && data.slice(10, 138)) {
            try {
              // Decode Error(string) 0x08c379a0
              if (sel === '0x08c379a0') {
                const offset = parseInt(data.slice(138, 202), 16);
                const len = parseInt(data.slice(202, 266), 16);
                const strHex = data.slice(266, 266 + len * 2);
                const str = Buffer.from(strHex, 'hex').toString('utf8');
                console.log('Decoded error string:', str);
              }
            } catch(e) {}
          }
        }
      }
    });
  });
  req.on('error', e => console.error(e.message));
  req.setTimeout(10000, () => { console.log('TIMEOUT'); req.destroy(); });
  req.write(body); req.end();
}

main().catch(console.error);