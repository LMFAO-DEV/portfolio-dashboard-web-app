import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { AlertBell } from './AlertBell'
import type { Lang } from '../types'

type Tab = 'portfolio' | 'goal' | 'rebalance'

interface TopBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onOpenSettings: () => void
  onOpenAskClaude: () => void
  onOpenLedger: () => void
  onCopyForClaude: () => void
  onRefresh: () => void
  copyState: 'idle' | 'copied'
}

export function TopBar({
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenAskClaude,
  onOpenLedger,
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
    <header className="sticky top-0 z-30 bg-canvas/[0.88] backdrop-blur-md">
      <div className="border-b border-hairline/70">
        <div className="flex items-center justify-between px-5 h-14 gap-3 max-w-screen-xl mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-soft to-primary flex items-center justify-center text-xs font-normal text-white shadow-[0_2px_8px_rgba(83,58,253,0.32)]">
              ₿
            </div>
            <div className="flex flex-col leading-none gap-[3px]">
              <span className="font-light text-ink text-sm tracking-[-0.01em]">Personal Portfolio</span>
              <span className="hidden sm:block text-[10px] text-ink-mute tracking-[0.06em] uppercase">Core + Satellite</span>
            </div>
          </div>

          {/* Center tabs — desktop, spans full header height for underline indicator */}
          <nav className="hidden md:flex items-center h-full gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative h-full px-4 text-sm font-light transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-ink-mute hover:text-ink'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-primary rounded-t-[2px]" />
                )}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenAskClaude}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-pill text-[13px] font-normal bg-primary text-white hover:bg-primary-deep active:bg-primary-press transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.28)]"
            >
              ✦ {t.btnAskClaude}
            </button>

            <button
              onClick={onCopyForClaude}
              title={t.btnCopyForClaude}
              className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink rounded hover:bg-canvas-soft transition-colors text-base"
            >
              {copyState === 'copied' ? '✓' : '⧉'}
            </button>

            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th' as Lang)}
              className="px-2.5 py-1.5 rounded text-xs font-normal hover:bg-canvas-soft transition-colors"
            >
              <span className={lang === 'th' ? 'text-primary' : 'text-ink-mute'}>TH</span>
              <span className="text-ink-mute/40 mx-0.5">/</span>
              <span className={lang === 'en' ? 'text-primary' : 'text-ink-mute'}>EN</span>
            </button>

            <AlertBell />

            <button
              onClick={onOpenLedger}
              title={t.btnLedger}
              className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink rounded hover:bg-canvas-soft transition-colors"
            >
              ▤
            </button>

            <button
              onClick={onRefresh}
              title={t.btnRefresh}
              className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink rounded hover:bg-canvas-soft transition-colors"
            >
              ↻
            </button>

            <button
              onClick={onOpenSettings}
              title={t.btnSettings}
              className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink rounded hover:bg-canvas-soft transition-colors"
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-t border-hairline/60 bg-canvas/80 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 py-2.5 text-xs font-light transition-colors ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-ink-mute hover:text-ink'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary rounded-t-[2px]" />
            )}
          </button>
        ))}
      </div>
    </header>
  )
}
