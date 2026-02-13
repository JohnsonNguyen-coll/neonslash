import { useState, useEffect, useCallback } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useChainId,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  TrendingUp, 
  Trophy, 
  Coins, 
  Globe, 
  Layers, 
  Zap, 
  CheckCircle,
  X,
  PlusCircle,
  LayoutDashboard,
  Loader2,
  History as HistoryIcon
} from 'lucide-react'
import { ARC_ID, VAULT_ADDRESS, VAULT_ABI } from '../constants'

// --- COMPONENTS ---
const ClaimButton = ({ marketId, marketResult, showNotification, refetchMarkets }: any) => {
  const { address } = useAccount()
  const { data: bet } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'userBets',
    args: address ? [BigInt(marketId), address] : undefined,
    query: { enabled: !!address }
  })
  const { writeContract, isPending } = useWriteContract()

  if (!bet) return null
  const [amount, prediction, claimed] = bet as [bigint, boolean, boolean]

  const isWinner = prediction === marketResult
  const hasWonSomething = amount > 0n

  if (!hasWonSomething) return null
  if (claimed) return (
    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '0.5rem' }}>
      Points Claimed
    </div>
  )

  if (!isWinner) return (
    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#ef4444', paddingTop: '0.5rem' }}>
      Better luck next time
    </div>
  )

  const handleClaim = () => {
    writeContract({
      address: VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'claimWinnings',
      args: [BigInt(marketId)]
    }, {
      onSuccess: () => {
        showNotification("Winnings claimed! Check your balance.", "success")
        setTimeout(refetchMarkets, 2000)
      }
    })
  }

  return (
    <button
      className="glow-btn"
      style={{ width: '100%', padding: '0.7rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
      onClick={handleClaim}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="animate-spin" size={14} /> : 'CLAIM WINNINGS'}
    </button>
  )
}

const HistoryItem = ({ market, address, showNotification, refetchMarkets }: any) => {
  const { data: bet } = useReadContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'userBets',
    args: [BigInt(market.id), address as `0x${string}`],
  })

  if (!bet) return null
  const [amount, prediction, claimed] = bet as [bigint, boolean, boolean]
  if (amount === 0n) return null

  const isWinner = market.resolved && (prediction === market.result)
  
  const now = Math.floor(Date.now() / 1000)
  const isExpired = now > Number(market.deadline)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.6rem' }}>{market.category}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Market ID: #{market.id}</span>
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.8rem' }}>{market.description}</h4>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
           <div>Predicted: <span className="neon-yellow" style={{ fontWeight: 800 }}>{prediction ? 'YES' : 'NO'}</span></div>
           <div>Stake: <span style={{ fontWeight: 700 }}>{Number(amount).toLocaleString()} PTS</span></div>
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: '140px' }}>
        {!market.resolved ? (
          <div className="badge" style={{ background: isExpired ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: isExpired ? '#f59e0b' : '#3b82f6' }}>
            {isExpired ? 'RESOLVING...' : 'STILL ACTIVE'}
          </div>
        ) : isWinner ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
             <span className="badge-green badge">YOU WON</span>
             <ClaimButton marketId={market.id} marketResult={market.result} showNotification={showNotification} refetchMarkets={refetchMarkets} />
          </div>
        ) : (
          <div className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>LOST</div>
        )}
      </div>
    </motion.div>
  )
}

