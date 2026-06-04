import { useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import type { Alert } from '../types'

const severityStyle: Record<Alert['severity'], string> = {
  info:    'border-l-primary bg-primary/[0.03]',
  warning: 'border-l-warning bg-warning/[0.04]',
  danger:  'border-l-loss bg-loss/[0.04]',
}

const dotStyle: Record<Alert['severity'], string> = {
  info:    'bg-primary',
  warning: 'bg-warning',
  danger:  'bg-loss',
}

export function AlertBell() {
  const alerts = usePortfolioStore((s) => s.alerts)
  const dismissAlert = usePortfolioStore((s) => s.dismissAlert)
  const clearDismissed = usePortfolioStore((s) => s.clearDismissed)
  const [open, setOpen] = useState(false)

  const active = alerts.filter((a) => !a.dismissed)
  const count = active.length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Alerts"
        className="relative w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink rounded hover:bg-canvas-soft transition-colors"
      >
        🔔
        {count > 0 && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-loss flex items-center justify-center text-[8px] text-white font-normal leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-ink/20 z-40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-canvas z-50 flex flex-col overflow-hidden shadow-panel">
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
              <h2 className="text-lg font-light text-ink">Alerts</h2>
              <div className="flex items-center gap-2">
                {alerts.some((a) => a.dismissed) && (
                  <button
                    onClick={clearDismissed}
                    className="text-xs text-ink-mute hover:text-ink transition-colors px-2 py-1 rounded border border-hairline"
                  >
                    Clear dismissed
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink transition-colors text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm text-ink-mute text-center py-10">No alerts. Portfolio is healthy.</p>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-lg border border-hairline border-l-4 p-3 ${severityStyle[a.severity]} ${a.dismissed ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotStyle[a.severity]}`} />
                        <div>
                          <p className="text-sm font-normal text-ink">{a.title}</p>
                          <p className="text-xs text-ink-mute mt-0.5">{a.body}</p>
                        </div>
                      </div>
                      {!a.dismissed && (
                        <button
                          onClick={() => dismissAlert(a.id)}
                          className="text-ink-mute hover:text-ink transition-colors text-base shrink-0"
                          title="Dismiss"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
