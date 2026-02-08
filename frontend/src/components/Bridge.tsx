import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRightLeft, 
  ChevronDown, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowDown
} from 'lucide-react'

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '🌐', color: '#627EEA' },
  { id: 'polygon', name: 'Polygon', icon: '💜', color: '#8247E5' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '💙', color: '#28A0F0' },
  { id: 'optimism', name: 'Optimism', icon: '❤️', color: '#FF0420' },
  { id: 'base', name: 'Base', icon: '🔵', color: '#0052FF' }
]

const Bridge = () => {
  const [fromChain, setFromChain] = useState(CHAINS[0])
  const [amount, setAmount] = useState('')
  const [isBridging, setIsBridging] = useState(false)
  const [step, setStep] = useState(0) // 0: Idle, 1: Burning, 2: Attesting, 3: Minting
  const [showSuccess, setShowSuccess] = useState(false)

  const handleBridge = () => {
    if (!amount || isNaN(Number(amount))) return
    setIsBridging(true)
    setStep(1)

    // Simulate CCTP Bridge Steps
    setTimeout(() => {
      setStep(2)
      setTimeout(() => {
        setStep(3)
        setTimeout(() => {
          setIsBridging(false)
          setStep(0)
          setShowSuccess(true)
          setAmount('')
        }, 3000)
      }, 4000)
    }, 3000)
  }

  return (
    <div className="bridge-page" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '1.5rem' }}>
            <ArrowRightLeft size={40} className="neon-text" />
          </div>
        </motion.div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Neon <span className="neon-text">Bridge</span></h1>
        <p style={{ color: 'var(--text-muted)' }}>Powered by Circle CCTP • Zero-fee transfers to Arc Network</p>
      </header>

      <div className="glass" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* FROM CHAIN */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>FROM SOURCE CHAIN</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CHAINS.map(chain => (
              <button 
                key={chain.id}
                onClick={() => setFromChain(chain)}
                style={{ 
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: '12px',
                  background: fromChain.id === chain.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${fromChain.id === chain.id ? chain.color : 'transparent'}`,
                  color: fromChain.id === chain.id ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  transition: '0.3s'
                }}
              >
                <span>{chain.icon}</span> {chain.name}
              </button>
            ))}
          </div>
        </div>

        {/* AMOUNT INPUT */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount to transfer</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>USDC Balance: 0.00</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={isBridging}
              style={{ background: 'none', border: 'none', fontSize: '2rem', color: 'white', fontWeight: 700, width: '100%', outline: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '100px' }}>
              <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" width="20" alt="usdc" />
              <span style={{ fontWeight: 700 }}>USDC</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
                <ArrowDown size={20} className="neon-text" />
            </div>
        </div>

        {/* TO CHAIN (LOCKED TO ARC) */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--primary)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Destination</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Neon Arc Network</div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
            LOCKED
          </div>
        </div>

        {/* CTA BUTTON */}
        <button 
          className="glow-btn" 
          onClick={handleBridge}
          disabled={isBridging || !amount}
          style={{ width: '100%', padding: '1.5rem', borderRadius: '16px', fontSize: '1.1rem', marginBottom: '1.5rem' }}
        >
          {isBridging ? 'BRIDGE IN PROGRESS...' : 'START BRIDGE TRANSFER'}
        </button>

        {/* BRIDGE FOOTER INFO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>EST. TIME</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>~10-15 Minutes</div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>BRIDGE FEE</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>FREE</div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>SECURITY</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Circle CCTP</div>
          </div>
        </div>
      </div>

      {/* BRIDGE STEPS MODAL */}
      <AnimatePresence>
        {isBridging && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <div className="glass" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
              <Loader2 className="animate-spin" size={60} style={{ color: 'var(--primary)', marginBottom: '2rem', marginInline: 'auto' }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>CCTP Bridge Active</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Transferring {amount} USDC from {fromChain.name} to Arc...</p>
              
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: step >= 1 ? 1 : 0.3 }}>
                  {step > 1 ? <CheckCircle2 size={18} color="var(--primary)" /> : <Zap size={18} />}
                  <span style={{ fontSize: '0.9rem' }}>Step 1: Destroying USDC on {fromChain.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: step >= 2 ? 1 : 0.3 }}>
                  {step > 2 ? <CheckCircle2 size={18} color="var(--primary)" /> : <ShieldCheck size={18} />}
                  <span style={{ fontSize: '0.9rem' }}>Step 2: Fetching Circle Attestation...</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: step >= 3 ? 1 : 0.3 }}>
                  {step > 3 ? <CheckCircle2 size={18} color="var(--primary)" /> : <ExternalLink size={18} />}
                  <span style={{ fontSize: '0.9rem' }}>Step 3: Minting USDC on Arc Network</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUCCESS NOTIFICATION */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}
          >
            <div className="glass" style={{ padding: '1.5rem 2rem', background: '#0a1a12', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CheckCircle2 color="var(--primary)" />
              <div>
                <div style={{ fontWeight: 700 }}>Bridge Successful!</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>USDC is now on Arc. You can now stake it in the Vault.</div>
              </div>
              <button onClick={() => setShowSuccess(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}>✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Bridge
