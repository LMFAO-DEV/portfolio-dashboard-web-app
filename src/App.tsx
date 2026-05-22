import { useState, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { Settings } from './components/Settings'
import { AskClaude } from './components/AskClaude'
import { Portfolio } from './pages/Portfolio'
import { Goal } from './pages/Goal'
import { Rebalance } from './pages/Rebalance'
import { usePrices } from './hooks/usePrices'
import { buildCopyForClaude, copyToClipboard } from './utils/copyForClaude'
import { usePortfolioStore } from './store/portfolio'

type Tab = 'portfolio' | 'goal' | 'rebalance'

const HASH_MAP: Record<string, Tab> = {
  '#/portfolio': 'portfolio',
  '#/goal': 'goal',
  '#/rebalance': 'rebalance',
}

function getTabFromHash(): Tab {
  return HASH_MAP[window.location.hash] ?? 'portfolio'
}

function App() {
  const [tab, setTab] = useState<Tab>(getTabFromHash)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [askClaudeOpen, setAskClaudeOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const lang = usePortfolioStore((s) => s.lang)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)

  const { prices, fxRate, lastUpdated, isLoading, isError, refetch } = usePrices()

  // Sync tab → URL hash
  useEffect(() => {
    window.location.hash = `#/${tab}`
  }, [tab])

  // Sync hash → tab on browser nav
  useEffect(() => {
    function onHashChange() {
      setTab(getTabFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  async function handleCopyForClaude() {
    const text = buildCopyForClaude(satellite, core, satelliteCashThb, mtsGoldNav, prices, fxRate, lang)
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-page">
      <TopBar
        activeTab={tab}
        onTabChange={setTab}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAskClaude={() => setAskClaudeOpen(true)}
        onCopyForClaude={handleCopyForClaude}
        onRefresh={() => refetch()}
        copyState={copyState}
      />

      <main className="flex-1 overflow-auto">
        {tab === 'portfolio' && (
          <Portfolio
            prices={prices}
            fxRate={fxRate}
            isLoading={isLoading}
            isError={isError}
            lastUpdated={lastUpdated}
            onCopyStateChange={setCopyState}
          />
        )}
        {tab === 'goal' && (
          <Goal prices={prices} fxRate={fxRate} />
        )}
        {tab === 'rebalance' && (
          <Rebalance prices={prices} fxRate={fxRate} />
        )}
      </main>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AskClaude
        open={askClaudeOpen}
        onClose={() => setAskClaudeOpen(false)}
        prices={prices}
        fxRate={fxRate}
      />
    </div>
  )
}

export default App
