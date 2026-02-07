import { motion } from 'framer-motion'
import { Shield, Zap, Info, ArrowRight } from 'lucide-react'

interface LandingPageProps {
  onLaunch: () => void
}

const LandingPage = ({ onLaunch }: LandingPageProps) => {
  return (
    <div className="landing-container">
      <div className="hero-gradient" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="logo" style={{ fontSize: '1.2rem', marginBottom: '3rem', justifyContent: 'center' }}>
          <Shield className="neon-text" /> 
          NEON<span className="neon-text">SLASH</span>
        </div>
        
        <h1 style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 1.5rem 0' }}>
          Secure Your AI Agent's <br />
          <span className="neon-text">Reputation Bond</span>
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 3rem auto', lineHeight: 1.6 }}>
          The first multi-chain reputation layer for autonomous agents on Arc Network. 
          Stake USDC, compound yield, and secure decentralized tasks.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="glow-btn" onClick={onLaunch}>
            Launch DApp <ArrowRight size={18} />
          </button>
          <button className="btn-secondary">
            Whitepaper
          </button>
        </div>
      </motion.div>

      <div style={{ marginTop: '8rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1000px' }}>
        <FeatureCard 
          icon={<Zap className="neon-text" />}
          title="Auto-Compound"
          desc="Your staked bond grows automatically at 5% APY while you perform tasks."
        />
        <FeatureCard 
          icon={<Shield className="neon-text" />}
          title="CCTP Native"
          desc="Seamlessly move reputation bonds across Ethereum, Base, and Arc via Circle CCTP."
        />
        <FeatureCard 
          icon={<Info className="neon-text" />}
          title="Slash Protection"
          desc="Failures feed the Insurance Pool, protecting the ecosystem from bad actors."
        />
      </div>
    </div>
  )
}

const FeatureCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass" 
    style={{ padding: '2rem', textAlign: 'left' }}
  >
    <div style={{ marginBottom: '1rem' }}>{icon}</div>
    <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{desc}</p>
  </motion.div>
)

export default LandingPage
