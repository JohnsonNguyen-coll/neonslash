import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'

import { 
  getDefaultConfig, 
  RainbowKitProvider, 
  darkTheme,
  Chain
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, http } from 'wagmi'
import { baseSepolia, sepolia } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
}

const config = getDefaultConfig({
  appName: 'NeonSlashVault',
  projectId: '9676742a784ca3b5a76e0539f375a004', 
  chains: [arcTestnet, baseSepolia, sepolia],
  transports: {
    [arcTestnet.id]: http(),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#10b981',
          accentColorForeground: 'black',
          borderRadius: 'medium',
        })}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
