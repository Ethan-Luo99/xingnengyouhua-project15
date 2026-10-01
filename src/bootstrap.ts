import { getWidgetConfigs, type WidgetConfig } from './widgets'

const CHUNK_BUDGET_MS = 12

const hostById = new Map<string, HTMLElement>()

let resolveMounted: () => void = () => {}

export const allWidgetsMounted = new Promise<void>((resolve) => {
  resolveMounted = resolve
})

export function getWidgetHost(id: string): HTMLElement | undefined {
  return hostById.get(id)
}

export function initAllWidgets(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) {
    return
  }

  const widgets = getWidgetConfigs()

  const grid = document.createElement('main')
  grid.className = 'dashboard-grid'
  const slotFragment = document.createDocumentFragment()
  for (const w of widgets) {
    const slot = document.createElement('section')
    slot.id = w.mountSelector.slice(1)
    slot.className = 'widget-slot'
    hostById.set(w.id, slot)
    slotFragment.appendChild(slot)
  }
  grid.appendChild(slotFragment)
  app.appendChild(grid)

  let nextIndex = 0
  const renderChunk = (): void => {
    const start = performance.now()
    const mountedHosts: HTMLElement[] = []
    do {
      const w = widgets[nextIndex]
      const host = hostById.get(w.id)
      if (host) {
        host.appendChild(renderDom(w, refineSeries(w.data)))
        mountedHosts.push(host)
      }
      nextIndex += 1
    } while (nextIndex < widgets.length && performance.now() - start < CHUNK_BUDGET_MS)
    scheduleMeasure(mountedHosts)
    if (nextIndex < widgets.length) {
      requestAnimationFrame(renderChunk)
    } else {
      resolveMounted()
    }
  }
  // 首块同步渲染，保证首帧即有可见内容；其余分帧渐进上屏。
  renderChunk()
}

const pendingMeasure: HTMLElement[] = []
let measureScheduled = false

function scheduleMeasure(hosts: HTMLElement[]): void {
  pendingMeasure.push(...hosts)
  if (measureScheduled) {
    return
  }
  measureScheduled = true
  requestAnimationFrame(measureRound)
}

function measureRound(): void {
  measureScheduled = false
  const batch = pendingMeasure.splice(0)
  if (batch.length === 0) {
    return
  }
  // 读阶段：一次性批量读取，期间不做任何写入。
  const heights = batch.map((host) => host.getBoundingClientRect().height)
  // 写阶段：下一轮帧再统一写入，测量与写入严格分轮。
  requestAnimationFrame(() => {
    for (let i = 0; i < batch.length; i++) {
      batch[i].style.setProperty('--slot-min-h', `${heights[i]}px`)
      batch[i].dataset.ready = 'true'
    }
  })
}

function refineSeries(input: readonly number[]): number[] {
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

function renderDom(w: WidgetConfig, series: readonly number[]): HTMLElement {
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
