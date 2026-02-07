import { useState, useEffect, useCallback, useRef } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Activity, Layers, TrendingDown, ExternalLink, Lock, CheckCircle, Loader2, Zap, ArrowRightLeft, AlertCircle, X } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { BridgeKit } from '@circle-fin/bridge-kit'
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

const VAULT_ABI = [
  {"inputs":[{"internalType":"address","name":"agentAddr","type":"address"}],"name":"getEffectiveBond","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agents","outputs":[{"internalType":"uint256","name":"principalBond","type":"uint256"},{"internalType":"uint256","name":"lastUpdateTimestamp","type":"uint256"},{"internalType":"uint256","name":"totalSlashed","type":"uint256"},{"internalType":"uint256","name":"tasksCompleted","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"bondRequired","type":"uint256"},{"internalType":"uint256","name":"reward","type":"uint256"},{"internalType":"uint256","name":"duration","type":"uint256"}],"name":"acceptTask","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"taskCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"taskId","type":"uint256"},{"internalType":"bool","name":"success","type":"bool"},{"internalType":"uint256","name":"bonus","type":"uint256"}],"name":"finishTask","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
] as const

const USDC_ABI = [
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
] as const

const VAULT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x9df74fad46edfe62b1339cef5166955f06a61999'
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || '0x3600000000000000000000000000000000000000'
const ARC_ID = 5042002

const Dashboard = () => {
  const { address, isConnected, connector } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const [displayBond, setDisplayBond] = useState(0)
  const [stakeInput, setStakeInput] = useState('')
  const [isBridging, setIsBridging] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)
  const [pendingAction, setPendingAction] = useState<'approve' | 'stake' | null>(null)
  
  const isNotOnArc = chainId !== ARC_ID

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  // USDC Balance Check
  const { data: usdcBalanceRaw, refetch: refetchUSDC } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isNotOnArc }
  })

  // USDC Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, VAULT_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: !!address && !isNotOnArc }
  })

  const { data: contractOwner } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'owner',
    query: { enabled: !isNotOnArc }
  })

  const isOwner = address && contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase()

  const { data: agentData, refetch: refetchAgent } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'agents',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isNotOnArc }
  })

  const { data: effectiveBondRaw, refetch: refetchBond } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'getEffectiveBond',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isNotOnArc }
  })

  const { writeContract, data: hash, isPending: isTxPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const needsApprove = !isNotOnArc && allowance !== undefined && stakeInput && 
    allowance < parseUnits(stakeInput, 6)

  const refreshAll = useCallback(() => {
    refetchBond()
    refetchAllowance()
    refetchAgent()
    refetchUSDC()
  }, [refetchBond, refetchAllowance, refetchAgent, refetchUSDC])

  useEffect(() => {
    if (effectiveBondRaw) {
      const initialValue = parseFloat(formatUnits(effectiveBondRaw as bigint, 6))
      setDisplayBond(initialValue)
      const interval = setInterval(() => {
        setDisplayBond(prev => prev + (prev * 0.05) / (365 * 24 * 3600))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [effectiveBondRaw])

  const handleAction = async () => {
    if (!stakeInput || !address || !walletClient) return
    
    if (isNotOnArc) {
      setIsBridging(true)
      try {
        const kit = new BridgeKit()
        const sourceChainMap: Record<number, string> = {
          11155111: 'Ethereum_Sepolia',
          84532: 'Base_Sepolia',
          1: 'Ethereum',
          8453: 'Base'
        }
        
        const sourceChainName = sourceChainMap[chainId] || 'Ethereum_Sepolia'
        const provider = await connector?.getProvider()
        if (!provider) throw new Error("No provider found. Please reconnect your wallet.")

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
          amount: stakeInput
        })
        
        showNotification("CCTP Bridge Transaction Sent!", 'success')
        switchChain({ chainId: ARC_ID })
      } catch (error: any) {
        showNotification(`Bridge failed: ${error?.message || "Unknown error"}`, 'error')
      } finally {
        setIsBridging(false)
      }
    } else {
      if (needsApprove) {
        setPendingAction('approve')
        writeContract({
          address: USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [VAULT_ADDRESS as `0x${string}`, parseUnits(stakeInput, 6)],
        })
      } else {
        setPendingAction('stake')
        writeContract({
          address: VAULT_ADDRESS as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'stake',
          args: [parseUnits(stakeInput, 6)],
        })
      }
    }
  }

  useEffect(() => {
    if (isConfirmed && !isNotOnArc) {
      refreshAll()
      if (pendingAction === 'approve') {
        showNotification("USDC Approved! You can now stake.", 'success')
      } else if (pendingAction === 'stake') {
        showNotification("USDC Staked Successfully!", 'success')
        setStakeInput('')
      }
      setPendingAction(null)
    }
  }, [isConfirmed, refreshAll, isNotOnArc, pendingAction, showNotification])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', position: 'relative' }}>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              zIndex: 1000,
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : 'var(--primary)'}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minWidth: '300px',
              color: 'white'
            }}
          >
            {notification.type === 'success' && <CheckCircle size={20} color="#10b981" />}
            {notification.type === 'error' && <AlertCircle size={20} color="#ef4444" />}
            {notification.type === 'info' && <Loader2 size={20} className="animate-spin" color="var(--primary)" />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header>
        <div className="logo">
          <Shield className="neon-text" /> 
          NEON<span className="neon-text">SLASH</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isConnected && !isNotOnArc && (
            <div className="glass" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--primary)' }}>{usdcBalanceRaw ? parseFloat(formatUnits(usdcBalanceRaw as bigint, 6)).toFixed(2) : '0.00'}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>USDC</span>
            </div>
          )}
          <ConnectButton showBalance={isNotOnArc} />
        </div>
      </header>

      <main className="dashboard-container">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Left Column: Stats & Operations */}
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
              <StatCard 
                label="Effective Bond (on Arc)" 
                value={`${displayBond.toFixed(2)} USDC`} 
                sub="+5% APY Compounding" 
                icon={<TrendingDown size={16} style={{ transform: 'rotate(180deg)' }} />} 
                highlight
              />
              <StatCard 
                label="Tasks Completed" 
                value={agentData?.[3]?.toString() || "0"} 
                sub="Agent Excellence" 
                icon={<Shield size={16} />} 
              />
              <StatCard 
                label="Insurance Claims" 
                value={`${agentData ? formatUnits(agentData[2], 6) : "0.00"} USDC`} 
                sub="Slashed amount" 
                icon={<CheckCircle size={16} />} 
              />
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity className="neon-text" /> Reputation Nodes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <TaskCard 
                id="8201" title="Data Consensus" bond="0.1" reward="0.5" status="Active" difficulty="Medium" duration={3600}
                onSuccess={refreshAll} isNotOnArc={isNotOnArc} currentBond={displayBond} isOwner={isOwner}
                showNotification={showNotification}
              />
              <TaskCard 
                id="8205" title="Neural Audit" bond="1.0" reward="2.5" status="Priority" difficulty="Hard" duration={7200}
                onSuccess={refreshAll} isNotOnArc={isNotOnArc} currentBond={displayBond} isOwner={isOwner}
                showNotification={showNotification}
              />
              <TaskCard 
                id="8210" title="API Indexing" bond="0.01" reward="0.1" status="Active" difficulty="Low" duration={1800}
                onSuccess={refreshAll} isNotOnArc={isNotOnArc} currentBond={displayBond} isOwner={isOwner}
                showNotification={showNotification}
              />
            </div>
          </section>

          {/* Right Column: Staking & Bridge */}
          <aside>
            <div className="glass" style={{ padding: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.5rem 0' }}>
                <Layers size={18} className="neon-text" /> Reputation Staking
              </h3>
              
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount to Stake</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  style={{ fontSize: '1.5rem', fontWeight: 600 }}
                />
                <span style={{ position: 'absolute', right: '1rem', top: '2.4rem', color: 'var(--primary)', fontWeight: 600 }}>USDC</span>
              </div>

              <button 
                className="glow-btn" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: isNotOnArc ? 'var(--secondary)' : 'var(--primary)' }}
                onClick={handleAction}
                disabled={isConfirming || isBridging || isTxPending || !isConnected}
              >
                {isBridging || isConfirming || isTxPending ? <Loader2 className="animate-spin" size={18} /> : 
                 isNotOnArc ? <><ArrowRightLeft size={18} /> Bridge & Secure Bond</> : 
                 needsApprove ? 'Approve USDC' : 'Stake & Secure Bond'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Zap size={12} />
                Powered by Circle CCTP. Zero-slippage native transfers.
              </div>
            </div>

            <div className="glass" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px dashed var(--primary-glow)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Decay Monitor</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Maintaining activity prevents bond decay. Inactive for 14 more days will trigger 1% bond slash.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

const StatCard = ({ label, value, sub, icon, highlight }: any) => (
  <div className="glass" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
    {highlight && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span className="neon-text">{icon}</span>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{value}</div>
    <div style={{ fontSize: '0.7rem', color: highlight ? 'var(--primary)' : 'var(--text-muted)' }}>{sub}</div>
  </div>
)

const TaskCard = ({ id, title, bond, reward, status, difficulty, duration, onSuccess, isNotOnArc, currentBond, isOwner, showNotification }: any) => {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const lastDeployHash = useRef<string | null>(null)
  const lastFinishHash = useRef<string | null>(null)
  
  const [taskState, setTaskState] = useState<'idle' | 'processing' | 'done'>('idle')
  const [countdown, setCountdown] = useState(0)

  const { data: latestTaskCount } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'taskCount',
    query: { enabled: isSuccess && taskState === 'processing' }
  })

  useEffect(() => {
    // Stage 1: DEPLOY SUCCESS -> Start Timer
    if (isSuccess && hash && lastDeployHash.current !== hash && taskState === 'idle') {
      lastDeployHash.current = hash
      showNotification(`Task for ${title} submitted! Starting verification...`, 'info')
      setTaskState('processing')
      setCountdown(10)
      onSuccess()
    }
    // Stage 2: FINISH SUCCESS -> Reset
    if (isSuccess && hash && lastDeployHash.current !== hash && lastFinishHash.current !== hash && taskState === 'processing') {
      lastFinishHash.current = hash
      showNotification(`Task ${title} Secured! Bond Released.`, 'success')
      setTaskState('done')
      setTimeout(() => {
        setTaskState('idle')
        onSuccess()
      }, 3000)
    }
  }, [isSuccess, hash, title, onSuccess, taskState, showNotification])

  useEffect(() => {
    let timer: any
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000)
    } else if (countdown === 0 && taskState === 'processing') {
      handleSimulateComplete()
    }
    return () => clearTimeout(timer)
  }, [countdown, taskState])

  const handleSimulateComplete = async () => {
    if (!latestTaskCount) return
    if (!isOwner) {
      setTaskState('idle')
      showNotification("Permission Denied: Automated completion requires Admin wallet.", 'error')
      return
    }
    
    writeContract({
      address: VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'finishTask',
      args: [latestTaskCount, true, 0n],
    })
  }

  const isInsufficient = parseFloat(bond) > currentBond

  const handleDeploy = () => {
    if (isNotOnArc) {
      showNotification("Network Error: Please switch to Arc Network.", 'error')
      return
    }
    if (isInsufficient) {
      showNotification("Insufficient Funds: Please stake more USDC.", 'error')
      return
    }
    writeContract({
      address: VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'acceptTask',
      args: [parseUnits(bond, 6), parseUnits(reward, 6), BigInt(duration)],
    })
  }

  return (
    <motion.div 
      whileHover={{ x: isInsufficient ? 0 : 4 }} 
      className="glass" 
      style={{ 
        padding: '1.25rem', 
        opacity: isInsufficient ? 0.7 : 1,
        borderLeft: taskState === 'processing' ? '4px solid var(--primary)' : 
                   taskState === 'done' ? '4px solid var(--success, #10b981)' : '' 
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, color: isInsufficient ? 'var(--text-muted)' : 'white' }}>
            {title} 
            {taskState === 'processing' && <span className="neon-text" style={{ fontSize: '0.7rem' }}> (VERIFYING...)</span>}
            {taskState === 'done' && <span style={{ fontSize: '0.7rem', color: '#10b981' }}> (SECURED)</span>}
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{id} | {difficulty}</span>
        </div>
        {!isOwner && taskState === 'processing' ? (
           <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Requires Admin</span>
        ) : (
           <span className={`badge ${status === 'Priority' ? 'badge-warning' : 'badge-green'}`}>{status}</span>
        )}
      </div>

      {taskState === 'processing' && (
        <div style={{ marginTop: '0.5rem', height: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 10, ease: 'linear' }}
            style={{ height: '100%', background: 'var(--primary)' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.85rem', display: 'flex', gap: '1rem' }}>
          <span style={{ color: isInsufficient ? '#ef4444' : 'inherit' }}>
            <Lock size={12} style={{ display: 'inline' }} /> Bond: {bond} USDC
          </span>
          <span style={{ color: 'var(--primary)' }}>Reward: {reward} USDC</span>
        </div>
        <button 
          className={isInsufficient ? "btn-disabled" : "btn-secondary"} 
          style={{ 
            padding: '0.4rem 1rem', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: (isInsufficient || taskState === 'processing') ? 'not-allowed' : 'pointer',
            background: isInsufficient ? '#334155' : taskState === 'processing' ? 'rgba(var(--primary-rgb), 0.2)' : ''
          }}
          onClick={handleDeploy}
          disabled={isPending || isConfirming || isInsufficient || taskState === 'processing'}
        >
          {isPending || isConfirming ? <Loader2 className="animate-spin" size={14} /> : 
           taskState === 'processing' ? `Finalizing ${countdown}s` :
           taskState === 'done' ? <CheckCircle size={14} /> :
           isInsufficient ? 'Low Bond' : 'Deploy'}
        </button>
      </div>
    </motion.div>
  )
}

export default Dashboard
