import { useState, useCallback, useEffect } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useChainId,
  usePublicClient
} from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseUnits, formatUnits } from 'viem'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Shield, 
  Lock, 
  ArrowRight,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  X
} from 'lucide-react'
import { ARC_ID, VAULT_ADDRESS, USDC_ADDRESS, VAULT_ABI, USDC_ABI, LOCK_PERIOD } from '../constants'

const Vault = () => {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const isNotOnArc = chainId !== ARC_ID
  
  const [stakeAmount, setStakeAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  // Contract Data
  const { data: usdcBalance, refetch: refetchUSDC } = useReadContract({ address: USDC_ADDRESS as `0x${string}`, abi: USDC_ABI, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: stakedUSDC, refetch: refetchStaked } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'stakedUSDC', args: address ? [address] : undefined })
  const { data: points, refetch: refetchPoints } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'getPoints', args: address ? [address] : undefined })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: USDC_ADDRESS as `0x${string}`, abi: USDC_ABI, functionName: 'allowance', args: address ? [address, VAULT_ADDRESS as `0x${string}`] : undefined })
  const { data: stakeTimestamp, refetch: refetchTimestamp } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'stakeTimestamp', args: address ? [address] : undefined })

  const { writeContractAsync } = useWriteContract()

  const refreshData = async () => {
    // Force clear TanStack Query cache for these specific keys
    await queryClient.invalidateQueries()
    refetchUSDC()
    refetchStaked()
    refetchPoints()
    refetchAllowance()
    refetchTimestamp()
    console.log("Data refreshed")
  }

  const handleAction = async () => {
    if (!stakeAmount || isNaN(Number(stakeAmount))) return
    if (!publicClient) return
    
    const amount = parseUnits(stakeAmount, 6)
    setIsProcessing(true)

    try {
      // 1. Check & Approve
      if (!allowance || (allowance as bigint) < amount) {
        setNotification({ message: 'Approving USDC... Please sign in wallet.', type: 'success' })
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [VAULT_ADDRESS as `0x${string}`, amount]
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        setNotification({ message: 'Approve successful! Now staking...', type: 'success' })
      }

      // 2. Stake
      const stakeHash = await writeContractAsync({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'stake',
        args: [amount]
      })
      
      setNotification({ message: 'Confirming Stake on Blockchain...', type: 'success' })
      await publicClient.waitForTransactionReceipt({ hash: stakeHash })

      setNotification({ message: 'Transaction Confirmed! Points Generated.', type: 'success' })
      setStakeAmount('')
      
      // Critical: Wait a bit for RPC to catch up then force refresh
      setTimeout(refreshData, 2000)
    } catch (err: any) {
      setNotification({ message: err.shortMessage || err.message || 'Transaction failed', type: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!stakeAmount || isNaN(Number(stakeAmount))) return
    if (!publicClient) return
    
    const amount = parseUnits(stakeAmount, 6)
    setIsProcessing(true)

    try {
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [amount]
      })
      
      setNotification({ message: 'Confirming Withdrawal...', type: 'success' })
      await publicClient.waitForTransactionReceipt({ hash })

      setNotification({ message: 'Withdrawal Successful!', type: 'success' })
      setStakeAmount('')
      setTimeout(refreshData, 2000)
    } catch (err: any) {
      setNotification({ message: err.shortMessage || err.message || 'Withdrawal failed', type: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }

  const lockEnd = stakeTimestamp ? Number(stakeTimestamp) + LOCK_PERIOD : 0
  const isLocked = Math.floor(Date.now() / 1000) < lockEnd
  const daysLeft = Math.ceil((lockEnd - Math.floor(Date.now() / 1000)) / 86400)

  return (
    <div className="vault-page" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '1.5rem' }}>
            <Lock size={48} className="neon-text" />
          </div>
        </motion.div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem' }}>The <span className="neon-text">Neon</span> Vault</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Stake USDC: 5 Pts per USDC + 1 Pt/Day yield (30-day Lock)</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Available</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0.00'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>USDC</span></div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid var(--primary)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Staked</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{stakedUSDC ? formatUnits(stakedUSDC as bigint, 6) : '0.00'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>USDC</span></div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Predictions Pts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{points !== undefined ? Number(points).toLocaleString() : '---'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PTS</span></div>
        </div>
      </div>

      {isNotOnArc && (
        <div className="glass" style={{ padding: '1rem', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '2rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>
          ⚠ WRONG NETWORK: Please switch to Arc Testnet to see your balance and stake.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <button onClick={refreshData} className="nav-btn" style={{ fontSize: '0.7rem', height: 'auto', padding: '0.5rem 1.5rem', borderRadius: '100px' }}>
              <RefreshCw size={14} className={isProcessing ? "animate-spin" : ""} style={{ marginRight: '0.5rem' }} /> Sync Wallet Data
          </button>
          <button 
            onClick={async () => {
              setIsProcessing(true);
              try {
                const hash = await writeContractAsync({
                  address: VAULT_ADDRESS as `0x${string}`,
                  abi: VAULT_ABI,
                  functionName: 'claimYield'
                });
                await publicClient?.waitForTransactionReceipt({ hash });
                setNotification({ message: 'Yield claimed successfully!', type: 'success' });
                refreshData();
              } catch (e: any) {
                setNotification({ message: e.message, type: 'error' });
              } finally {
                setIsProcessing(false);
              }
            }} 
            disabled={isProcessing || !stakedUSDC || (stakedUSDC as bigint) === 0n}
            className="glow-btn" 
            style={{ fontSize: '0.7rem', height: 'auto', padding: '0.5rem 1.5rem', borderRadius: '100px' }}
          >
              <Zap size={14} style={{ marginRight: '0.5rem' }} /> Claim Daily Points
          </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} className="neon-text" /> Stake USDC
          </h3>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Amount to Stake</label>
            <div style={{ position: 'relative' }}>
              <input type="number" placeholder="0.00" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} disabled={isProcessing} style={{ width: '100%', padding: '1.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '1.2rem', color: 'white' }} />
              <button onClick={() => setStakeAmount(formatUnits(usdcBalance as bigint || 0n, 6))} disabled={isProcessing} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--primary)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>MAX</button>
            </div>
          </div>
          <button className="glow-btn" style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }} onClick={handleAction} disabled={isProcessing || !stakeAmount}>
            {isProcessing ? <><Loader2 className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} /> PENDING...</> : <>Stake Assets <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} /></>}
          </button>
        </div>

        <div className="glass" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} className="neon-text" /> Withdraw USDC
          </h3>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Amount to Withdraw</label>
            <div style={{ position: 'relative' }}>
              <input type="number" placeholder="0.00" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} disabled={isProcessing || isLocked} style={{ width: '100%', padding: '1.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '1.2rem', color: 'white' }} />
              <button onClick={() => setStakeAmount(formatUnits(stakedUSDC as bigint || 0n, 6))} disabled={isProcessing || isLocked} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--primary)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>MAX</button>
            </div>
          </div>
          
          {isLocked && (stakedUSDC as bigint) > 0n && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              Assets Locked: Available in <strong>{daysLeft} days</strong>
            </div>
          )}

          <button className="nav-btn" style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem', background: isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(239, 68, 68, 0.1)', color: isLocked ? 'var(--text-muted)' : '#ef4444', border: isLocked ? '1px solid transparent' : '1px solid rgba(239, 68, 68, 0.3)' }} onClick={handleWithdraw} disabled={isProcessing || !stakeAmount || isLocked || (stakedUSDC as bigint) === 0n}>
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : isLocked && (stakedUSDC as bigint) > 0n ? 'Locked' : 'Withdraw Assets'}
          </button>
        </div>
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

export default Vault
