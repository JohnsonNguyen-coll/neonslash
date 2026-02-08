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

  return (
    <motion.div whileHover={{ y: -4 }} className="glass" style={{ padding: '1.5rem', opacity: market.resolved ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="badge-green badge">{market.category}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {market.resolved ? "Market Resolved" : `Ends: ${new Date(Number(market.deadline) * 1000).toLocaleDateString()}`}
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

      {!market.resolved && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount to Predict</span>
                <span className="neon-yellow" style={{ fontWeight: 800 }}>{betAmount} PTS</span>
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
                <span>1 Pt</span>
                <span>Max: {userPoints} Pts</span>
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
    </motion.div>
  )
}

const Dashboard = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const isNotOnArc = chainId !== ARC_ID

  const [activeCategory, setActiveCategory] = useState('All')
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)

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

  // Admin Form States
  const [mDesc, setMDesc] = useState('')
  const [mCat, setMCat] = useState('Gold')
  const [mDur, setMDur] = useState('3600')
  const [showAdmin, setShowAdmin] = useState(false)

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  // On-chain Data
  const { data: pointsRaw } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'getPoints', args: address ? [address] : undefined, query: { enabled: !!address && !isNotOnArc } })
  const { data: ownerAddress } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'owner', query: { enabled: !isNotOnArc } })
  const { data: markets, refetch: refetchMarkets } = useReadContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'getAllMarkets', query: { enabled: !isNotOnArc } })

  const isOwner = address && ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase()
  const { writeContract, isPending: isTxPending } = useWriteContract()

  const handleCreateMarket = () => {
    if (!mDesc) return
    writeContract({ address: VAULT_ADDRESS as `0x${string}`, abi: VAULT_ABI, functionName: 'createMarket', args: [mDesc, mCat, BigInt(mDur)] })
  }

  const filteredMarkets = markets ? (markets as any[]).map((m, idx) => ({ ...m, id: idx + 1 })).filter(m => activeCategory === 'All' || m.category === activeCategory) : []

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

        {showAdmin && isOwner && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass admin-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>📢 Market Factory</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group"><label>Question</label><input value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="Will Gold hit $3k?" /></div>
              <div className="form-group"><label>Category</label><select value={mCat} onChange={e => setMCat(e.target.value)}><option value="Gold">Gold</option><option value="Stocks">Stocks</option><option value="News">News</option><option value="Football">Football</option></select></div>
              <div className="form-group"><label>Duration (sec)</label><input value={mDur} onChange={e => setMDur(e.target.value)} type="number" /></div>
              <button className="glow-btn" onClick={handleCreateMarket} disabled={isTxPending}>
                {isTxPending ? <><Loader2 className="animate-spin" size={14} /> CREATING...</> : 'CREATE MARKET'}
              </button>
            </div>
          </motion.div>
        )}

        <div className="dashboard-grid">
          <aside className="sidebar">
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 className="section-title"><Layers size={18} className="neon-text" /> Categories</h3>
              {['All', 'Stocks', 'Gold', 'Football'].map(cat => (
                <button key={cat} className={`nav-item ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                  {cat === 'All' && <Globe size={16} />}
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

            <div className="glass" style={{ padding: '1.5rem' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                <HistoryIcon size={16} className="neon-yellow" /> History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {markets ? (markets as any[])
                  .map((m, idx) => ({ ...m, id: idx + 1 }))
                  .filter(m => m.resolved)
                  .slice(-5)
                  .reverse()
                  .map(m => (
                    <div key={m.id} style={{ fontSize: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '2px solid var(--primary)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '0.2rem' }}>{m.category}</div>
                      <div style={{ fontWeight: 600, lineHeight: 1.3, marginBottom: '0.4rem' }}>{m.description.slice(0, 40)}...</div>
                      <div className="neon-text" style={{ fontSize: '0.65rem', fontWeight: 800 }}>RESULT: {m.result ? 'YES' : 'NO'}</div>
                    </div>
                  )) : <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No settled markets yet.</div>}
              </div>
            </div>

            {isOwner && (
               <button className="nav-item" style={{ marginTop: '1rem' }} onClick={() => setShowAdmin(!showAdmin)}>
                 <PlusCircle size={16} /> {showAdmin ? 'Hide Admin' : 'Admin Panel'}
               </button>
            )}
          </aside>

          <section className="markets-grid">
            <div className="header-flex">
               <h2 className="title">{activeCategory} Markets</h2>
               <div className="fee-info">Market Driven • Community Resolved</div>
            </div>

            <div className="cards-layout">
              {filteredMarkets.length > 0 ? filteredMarkets.map(m => (
                <PredictionCard key={m.id} id={m.id} market={m} showNotification={showNotification} userPoints={Number(pointsRaw || 0)} refetchMarkets={refetchMarkets} />
              )) : (
                <div className="empty-state">No active markets found.</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .price-card { padding: 1rem; text-align: center; }
        .price-card .label { color: var(--text-muted); fontSize: 0.6rem; marginBottom: 0.3rem; }
        .price-card .value { fontSize: 1.2rem; fontWeight: 800; }
        .dashboard-container { padding: 2rem 4rem; max-width: 1400px; margin: 0 auto; }
        .dashboard-grid { display: grid; gridTemplateColumns: 280px 1fr; gap: 2rem; }
        .nav-item { width: 100%; text-align: left; padding: 0.75rem 1rem; background: none; border: 1px solid transparent; border-radius: 8px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; transition: 0.2s; marginBottom: 0.5rem; }
        .nav-item:hover { background: rgba(16, 185, 129, 0.05); color: white; }
        .nav-item.active { background: rgba(16, 185, 129, 0.1); border-color: var(--primary); color: var(--primary); fontWeight: 600; }
        .header-flex { display: flex; justify-content: space-between; align-items: baseline; marginBottom: 2rem; }
        .title { fontSize: 1.8rem; fontWeight: 800; margin: 0; }
        .fee-info { fontSize: 0.65rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; fontWeight: 700; }
        .cards-layout { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted); border: 2px dashed var(--border); border-radius: 16px; }
        .admin-panel input, .admin-panel select { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border); padding: 0.8rem; border-radius: 8px; color: white; margin-top: 0.4rem; }
        .form-group label { fontSize: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
        @media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr; } .cards-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}

export default Dashboard
