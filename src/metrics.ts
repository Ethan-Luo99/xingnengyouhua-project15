import { getWidgetConfigs } from './widgets'

const ROWS_PER_CHUNK = 64

export function attachMetricsRecalc(mounted: Promise<void>): void {
  const ready = Promise.all([mounted, computeTotalsAsync()])

  let pending = true
  const flush = (): void => {
    if (!pending) {
      return
    }
    pending = false
    void ready.then(applyMetricTexts)
  }

  flush()

  window.addEventListener('scroll', flush, { passive: true })
}

function computeTotalsAsync(): Promise<Float64Array> {
  const widgets = getWidgetConfigs()
  for (const w of widgets) {
    if (!Object.isFrozen(w.data)) {
      throw new Error(`widget ${w.id} data series must be immutable after mount`)
    }
  }

  const totals = new Float64Array(widgets.length)
  return new Promise<Float64Array>((resolve) => {
    let row = 0
    const step = (): void => {
      const end = Math.min(row + ROWS_PER_CHUNK, widgets.length)
      for (; row < end; row++) {
        const a = widgets[row].data
        let total = 0
        for (const w of widgets) {
          total += pairwiseDistance(a, w.data)
        }
        totals[row] = total
      }
      if (row < widgets.length) {
        requestAnimationFrame(step)
      } else {
        resolve(totals)
      }
    }
    step()
  })
}

function applyMetricTexts(results: [void, Float64Array]): void {
  const totals = results[1]
  const widgets = getWidgetConfigs()
  for (let i = 0; i < widgets.length; i++) {
    const host = document.querySelector<HTMLElement>(widgets[i].mountSelector)
    const metricEl = host?.querySelector<HTMLElement>('.metric')
    if (metricEl) {
      metricEl.textContent = totals[i].toFixed(0)
    }
  }
}

function pairwiseDistance(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}
