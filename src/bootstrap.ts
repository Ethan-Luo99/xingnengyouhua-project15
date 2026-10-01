import { getWidgetConfigs, type WidgetConfig } from './widgets'

const MOUNT_BATCH_SIZE = 50

export function initAllWidgets(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) {
    return Promise.resolve()
  }

  const widgets = getWidgetConfigs()

  const grid = document.createElement('main')
  grid.className = 'dashboard-grid'
  app.appendChild(grid)

  return new Promise<void>((resolve) => {
    let index = 0
    const hosts: HTMLElement[] = []

    const mountBatch = (): void => {
      const fragment = document.createDocumentFragment()
      const end = Math.min(index + MOUNT_BATCH_SIZE, widgets.length)
      for (; index < end; index++) {
        const w = widgets[index]
        const slot = document.createElement('section')
        slot.id = w.mountSelector.slice(1)
        slot.className = 'widget-slot'
        slot.appendChild(renderDom(w, refineSeries(w.data)))
        fragment.appendChild(slot)
        hosts.push(slot)
      }

      grid.appendChild(fragment)

      if (index < widgets.length) {
        requestAnimationFrame(mountBatch)
      } else {
        requestAnimationFrame(() => {
          measureAndTag()
          resolve()
        })
      }
    }

    const measureAndTag = (): void => {
      const heights = hosts.map((host) => host.getBoundingClientRect().height)
      for (let i = 0; i < hosts.length; i++) {
        hosts[i].style.setProperty('--slot-min-h', `${heights[i]}px`)
        hosts[i].dataset.ready = 'true'
      }
    }

    mountBatch()
  })
}

function refineSeries(input: readonly number[]): number[] {
  const n = input.length
  const out = new Array<number>(n)
  const first = input[0]
  const last = input[n - 1]
  for (let i = 0; i < n; i++) {
    out[i] = first + ((last - first) * i) / (n - 1)
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
