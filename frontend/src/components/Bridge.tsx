import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRightLeft, 
  CheckCircle2,
  Loader2,
  ArrowDown,
  AlertCircle,
  X,
  Zap,
  ShieldCheck
} from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

const ARC_ID = 5042002

const Bridge = () => {
  const { isConnected, address, connector } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const [amount, setAmount] = useState('')
  const [isBridging, setIsBridging] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 6000)
  }, [])

  const handleBridgeAction = async () => {
    if (!amount || !address) return showNotification('Please enter amount', 'error')
    
    setIsBridging(true)
    showNotification('Initializing CCTP Bridge...', 'info')
    
    try {
      const kit = new BridgeKit()
      
      // Map y hệt Dashboard của bạn
      const sourceChainMap: Record<number, string> = {
        11155111: 'Ethereum_Sepolia',
        84532: 'Base_Sepolia',
        1: 'Ethereum',
        8453: 'Base'
      }
      
      const sourceChainName = sourceChainMap[chainId] || 'Ethereum_Sepolia'
      const provider = await connector?.getProvider()
      
      if (!provider) throw new Error("No provider found. Please reconnect.")

      // Thực hiện Bridge y hệt Dashboard
      await kit.bridge({
        from: {
          adapter: await createAdapterFromProvider({ provider: provider as any }),
          chain: sourceChainName as any
        },
        to: {
          adapter: await createAdapterFromProvider({ provider: provider as any }),
          chain: 'Arc_Testnet' as any,
          recipientAddress: address as `0x${string}`
        },
        amount: amount
      })

      showNotification("Bridge Transaction Sent! Switch to Arc to see funds soon.", 'success')
      setAmount('')
      
      // Proactive switch
      if (switchChain) {
        setTimeout(() => switchChain({ chainId: ARC_ID }), 2000)
      }
      
    } catch (err: any) {
      console.error('Bridge Error:', err)
      showNotification(err.shortMessage || err.message || 'Bridge failed', 'error')
    } finally {
      setIsBridging(false)
    }
  }

  return (
    <div className="bridge-page" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '90vh' }}>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed', top: 0, left: '50%', zIndex: 1000,
              padding: '1rem 1.5rem', borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
              border: `1px solid ${notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : 'var(--primary)'}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '300px', color: 'white'
            }}
          >
            {notification.type === 'success' && <CheckCircle2 size={20} color="#10b981" />}
            {notification.type === 'error' && <AlertCircle size={20} color="#ef4444" />}
            {notification.type === 'info' && <Loader2 size={20} className="animate-spin" color="var(--primary)" />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.message}</span>
            <button onClick={() => setNotification(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '1rem' }}>
          <ArrowRightLeft size={40} className="neon-text" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>Neon <span className="neon-text">Bridge</span></h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Native USDC Liquidity • Powered by Circle CCTP</p>
      </header>

      <div className="glass" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem' }}>
            <ConnectButton showBalance={false} chainStatus="icon" />
        </div>

        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem', marginTop: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>Amount to transfer</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input 
              type="number" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ background: 'none', border: 'none', fontSize: '2.5rem', color: 'white', fontWeight: 800, width: '100%', outline: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" width="24" alt="usdc" />
              <span style={{ fontWeight: 800 }}>USDC</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
            <ArrowDown size={20} className="neon-text" />
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Destination</div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>Arc Network</div>
          </div>
          <div style={{ background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px', color: '#000', fontSize: '0.75rem', fontWeight: 800 }}>
             CCTP ENABLED
          </div>
        </div>

        <button 
          className="glow-btn" 
          onClick={handleBridgeAction}
          disabled={isBridging || !amount || !isConnected}
          style={{ width: '100%', padding: '1.3rem', borderRadius: '16px', fontWeight: 800 }}
        >
          {isBridging ? <><Loader2 className="animate-spin" size={20} style={{ marginRight: '0.8rem' }} /> PENDING...</> : 
           isConnected ? 'BRIDGE TO ARC' : 'CONNECT WALLET'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2.5rem' }}>
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>
            <Zap className="neon-text" size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Zero Slippage</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CCTP ensures 1:1 USDC conversion.</div>
          </div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>
            <ShieldCheck className="neon-text" size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Full Custody</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non-custodial bridge via Circle.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Bridge
