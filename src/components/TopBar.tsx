import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import type { Lang } from '../types'

type Tab = 'portfolio' | 'goal' | 'rebalance'

interface TopBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onOpenSettings: () => void
  onOpenAskClaude: () => void
  onCopyForClaude: () => void
  onRefresh: () => void
  copyState: 'idle' | 'copied'
}

export function TopBar({
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenAskClaude,
  onCopyForClaude,
  onRefresh,
  copyState,
}: TopBarProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const setLang = usePortfolioStore((s) => s.setLang)
  const t = useStrings(lang)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'portfolio', label: t.tabPortfolio },
    { id: 'goal', label: t.tabGoal },
    { id: 'rebalance', label: t.tabRebalance },
  ]

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-12 gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
            $
          </div>
          <span className="font-bold text-gray-900 text-sm">my port.</span>
          <span className="hidden sm:block text-xs text-gray-400">core + satellite</span>
        </div>

        {/* Center tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Ask Claude */}
          <button
            onClick={onOpenAskClaude}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-medium transition-colors"
          >
            {t.btnAskClaude}
          </button>

          {/* Copy for Claude */}
          <button
            onClick={onCopyForClaude}
            title={t.btnCopyForClaude}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors text-base"
          >
            {copyState === 'copied' ? '✓' : '⧉'}
          </button>

          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === 'th' ? 'en' : 'th' as Lang)}
            className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-mono font-medium hover:bg-gray-50 transition-colors"
          >
            <span className={lang === 'th' ? 'text-gray-900 font-bold' : 'text-gray-400'}>TH</span>
            <span className="text-gray-300 mx-0.5">/</span>
            <span className={lang === 'en' ? 'text-gray-900 font-bold' : 'text-gray-400'}>EN</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title={t.btnRefresh}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            ↻
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title={t.btnSettings}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Mobile tab bar (shown below header on small screens) */}
      <div className="md:hidden flex border-t border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  )
}
