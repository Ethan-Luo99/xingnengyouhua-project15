import { widgetRegistry } from './bootstrap'

export function recomputeAllMetrics(): void {
  const widgets = widgetRegistry
  const n = widgets.length
  const scores = new Array<number>(n).fill(0)

  for (let i = 0; i < n; i++) {
    const a = widgets[i].config.data
    let total = 0
    for (let j = 0; j < n; j++) {
      const b = widgets[j].config.data
      let affinity = 0
      for (let k = 0; k < a.length; k++) {
        const gap = a[k] - b[k]
        affinity += Math.exp(-Math.abs(gap) / 120)
      }
      total += affinity / a.length
    }
    scores[i] = total
  }

  for (let i = 0; i < n; i++) {
    const metricEl = widgets[i].el.querySelector('.widget-metric')
    if (metricEl) {
      metricEl.textContent = `rel ${(scores[i] % 1000).toFixed(1)}`
    }
  }
}

export function attachMetrics(): void {
  window.addEventListener('scroll', () => {
    recomputeAllMetrics()
  })
}
