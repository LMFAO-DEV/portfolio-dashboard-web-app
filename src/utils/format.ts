import type { Lang } from '../types'

export function fmtThb(value: number, compact = false): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : value > 0 ? '+' : ''
  if (compact && abs >= 1_000_000) {
    return `${sign}฿${(abs / 1_000_000).toFixed(2)}M`
  }
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs)
  return `${sign}฿${formatted}`
}

export function fmtThbRaw(value: number, compact = false): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (compact && abs >= 1_000_000) return `฿${(abs / 1_000_000).toFixed(2)}M`
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs)
  return `฿${formatted}`
}

export function fmtUsd(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  return `$${value.toFixed(2)}`
}

export function fmtPct(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

export function fmtPctRaw(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  return `${Math.abs(value).toFixed(1)}%`
}

export function fmtShares(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '—'
  return value.toFixed(4)
}

export function fmtDate(date: Date, lang: Lang): string {
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH-u-ca-buddhist' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function fmtTime(date: Date): string {
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function fmtThbCompact(value: number): string {
  return fmtThb(value, true)
}
