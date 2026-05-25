import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fix for corrupted viem package where _esm/index.js doesn't exist
// but _cjs/index.js does - use CJS fallback
function fixViemResolution() {
  return {
    name: 'fix-viem-resolution',
    resolveId(id: string) {
      if (id === 'viem' || id === '\0viem') {
        // Let vite handle it normally but it'll fall through to CJS
        return null
      }
      if (id.endsWith('viem/_esm/index.js')) {
        // Redirect to _cjs/index.js since _esm is missing actual JS files
        return { id: '/mnt/d/blockchain/AroundMarket/node_modules/viem/_cjs/index.js', external: false }
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [react(), fixViemResolution()],
  optimizeDeps: {
    include: ['viem', 'wagmi', '@rainbow-me/rainbowkit', 'react', 'react-dom'],
  },
})