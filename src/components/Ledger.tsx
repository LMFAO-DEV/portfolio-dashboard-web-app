import { useMemo, useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { derivePosition } from '../utils/calc'
import { fmtThb, fmtThbRaw, fmtUsd, fmtPct } from '../utils/format'
import type { Port, TxType, Transaction, Dividend } from '../types'

interface LedgerProps {
  open: boolean
  onClose: () => void
  fxRate: number
}

const inputCls = 'w-full rounded border border-hairline-input bg-canvas px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-primary transition-colors'
const today = () => new Date().toISOString().slice(0, 10)
const newId = () => (crypto.randomUUID?.() ?? String(Date.now() + Math.random()))

function divThb(d: Dividend, fxNow: number): number {
  if (d.amountThb != null) return d.amountThb
  return (d.amountUsd ?? 0) * (d.fxRate ?? fxNow)
}

export function Ledger({ open, onClose, fxRate }: LedgerProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const transactions = usePortfolioStore((s) => s.transactions)
  const dividends = usePortfolioStore((s) => s.dividends)
  const addTransaction = usePortfolioStore((s) => s.addTransaction)
  const removeTransaction = usePortfolioStore((s) => s.removeTransaction)
  const addDividend = usePortfolioStore((s) => s.addDividend)
  const removeDividend = usePortfolioStore((s) => s.removeDividend)

  const [sub, setSub] = useState<'tx' | 'div'>('tx')

  const [txForm, setTxForm] = useState({
    date: today(), port: 'satellite' as Port, ticker: '', type: 'buy' as TxType,
    shares: '', price: '', fx: '', fee: '', isTHB: false,
  })
  const [divForm, setDivForm] = useState({
    date: today(), ticker: '', amount: '', fx: '', isTHB: false,
  })

  // Per-ticker derived summary from the transaction ledger.
  const positions = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const tx of transactions) {
      const key = `${tx.port}:${tx.ticker}`
      const arr = groups.get(key) ?? []
      arr.push(tx)
      groups.set(key, arr)
    }
    return [...groups.entries()].map(([key, txs]) => {
      const [, ticker] = key.split(':')
      return { ticker, isTHB: !!txs[0].isTHB, ...derivePosition(txs) }
    })
  }, [transactions])

  // Dividend income aggregates: trailing-12-month + all-time, per ticker.
  const divSummary = useMemo(() => {
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 1)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const byTicker = new Map<string, { ttm: number; all: number }>()
    let totalTtm = 0
    let totalAll = 0
    for (const d of dividends) {
      const thb = divThb(d, fxRate)
      const cur = byTicker.get(d.ticker) ?? { ttm: 0, all: 0 }
      cur.all += thb
      totalAll += thb
      if (d.date >= cutoffStr) {
        cur.ttm += thb
        totalTtm += thb
      }
      byTicker.set(d.ticker, cur)
    }
    const costFor = (ticker: string) => positions.find((p) => p.ticker === ticker)?.totalInvestedThb ?? 0
    const rows = [...byTicker.entries()].map(([ticker, v]) => {
      const cost = costFor(ticker)
      return { ticker, ttm: v.ttm, all: v.all, yieldOnCost: cost > 0 ? (v.ttm / cost) * 100 : null }
    })
    return { rows, totalTtm, totalAll }
  }, [dividends, fxRate, positions])

  function submitTx() {
    const ticker = txForm.ticker.trim().toUpperCase()
    const shares = parseFloat(txForm.shares) || 0
    const price = parseFloat(txForm.price) || 0
    if (!ticker || shares <= 0 || price <= 0) return
    const tx: Transaction = {
      id: newId(),
      date: txForm.date || today(),
      port: txForm.port,
      ticker,
      type: txForm.type,
      shares,
      isTHB: txForm.isTHB,
      ...(txForm.isTHB
        ? { priceThb: price }
        : { priceUsd: price, fxRate: parseFloat(txForm.fx) || fxRate }),
      ...(txForm.fee ? { feeThb: parseFloat(txForm.fee) || 0 } : {}),
    }
    addTransaction(tx)
    setTxForm((f) => ({ ...f, ticker: '', shares: '', price: '', fee: '' }))
  }

  function submitDiv() {
    const ticker = divForm.ticker.trim().toUpperCase()
    const amount = parseFloat(divForm.amount) || 0
    if (!ticker || amount <= 0) return
    const d: Dividend = {
      id: newId(),
      date: divForm.date || today(),
      ticker,
      ...(divForm.isTHB
        ? { amountThb: amount }
        : { amountUsd: amount, fxRate: parseFloat(divForm.fx) || fxRate }),
    }
    addDividend(d)
    setDivForm((f) => ({ ...f, ticker: '', amount: '' }))
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-ink/20 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-canvas z-50 flex flex-col overflow-hidden shadow-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h2 className="text-lg font-light text-ink">{t.ledger}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink transition-colors text-xl">×</button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-hairline px-5">
          {([['tx', t.tabTransactions], ['div', t.tabDividends]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSub(key)}
              className={`relative py-2.5 px-3 text-sm font-light transition-colors ${sub === key ? 'text-primary' : 'text-ink-mute hover:text-ink'}`}
            >
              {label}
              {sub === key && <span className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-primary rounded-t-[2px]" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sub === 'tx' ? (
            <>
              <p className="text-xs text-ink-mute">{t.ledgerHint}</p>

              {/* Add transaction form */}
              <div className="rounded-lg border border-hairline bg-canvas-soft p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
                  <select value={txForm.port} onChange={(e) => setTxForm((f) => ({ ...f, port: e.target.value as Port }))} className={inputCls}>
                    <option value="satellite">Satellite</option>
                    <option value="core">Core</option>
                  </select>
                  <input type="text" placeholder={t.fieldTicker} value={txForm.ticker} onChange={(e) => setTxForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))} className={`${inputCls} uppercase`} />
                  <select value={txForm.type} onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value as TxType }))} className={inputCls}>
                    <option value="buy">{t.typeBuy}</option>
                    <option value="sell">{t.typeSell}</option>
                  </select>
                  <input type="number" min="0" step="0.0001" placeholder={t.fieldShares} value={txForm.shares} onChange={(e) => setTxForm((f) => ({ ...f, shares: e.target.value }))} className={inputCls} />
                  <input type="number" min="0" step="0.01" placeholder={`${t.fieldPrice} ${txForm.isTHB ? '฿' : '$'}`} value={txForm.price} onChange={(e) => setTxForm((f) => ({ ...f, price: e.target.value }))} className={inputCls} />
                  {!txForm.isTHB && (
                    <input type="number" min="0" step="0.01" placeholder={`${t.fieldFx} (${fxRate ? fxRate.toFixed(2) : '—'})`} value={txForm.fx} onChange={(e) => setTxForm((f) => ({ ...f, fx: e.target.value }))} className={inputCls} />
                  )}
                  <input type="number" min="0" step="1" placeholder={t.fieldFee} value={txForm.fee} onChange={(e) => setTxForm((f) => ({ ...f, fee: e.target.value }))} className={inputCls} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-ink-mute cursor-pointer">
                    <input type="checkbox" checked={txForm.isTHB} onChange={(e) => setTxForm((f) => ({ ...f, isTHB: e.target.checked }))} className="rounded accent-primary" />
                    {t.thbAsset}
                  </label>
                  <button onClick={submitTx} className="px-4 py-1.5 rounded-pill text-sm font-normal bg-primary text-white hover:bg-primary-deep transition-colors">{t.addBtn}</button>
                </div>
              </div>

              {/* Position summary */}
              {positions.length > 0 && (
                <div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-ink-mute border-b border-hairline">
                        <th className="text-left py-1.5 font-normal">{t.fieldTicker}</th>
                        <th className="text-right py-1.5 font-normal">{t.fieldShares}</th>
                        <th className="text-right py-1.5 font-normal">{t.avgCost}</th>
                        <th className="text-right py-1.5 font-normal">{t.realizedPnl}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p) => (
                        <tr key={p.ticker} className="border-b border-hairline">
                          <td className="py-1.5 text-ink font-mono">{p.ticker}</td>
                          <td className="py-1.5 text-right tabular text-ink-mute">{p.shares.toFixed(p.isTHB ? 0 : 4)}</td>
                          <td className="py-1.5 text-right tabular text-ink-mute">{p.isTHB ? fmtThbRaw(p.avgCostThb) : fmtUsd(p.avgCostUsd)}</td>
                          <td className={`py-1.5 text-right tabular ${p.realizedPnlThb > 0 ? 'text-gain' : p.realizedPnlThb < 0 ? 'text-loss' : 'text-ink-mute'}`}>
                            {p.realizedPnlThb !== 0 ? fmtThb(p.realizedPnlThb) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transaction list */}
              {transactions.length === 0 ? (
                <p className="text-sm text-ink-mute text-center py-6">{t.noTx}</p>
              ) : (
                <div className="space-y-1">
                  {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-hairline group">
                      <span className="text-ink-mute tabular w-20 shrink-0">{tx.date}</span>
                      <span className="font-mono text-ink w-16 shrink-0">{tx.ticker}</span>
                      <span className={`px-1.5 py-0.5 rounded-sm font-normal shrink-0 ${tx.type === 'buy' ? 'text-gain bg-gain/10' : 'text-loss bg-loss/10'}`}>
                        {tx.type === 'buy' ? t.typeBuy : t.typeSell}
                      </span>
                      <span className="tabular text-ink-mute flex-1">
                        {tx.shares} @ {tx.isTHB ? fmtThbRaw(tx.priceThb ?? 0) : fmtUsd(tx.priceUsd ?? 0)}
                      </span>
                      <button onClick={() => removeTransaction(tx.id)} className="text-ink-mute hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity w-5">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Add dividend form */}
              <div className="rounded-lg border border-hairline bg-canvas-soft p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={divForm.date} onChange={(e) => setDivForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
                  <input type="text" placeholder={t.fieldTicker} value={divForm.ticker} onChange={(e) => setDivForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))} className={`${inputCls} uppercase`} />
                  <input type="number" min="0" step="0.01" placeholder={`${t.fieldAmount} ${divForm.isTHB ? '฿' : '$'}`} value={divForm.amount} onChange={(e) => setDivForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} />
                  {!divForm.isTHB && (
                    <input type="number" min="0" step="0.01" placeholder={`${t.fieldFx} (${fxRate ? fxRate.toFixed(2) : '—'})`} value={divForm.fx} onChange={(e) => setDivForm((f) => ({ ...f, fx: e.target.value }))} className={inputCls} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-ink-mute cursor-pointer">
                    <input type="checkbox" checked={divForm.isTHB} onChange={(e) => setDivForm((f) => ({ ...f, isTHB: e.target.checked }))} className="rounded accent-primary" />
                    {t.thbAsset}
                  </label>
                  <button onClick={submitDiv} className="px-4 py-1.5 rounded-pill text-sm font-normal bg-primary text-white hover:bg-primary-deep transition-colors">{t.addBtn}</button>
                </div>
              </div>

              {/* Income summary */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border border-hairline p-3">
                  <p className="text-[10px] text-ink-mute uppercase tracking-widest">{t.income12mo}</p>
                  <p className="tabular text-lg font-light text-ink mt-1">{fmtThbRaw(divSummary.totalTtm)}</p>
                </div>
                <div className="flex-1 rounded-lg border border-hairline p-3">
                  <p className="text-[10px] text-ink-mute uppercase tracking-widest">{t.totalIncome}</p>
                  <p className="tabular text-lg font-light text-ink mt-1">{fmtThbRaw(divSummary.totalAll)}</p>
                </div>
              </div>

              {divSummary.rows.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-ink-mute border-b border-hairline">
                      <th className="text-left py-1.5 font-normal">{t.fieldTicker}</th>
                      <th className="text-right py-1.5 font-normal">{t.income12mo}</th>
                      <th className="text-right py-1.5 font-normal">{t.yieldOnCost}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divSummary.rows.map((r) => (
                      <tr key={r.ticker} className="border-b border-hairline">
                        <td className="py-1.5 text-ink font-mono">{r.ticker}</td>
                        <td className="py-1.5 text-right tabular text-ink-mute">{fmtThbRaw(r.ttm)}</td>
                        <td className="py-1.5 text-right tabular text-gain">{r.yieldOnCost != null ? fmtPct(r.yieldOnCost) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Dividend list */}
              {dividends.length === 0 ? (
                <p className="text-sm text-ink-mute text-center py-6">{t.noDiv}</p>
              ) : (
                <div className="space-y-1">
                  {[...dividends].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-hairline group">
                      <span className="text-ink-mute tabular w-20 shrink-0">{d.date}</span>
                      <span className="font-mono text-ink w-16 shrink-0">{d.ticker}</span>
                      <span className="tabular text-ink-mute flex-1">{fmtThbRaw(divThb(d, fxRate))}</span>
                      <button onClick={() => removeDividend(d.id)} className="text-ink-mute hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity w-5">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
