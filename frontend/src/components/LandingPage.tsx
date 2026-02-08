import { motion } from 'framer-motion'
import { Shield, Zap, TrendingUp, Trophy, ArrowRight } from 'lucide-react'

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
          Predict the Future, <br />
          <span className="neon-text">Earn with Points</span>
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 3rem auto', lineHeight: 1.6 }}>
          The premier prediction market for Gold, News, and Football. 
          Stake USDC to earn Points, use Points to predict, and win big rewards.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="glow-btn" onClick={onLaunch}>
            Start Predicting <ArrowRight size={18} />
          </button>
          <button className="btn-secondary">
            How it Works
          </button>
        </div>
      </motion.div>

      <div style={{ marginTop: '8rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1000px' }}>
        <FeatureCard 
          icon={<Zap className="neon-text" />}
          title="Stake & Earn"
          desc="Stake USDC to instantly receive Slash Points. Points grow over time even if you don't play."
        />
        <FeatureCard 
          icon={<TrendingUp className="neon-text" />}
          title="Global Markets"
          desc="Predict on Gold prices, global news, or your favorite football teams in real-time."
        />
        <FeatureCard 
          icon={<Trophy className="neon-text" />}
          title="Mega Rewards"
          desc="Winning predictions grant massive point boosts. Redeem points for real USDC rewards."
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