const PredictionCard = ({ id, market, showNotification, userPoints, refetchMarkets }: any) => {
  const [betAmount, setBetAmount] = useState(Math.min(userPoints, 50) || 1)
  const { writeContract, isPending } = useWriteContract()

  const handleBet = (side: boolean) => {
    if (betAmount > userPoints) return showNotification("Low points balance!", "error")
    writeContract({
      address: VAULT_ADDRESS as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'placeBet',
      args: [BigInt(id), side, BigInt(betAmount)]
    }, {
      onSuccess: () => {
        showNotification("Bet placed successfully!", "success")
        setTimeout(refetchMarkets, 2000)
      }
    })
  }

  const total = Number(market.totalYes) + Number(market.totalNo)
  const yesPct = total > 0 ? (Number(market.totalYes) / total * 100).toFixed(0) : '50'
  const noPct = total > 0 ? (Number(market.totalNo) / total * 100).toFixed(0) : '50'

  const now = Math.floor(Date.now() / 1000)
  const isExpired = now > Number(market.deadline)

  return (
    <motion.div whileHover={{ y: -4 }} className="glass" style={{ padding: '1.5rem', opacity: (market.resolved || isExpired) ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="badge-green badge">{market.category}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {market.resolved ? "Market Resolved" : isExpired ? "Awaiting Resolution" : `Ends: ${new Date(Number(market.deadline) * 1000).toLocaleDateString()}`}
        </span>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>{market.description}</h3>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          <span>YES: {Number(market.totalYes).toLocaleString()} Pts</span>
          <span>NO: {Number(market.totalNo).toLocaleString()} Pts</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${yesPct}%`, background: 'var(--primary)' }} />
          <div style={{ width: `${noPct}%`, background: '#334155' }} />
        </div>
      </div>

      {!market.resolved && !isExpired && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount to Predict</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input 
                    type="number"
                    min="1"
                    max={userPoints}
                    value={betAmount}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val > userPoints) setBetAmount(userPoints)
                      else if (val < 1) setBetAmount(1)
                      else setBetAmount(val)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: '#f59e0b',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      width: '80px',
                      textAlign: 'right',
                      padding: '2px 8px',
                      outline: 'none',
                    }}
                  />
                  <span className="neon-yellow" style={{ fontSize: '0.7rem', fontWeight: 800 }}>PTS</span>
                </div>
            </div>
            <input
              type="range"
              min="1"
              max={userPoints > 0 ? userPoints : 100}
              value={betAmount}
              onChange={e => setBetAmount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                <span style={{ cursor: 'pointer' }} onClick={() => setBetAmount(1)}>Min: 1 Pt</span>
                <span style={{ cursor: 'pointer' }} onClick={() => setBetAmount(userPoints)}>Max: {userPoints} Pts</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="glow-btn" style={{ flex: 1, padding: '0.7rem', fontSize: '0.75rem', background: '#10b981', border: 'none', borderRadius: '8px' }} onClick={() => handleBet(true)} disabled={isPending || userPoints <= 0}>
               {isPending ? <Loader2 className="animate-spin" size={14} /> : 'BET YES'}
            </button>
            <button className="glow-btn" style={{ flex: 1, padding: '0.7rem', fontSize: '0.75rem', background: '#ef4444', border: 'none', borderRadius: '8px' }} onClick={() => handleBet(false)} disabled={isPending || userPoints <= 0}>
               {isPending ? <Loader2 className="animate-spin" size={14} /> : 'BET NO'}
            </button>
          </div>
        </div>
      )}
      {market.resolved && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ textAlign: 'center', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
               Outcome: <span className="neon-text" style={{ fontWeight: 800 }}>{market.result ? 'YES' : 'NO'}</span>
            </div>
            {/* Winning Status & Claim Button */}
            <ClaimButton
               marketId={id}
               marketResult={market.result}
               showNotification={showNotification}
               refetchMarkets={refetchMarkets}
            />
         </div>
      )}
      {!market.resolved && isExpired && (
         <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            The event has ended. Waiting for the Prophet Agent to verify the result...
         </div>
      )}
    </motion.div>
  )
}

const Dashboard = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const isNotOnArc = chainId !== ARC_ID

  const [activeCategory, setActiveCategory] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const MARKETS_PER_PAGE = 6
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory])

  // Real-time Prices from Public APIs
  const [prices, setPrices] = useState({ BTC: 0, ETH: 0, SOL: 0, GOLD: 0, AAPL: 0, NVDA: 0 })

  const fetchRealPrices = async () => {
    try {
      // 1. Crypto & Gold from Binance
      const bResults = await Promise.all(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'PAXGUSDT'].map(async (s) => {
        try {
          const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${s}`);
          return await r.json();
        } catch {
          return { price: "0" };
        }
      }));

      // 2. Stocks from Finnhub with robust fallbacks
      const getStockPrice = async (symbol: string, fallback: number) => {
        try {
          const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=sandbox_c8v2pka201q9864234v0`);
          if (!r.ok) return fallback;
          const data = await r.json();
          return parseFloat(data.c) || fallback;
        } catch {
          return fallback;
        }
      };

      const aaplPrice = await getStockPrice('AAPL', 194.45);
      const nvdaPrice = await getStockPrice('NVDA', 135.80);

      setPrices({
        BTC: parseFloat(bResults[0].price) || 0,
        ETH: parseFloat(bResults[1].price) || 0,
        SOL: parseFloat(bResults[2].price) || 0,
        GOLD: parseFloat(bResults[3].price) || 0,
        AAPL: aaplPrice,
        NVDA: nvdaPrice
      });
    } catch (err) {
      console.warn("Pricing engine warning:", err);
    }
  }

  useEffect(() => {
    fetchRealPrices()
    const timer = setInterval(fetchRealPrices, 10000)
    return () => clearInterval(timer)
  }, [])

  const { data: pointsRaw } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'getPoints', args: address ? [address] : undefined, query: { enabled: !!address && !isNotOnArc } })
  const { data: markets, refetch: refetchMarkets } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'getAllMarkets', query: { enabled: !isNotOnArc } })

  // Main Market Grid: Show only active (not resolved and not expired)
  const activeMarkets = markets ? (markets as any[]).map((m, idx) => ({ ...m, id: idx + 1 })).filter(m => {
    const matchCategory = activeCategory === 'All' || m.category === activeCategory
    return matchCategory && !m.resolved
  }) : []

  // History: This is handled by a special case in the UI to show all markets the user bet on
  const totalPages = Math.max(1, Math.ceil(activeMarkets.length / MARKETS_PER_PAGE))
  const paginatedMarkets = activeMarkets.slice((currentPage - 1) * MARKETS_PER_PAGE, currentPage * MARKETS_PER_PAGE)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'white' }}>
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 20, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="notification">
            <CheckCircle size={20} color={notification.type === 'success' ? "#10b981" : "#ef4444"} />
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="close-notify"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="dashboard-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="glass price-card"><div className="label">BITCOIN</div><div className="value">${prices.BTC.toLocaleString()}</div></div>
          <div className="glass price-card"><div className="label">ETHEREUM</div><div className="value">${prices.ETH.toLocaleString()}</div></div>
          <div className="glass price-card"><div className="label">SOLANA</div><div className="value">${prices.SOL.toFixed(2)}</div></div>
          <div className="glass price-card"><div className="label">GOLD</div><div className="value">${prices.GOLD.toFixed(2)}</div></div>
        </div>

        <div className="dashboard-grid">
          <aside className="sidebar">
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 className="section-title"><Layers size={18} className="neon-text" /> Navigation</h3>
              {['All', 'History', 'Stocks', 'Gold', 'Football'].map(cat => (
                <button key={cat} className={`nav-item ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                  {cat === 'All' && <Globe size={16} />}
                  {cat === 'History' && <HistoryIcon size={16} />}
                  {cat === 'Gold' && <Coins size={16} />}
                  {cat === 'Stocks' && <TrendingUp size={16} />}
                  {cat === 'Football' && <Trophy size={16} />}
                  {cat}
                </button>
              ))}
            </div>

            <div className="glass highlight-box" style={{ padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem' }}>
              <Zap size={24} className="neon-text" style={{ marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Need Points?</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Stake your USDC in the Neon Vault to generate prediction points instantly.</p>
              <button className="glow-btn" style={{ width: '100%' }} onClick={() => onNavigate?.('vault')}>Enter Vault</button>
            </div>
          </aside>

          <section className="markets-grid">
            <div className="header-flex">
               <h2 className="title">{activeCategory} Markets</h2>
               <div className="fee-info">Market Driven • Community Resolved</div>
            </div>

            <div className="cards-layout" style={{ gridTemplateColumns: activeCategory === 'History' ? '1fr' : 'repeat(2, 1fr)' }}>
              {activeCategory === 'History' ? (
                markets && (markets as any[]).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(markets as any[]).map((m, idx) => ({ ...m, id: idx + 1 })).reverse().map(m => (
                      <HistoryItem key={m.id} market={m} address={address} showNotification={showNotification} refetchMarkets={refetchMarkets} />
                    )).filter((item: any) => item !== null)}
                  </div>
                ) : <div className="empty-state">No betting history found.</div>
              ) : (
                paginatedMarkets.length > 0 ? paginatedMarkets.map(m => (
                  <PredictionCard key={m.id} id={m.id} market={m} showNotification={showNotification} userPoints={Number(pointsRaw || 0)} refetchMarkets={refetchMarkets} />
                )) : (
                  <div className="empty-state">No active {activeCategory !== 'All' ? activeCategory : ''} markets found.</div>
                )
              )}
            </div>

            {activeCategory !== 'History' && activeMarkets.length > MARKETS_PER_PAGE && (
              <div className="pagination">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="page-btn"
                >
                  Previous
                </button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page} 
                      onClick={() => setCurrentPage(page)}
                      className={`page-num ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        .price-card { padding: 1rem; text-align: center; }
        .price-card .label { color: var(--text-muted); font-size: 0.6rem; margin-bottom: 0.3rem; }
        .price-card .value { font-size: 1.2rem; font-weight: 800; }
        .dashboard-container { padding: 2rem 4rem; max-width: 1400px; margin: 0 auto; }
        .dashboard-grid { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; }
        .nav-item { width: 100%; text-align: left; padding: 0.75rem 1rem; background: none; border: 1px solid transparent; border-radius: 8px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; transition: 0.2s; margin-bottom: 0.5rem; }
        .nav-item:hover { background: rgba(16, 185, 129, 0.05); color: white; }
        .nav-item.active { background: rgba(16, 185, 129, 0.1); border-color: var(--primary); color: var(--primary); font-weight: 600; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .title { font-size: 1.8rem; font-weight: 800; margin: 0; }
        .fee-info { font-size: 0.65rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; opacity: 0.8; }
        .cards-layout { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted); border: 2px dashed var(--border); border-radius: 16px; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 3rem; margin-bottom: 2rem; }
        .page-btn { padding: 0.6rem 1.2rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: white; cursor: pointer; font-size: 0.8rem; transition: 0.2s; }
        .page-btn:hover:not(:disabled) { background: rgba(16, 185, 129, 0.1); border-color: var(--primary); }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-numbers { display: flex; gap: 0.5rem; }
        .page-num { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: 1px solid transparent; border-radius: 6px; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; }
        .page-num.active { background: var(--primary); color: #000; font-weight: 700; }
        .notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #0a0f1a; border: 1px solid var(--border); padding: 1rem 1.5rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; z-index: 10000; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        .close-notify { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.2rem; display: flex; align-items: center; justify-content: center; }
        .admin-panel input, .admin-panel select { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border); padding: 0.8rem; border-radius: 8px; color: white; margin-top: 0.4rem; }
        .form-group label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr; } .cards-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}

export default Dashboard
