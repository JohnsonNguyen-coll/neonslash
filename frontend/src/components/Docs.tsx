import { motion } from 'framer-motion'
import { BookOpen, Shield, Zap, TrendingUp, Trophy, ArrowLeft, Info, HelpCircle, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Docs = () => {
  const navigate = useNavigate()

  return (
    <div className="landing-container" style={{ textAlign: 'left', alignItems: 'flex-start', maxWidth: '1000px', margin: '0 auto', padding: '6rem 2rem' }}>
      <div className="hero-gradient" />
      
      <motion.button 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="btn-secondary"
        style={{ marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div className="glass" style={{ padding: '0.75rem', borderRadius: '12px' }}>
            <BookOpen className="neon-text" size={24} />
          </div>
          <h1 style={{ fontSize: '3rem', margin: 0 }}>Documentation</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '4rem', maxWidth: '800px' }}>
          Welcome to the NeonSlashVault technical documentation. Learn how to stake, predict, and earn rewards on our autonomous prediction market platform.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '4rem', width: '100%' }}>
        {/* Sidebar Nav */}
        <aside style={{ position: 'sticky', top: '2rem' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sections</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SidebarItem icon={<Info size={18} />} label="Overview" active />
            <SidebarItem icon={<Zap size={18} />} label="Slash Points" />
            <SidebarItem icon={<TrendingUp size={18} />} label="Market Mechanics" />
            <SidebarItem icon={<Trophy size={18} />} label="Rewards & Payouts" />
            <SidebarItem icon={<FileText size={18} />} label="Smart Contracts" />
            <SidebarItem icon={<HelpCircle size={18} />} label="FAQ" />
          </ul>
        </aside>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          <section id="overview">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield className="neon-text" size={24} /> What is NeonSlashVault?
            </h2>
            <div className="glass" style={{ padding: '2rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              NeonSlashVault is a decentralized prediction market platform built for high-speed assets like Gold, News events, and Football matches. 
              Our unique <span className="neon-text">Slash Points</span> system removes the friction of traditional betting by allowing users to earn participation points that can be used to back their predictions.
              <br /><br />
              Unlike traditional platforms, winners don't just take the losers' money; they earn point multipliers and climb the global leaderboards for USDC treasury distributions.
            </div>
          </section>

          <section id="staking">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Zap className="neon-text" size={24} /> Staking & Points
            </h2>
            <div className="glass" style={{ padding: '2rem', lineHeight: 1.7 }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Everything starts with USDC. By staking USDC into the Vault, you provide liquidity to the ecosystem and receive Slash Points.
              </p>
              <ul style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li><strong>Instant Points:</strong> Receive 100 Points for every 1 USDC staked instantly.</li>
                <li><strong>Passive Yield:</strong> Your points grow at a base rate of 2% per day while staked.</li>
                <li><strong>No Lock-up:</strong> Withdraw your USDC anytime (3-day cooldown applies for point preservation).</li>
              </ul>
            </div>
          </section>

          <section id="markets">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp className="neon-text" size={24} /> Market Mechanics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="glass" style={{ padding: '1.5rem' }}>
                <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Resolvers</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Our markets are resolved by autonomous AI agents using Chainlink Price Feeds and decentralized oracles to ensure fairness.
                </p>
              </div>
              <div className="glass" style={{ padding: '1.5rem' }}>
                <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Win Multipliers</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Successful predictions grant a 1.8x to 5x multiplier on the points used, depending on the market odds.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const SidebarItem = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <li style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.75rem', 
    color: active ? 'white' : 'var(--text-muted)',
    fontSize: '1rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: '0.2s',
    padding: '0.5rem 0'
  }}>
    <span style={{ color: active ? 'var(--primary)' : 'inherit' }}>{icon}</span>
    {label}
  </li>
)

export default Docs
