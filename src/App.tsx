import { useState, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { Settings } from './components/Settings'
import { AskClaude } from './components/AskClaude'
import { Ledger } from './components/Ledger'
import { Portfolio } from './pages/Portfolio'
import { Goal } from './pages/Goal'
import { Rebalance } from './pages/Rebalance'
import { usePrices } from './hooks/usePrices'
import { buildCopyForClaude, copyToClipboard } from './utils/copyForClaude'
import { computeTotals } from './utils/calc'
import { computeAlerts } from './utils/alerts'
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
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const lang = usePortfolioStore((s) => s.lang)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const coreCashThb = usePortfolioStore((s) => s.coreCashThb)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const recordSnapshot = usePortfolioStore((s) => s.recordSnapshot)
  const satTargets = usePortfolioStore((s) => s.satTargets)
  const satelliteCashThb_ = usePortfolioStore((s) => s.satelliteCashThb)
  const setAlerts = usePortfolioStore((s) => s.setAlerts)
  const existingAlerts = usePortfolioStore((s) => s.alerts)
  const driftThresholdPct = usePortfolioStore((s) => s.driftThresholdPct)

  const { prices, fxRate, lastUpdated, isLoading, isError, refetch } = usePrices()

  // Recompute alerts whenever prices / holdings change.
  useEffect(() => {
    if (isLoading || !fxRate) return
    const fresh = computeAlerts({
      core, satellite, prices, fxRate, mtsGoldNav, satTargets,
      satelliteCashThb: satelliteCashThb_, coreCashThb, driftThresholdPct,
    })
    // Preserve dismissed state for alerts that still exist.
    const dismissedIds = new Set(existingAlerts.filter((a) => a.dismissed).map((a) => a.id))
    setAlerts(fresh.map((a) => ({ ...a, dismissed: dismissedIds.has(a.id) })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, prices, fxRate, core, satellite, mtsGoldNav, satTargets, satelliteCashThb_, coreCashThb, driftThresholdPct])

  // Record a daily net-worth snapshot once prices + FX are loaded.
  useEffect(() => {
    if (isLoading || !fxRate || (core.length === 0 && satellite.length === 0)) return
    const { totalThb, coreThb, satThb } = computeTotals(
      satellite, core, prices, fxRate, mtsGoldNav, satelliteCashThb, coreCashThb,
    )
    if (totalThb <= 0) return
    const date = new Date().toISOString().slice(0, 10)
    recordSnapshot({ date, totalThb, coreThb, satThb, vooUsd: prices['VOO'] })
  }, [isLoading, prices, fxRate, satellite, core, mtsGoldNav, satelliteCashThb, coreCashThb, recordSnapshot])

  useEffect(() => {
    window.location.hash = `#/${tab}`
  }, [tab])

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
    <div className="flex flex-col min-h-screen bg-canvas-soft">
      {/* Stripe-style gradient mesh backdrop — bleeds through the glassy TopBar */}
      <div className="fixed inset-x-0 top-0 h-72 pointer-events-none z-0 mesh-bg" aria-hidden="true" />

      <TopBar
        activeTab={tab}
        onTabChange={setTab}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAskClaude={() => setAskClaudeOpen(true)}
        onOpenLedger={() => setLedgerOpen(true)}
        onCopyForClaude={handleCopyForClaude}
        onRefresh={() => refetch()}
        copyState={copyState}
      />

      <main className="relative z-10 flex-1 overflow-auto">
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
      <Ledger open={ledgerOpen} onClose={() => setLedgerOpen(false)} fxRate={fxRate} />
    </div>
  )
}

export default App
