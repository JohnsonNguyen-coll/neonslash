import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, 
  Star, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  X,
  CreditCard
} from 'lucide-react'
import { VAULT_ADDRESS, VAULT_ABI } from '../constants'
import nftImage from '../../assets/nftneon.png'

const RewardCenter = () => {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [isClaiming, setIsClaiming] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  // Contract Data
  const { data: points, refetch: refetchPoints } = useReadContract({ 
    address: VAULT_ADDRESS as `0x${string}`, 
    abi: VAULT_ABI, 
    functionName: 'getPoints', 
    args: address ? [address] : undefined 
  })

  const { writeContractAsync } = useWriteContract()

  const hasEnoughPoints = points !== undefined && Number(points) >= 1000

  const handleClaim = async () => {
    if (!hasEnoughPoints) return
    
    setIsClaiming(true)
    try {
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'redeemNFT'
      })
      
      await publicClient?.waitForTransactionReceipt({ hash })
      
      setNotification({ message: 'NFT Minted Successfully! Check your wallet.', type: 'success' })
      refetchPoints()
    } catch (err: any) {
      setNotification({ message: err.shortMessage || err.message || 'Minting failed.', type: 'error' })
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <div className="reward-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neon-icon"
          style={{ marginBottom: '1.5rem', display: 'inline-block' }}
        >
          <div className="glass" style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)' }}>
            <Trophy size={40} className="neon-text" />
          </div>
        </motion.div>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>Reward <span className="neon-text">Center</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Exchange your hard-earned points for exclusive NeonSlash NFTs</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
        {/* NFT Display */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="nft-preview-container"
        >
          <div className="glass" style={{ padding: '1rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <img 
                src={nftImage} 
                alt="Neon NFT" 
                style={{ 
                  width: '100%', 
                  borderRadius: '16px', 
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }} 
              />
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Neon Guardian #001</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Legendary Edition</p>
                </div>
                <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid var(--primary)' }}>
                    <span className="neon-text" style={{ fontWeight: 800 }}>1000 PTS</span>
                </div>
              </div>
            </div>
            
            {/* Background Glow */}
            <div style={{ 
              position: 'absolute', 
              top: '-50%', 
              left: '-50%', 
              width: '200%', 
              height: '200%', 
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
          </div>
        </motion.div>

        {/* Claim Sections */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
          <div className="glass" style={{ padding: '2rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '12px' }}>
                <Zap size={24} className="neon-text" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Your Balance</h4>
                <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem' }}>{points !== undefined ? Number(points).toLocaleString() : '---'} PTS</p>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                <span>Progress to NFT</span>
                <span className="neon-text">{Math.min(100, (Number(points || 0) / 1000) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (Number(points || 0) / 1000) * 100)}%` }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), #34d399)', boxShadow: '0 0 10px var(--primary)' }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.8rem', textAlign: 'center' }}>
                {hasEnoughPoints ? "Congratulations! You have enough points." : `Earn ${1000 - Number(points || 0)} more points to unlock.`}
              </p>
            </div>

            <button 
              className={hasEnoughPoints ? "glow-btn" : "nav-btn"}
              style={{ 
                width: '100%', 
                padding: '1.2rem', 
                fontSize: '1.1rem', 
                opacity: hasEnoughPoints ? 1 : 0.5,
                background: hasEnoughPoints ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: hasEnoughPoints ? 'black' : 'var(--text-muted)',
                fontWeight: 800,
                cursor: hasEnoughPoints ? 'pointer' : 'not-allowed'
              }}
              onClick={handleClaim}
              disabled={!hasEnoughPoints || isClaiming}
            >
              {isClaiming ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Zap size={20} />
                  </motion.div>
                  MINTING NFT...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} />
                  CLAIM EXCLUSIVE NFT
                </span>
              )}
            </button>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <AlertCircle size={20} className="neon-text" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Once claimed, 1000 Points will be deducted from your vault balance. Your staked USDC remains untouched. NFTs are strictly limited to early adopters.
            </p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }} style={{ position: 'fixed', bottom: '40px', left: '0', right: '0', margin: '0 auto', width: 'fit-content', minWidth: '350px', zIndex: 99999 }}>
            <div className="glass" style={{ padding: '1rem 2rem', border: `1px solid ${notification.type === 'success' ? 'var(--primary)' : '#ef4444'}`, background: '#0a0f1a', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              {notification.type === 'success' ? <CheckCircle color="var(--primary)" size={18} /> : <AlertCircle color="#ef4444" size={18} />}
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.message}</span>
              <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '1rem' }}><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RewardCenter
