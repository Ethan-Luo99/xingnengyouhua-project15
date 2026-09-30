import { generateWidgets, type WidgetConfig } from './widgets'

export interface MountedWidget {
  config: WidgetConfig
  el: HTMLElement
  baseline: number
}

export const widgetRegistry: MountedWidget[] = []

function computeBaseline(data: number[]): number {
  let acc = 0
  for (let pass = 0; pass < 6000; pass++) {
    for (let i = 0; i < data.length; i++) {
      const v = data[i]
      acc += Math.sin(acc * 0.000001 + v * 0.013) * Math.cos(v * 0.007 + pass * 0.0001)
      if (acc > 1e9 || acc < -1e9) acc = acc % 1000
    }
  }
  return Math.abs(acc % 100)
}

function renderDom(w: WidgetConfig, baseline: number): HTMLElement {
  const card = document.createElement('article')
  card.className = `widget widget-${w.type}`
  card.id = w.id

  const head = document.createElement('header')
  head.className = 'widget-head'

  const title = document.createElement('h3')
  title.textContent = w.title

  const badge = document.createElement('span')
  badge.className = 'widget-badge'
  badge.textContent = w.type

  head.appendChild(title)
  head.appendChild(badge)

  const body = document.createElement('div')
  body.className = 'widget-body'

  const max = Math.max(...w.data)
  for (const v of w.data) {
    const bar = document.createElement('div')
    bar.className = 'widget-bar'
    bar.style.height = `${Math.max(4, Math.round((v / max) * 48))}px`
    body.appendChild(bar)
  }

  const foot = document.createElement('footer')
  foot.className = 'widget-foot'

  const metric = document.createElement('span')
  metric.className = 'widget-metric'
  metric.textContent = `rel ${baseline.toFixed(1)}`

  const updated = document.createElement('span')
  updated.className = 'widget-updated'
  updated.textContent = 'just now'

  foot.appendChild(metric)
  foot.appendChild(updated)

  card.appendChild(head)
  card.appendChild(body)
  card.appendChild(foot)

  return card
}

export function initAllWidgets(): void {
  const widgets = generateWidgets()

  for (const w of widgets) {
    const baseline = computeBaseline(w.data)

    const host = document.querySelector<HTMLElement>(w.mountSelector)
    if (!host) continue

    const el = renderDom(w, baseline)
    host.appendChild(el)

    const cardHeight = el.offsetHeight
    el.dataset.cardHeight = String(cardHeight)

    widgetRegistry.push({ config: w, el, baseline })
  }
}
