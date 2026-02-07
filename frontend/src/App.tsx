import { useState } from 'react'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'

function App() {
  const [isLaunched, setIsLaunched] = useState(false)

  return (
    <div className="app-container">
      {!isLaunched ? (
        <LandingPage onLaunch={() => setIsLaunched(true)} />
      ) : (
        <Dashboard />
      )}
    </div>
  )
}

export default App
