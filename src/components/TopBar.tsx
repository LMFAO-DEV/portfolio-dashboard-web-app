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
    <header className="sticky top-0 z-30 bg-surface border-b border-surface-border">
      <div className="flex items-center justify-between px-4 h-14 gap-3 max-w-screen-xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-accent/30">
            ₿
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white text-sm tracking-tight">Personal Portfolio</span>
            <span className="hidden sm:block text-[10px] text-faint tracking-wide">core + satellite</span>
          </div>
        </div>

        {/* Center tabs — desktop */}
        <nav className="hidden md:flex items-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-muted hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-sm" />
              )}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Ask Claude */}
          <button
            onClick={onOpenAskClaude}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 text-xs font-semibold transition-colors border border-accent/20"
          >
            ✦ {t.btnAskClaude}
          </button>

          {/* Copy for Claude */}
          <button
            onClick={onCopyForClaude}
            title={t.btnCopyForClaude}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-raised text-muted hover:text-white transition-colors text-base"
          >
            {copyState === 'copied' ? '✓' : '⧉'}
          </button>

          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === 'th' ? 'en' : 'th' as Lang)}
            className="px-2.5 py-1.5 rounded-lg border border-surface-border text-xs font-mono font-medium hover:bg-surface-raised transition-colors"
          >
            <span className={lang === 'th' ? 'text-white font-bold' : 'text-faint'}>TH</span>
            <span className="text-faint mx-0.5">/</span>
            <span className={lang === 'en' ? 'text-white font-bold' : 'text-faint'}>EN</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title={t.btnRefresh}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-raised text-muted hover:text-white transition-colors"
          >
            ↻
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title={t.btnSettings}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-raised text-muted hover:text-white transition-colors"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-t border-surface-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-muted hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-sm" />
            )}
          </button>
        ))}
      </div>
    </header>
  )
}
