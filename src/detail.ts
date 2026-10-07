import { getWidgetConfigs } from './widgets'
import { getWidgetHost } from './bootstrap'
import { getTotals, totalsReady } from './metrics'

const DATA_PREVIEW_COUNT = 20

let openId: string | null = null
let panel: HTMLElement | null = null
let titleEl: HTMLElement | null = null
let typeEl: HTMLElement | null = null
let metricEl: HTMLElement | null = null
let dataListEl: HTMLElement | null = null
let indexById: Map<string, number> | null = null

export function initDetail(): void {
  const grid = document.querySelector<HTMLElement>('.dashboard-grid')
  if (!grid) {
    return
  }
  indexById = new Map(getWidgetConfigs().map((w, i) => [w.id, i]))
  // 事件委托：一次绑定覆盖全部渐进挂载的卡片。
  grid.addEventListener('click', (event) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('.widget-card')
    if (!card) {
      return
    }
    if (openId === card.id) {
      closeDetail()
    } else {
      openDetail(card.id)
    }
  })
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetail()
    }
  })
  // totals 就绪后刷新一次打开中的面板，把占位 '—' 换成真实值。
  void totalsReady.then(() => {
    if (openId) {
      renderContent(openId)
    }
  })
}

export function closeDetailIfHidden(): void {
  if (openId && getWidgetHost(openId)?.classList.contains('is-hidden')) {
    closeDetail()
  }
}

function openDetail(id: string): void {
  ensurePanel()
  openId = id
  renderContent(id)
  panel?.classList.add('is-open')
}

function closeDetail(): void {
  openId = null
  panel?.classList.remove('is-open')
}

function ensurePanel(): void {
  if (panel) {
    return
  }
  const aside = document.createElement('aside')
  aside.className = 'detail-panel'
  aside.setAttribute('aria-label', 'widget 详情')

  const header = document.createElement('header')
  header.className = 'detail-header'
  const title = document.createElement('h2')
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'detail-close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', closeDetail)
  header.append(title, closeBtn)

  const type = document.createElement('p')
  type.className = 'detail-type'
  const metric = document.createElement('p')
  metric.className = 'detail-metric'
  const list = document.createElement('ol')
  list.className = 'detail-data'

  aside.append(header, type, metric, list)
  document.body.appendChild(aside)

  panel = aside
  titleEl = title
  typeEl = type
  metricEl = metric
  dataListEl = list
}

function renderContent(id: string): void {
  const index = indexById?.get(id)
  if (index === undefined || !titleEl || !typeEl || !metricEl || !dataListEl) {
    return
  }
  const w = getWidgetConfigs()[index]
  const totals = getTotals()
  titleEl.textContent = w.title
  typeEl.textContent = `type: ${w.type}`
  metricEl.textContent = `metric: ${totals ? totals[index].toFixed(0) : '—'}`
  // 面板内容一次性离屏构建，单次替换，避免逐项触活 DOM。
  const frag = document.createDocumentFragment()
  const count = Math.min(DATA_PREVIEW_COUNT, w.data.length)
  for (let i = 0; i < count; i++) {
    const item = document.createElement('li')
    item.textContent = String(w.data[i])
    frag.appendChild(item)
  }
  dataListEl.replaceChildren(frag)
}
