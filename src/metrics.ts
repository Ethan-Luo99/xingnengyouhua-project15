import { getWidgetConfigs } from './widgets'

export function attachMetricsRecalc(): void {
  window.addEventListener(
    'scroll',
    () => {
      recomputeAllMetrics()
    },
    { passive: true },
  )
}

export function recomputeAllMetrics(): void {
  const widgets = getWidgetConfigs()
  const totals = new Map<string, number>()

  for (const a of widgets) {
    let total = 0
    for (const b of widgets) {
      total += pairwiseDistance(a.data, b.data)
    }
    totals.set(a.id, total)
  }

  for (const w of widgets) {
    const host = document.querySelector<HTMLElement>(w.mountSelector)
    if (!host) {
      continue
    }
    const metricEl = host.querySelector<HTMLElement>('.metric')
    if (metricEl) {
      metricEl.textContent = totals.get(w.id)!.toFixed(0)
    }
    const measured = host.getBoundingClientRect().height
    host.style.setProperty('--slot-min-h', `${measured}px`)
  }
}

function pairwiseDistance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}
