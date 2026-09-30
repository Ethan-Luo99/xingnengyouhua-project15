import { getWidgetConfigs, type WidgetConfig } from './widgets'

export function initAllWidgets(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) {
    return
  }

  const widgets = getWidgetConfigs()

  const grid = document.createElement('main')
  grid.className = 'dashboard-grid'
  for (const w of widgets) {
    const slot = document.createElement('section')
    slot.id = w.mountSelector.slice(1)
    slot.className = 'widget-slot'
    grid.appendChild(slot)
  }
  app.appendChild(grid)

  for (const w of widgets) {
    const refined = refineSeries(w.data)
    const host = document.querySelector<HTMLElement>(w.mountSelector)
    if (!host) {
      continue
    }
    host.appendChild(renderDom(w, refined))
    const measured = host.getBoundingClientRect().height
    host.style.setProperty('--slot-min-h', `${measured}px`)
    host.dataset.ready = 'true'
  }
}

function refineSeries(input: number[]): number[] {
  const out = input.slice()
  const budgetMs = 2 + (input[0] % 4)
  const start = performance.now()
  let prevDelta = Number.POSITIVE_INFINITY
  while (performance.now() - start < budgetMs) {
    let delta = 0
    for (let i = 1; i < out.length - 1; i++) {
      const next = (out[i - 1] + out[i] * 2 + out[i + 1]) / 4
      delta += Math.abs(next - out[i])
      out[i] = next
    }
    if (Math.abs(prevDelta - delta) < 1e-9) {
      break
    }
    prevDelta = delta
  }
  return out
}

function renderDom(w: WidgetConfig, series: number[]): HTMLElement {
  const card = document.createElement('article')
  card.className = `widget-card widget-${w.type}`
  card.id = w.id

  const header = document.createElement('header')
  header.className = 'widget-header'
  const title = document.createElement('h3')
  title.textContent = w.title
  const badge = document.createElement('span')
  badge.className = 'widget-type'
  badge.textContent = w.type
  header.append(title, badge)

  const body = document.createElement('div')
  body.className = 'widget-body'
  const max = Math.max(...series, 1)
  for (const v of series) {
    const bar = document.createElement('i')
    bar.style.height = `${Math.max(4, (v / max) * 100)}%`
    body.appendChild(bar)
  }

  const footer = document.createElement('footer')
  footer.className = 'widget-footer'
  const metric = document.createElement('span')
  metric.className = 'metric'
  metric.textContent = '—'
  footer.appendChild(metric)

  card.append(header, body, footer)
  return card
}
