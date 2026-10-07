import { getWidgetConfigs, WIDGET_TYPES, type WidgetType } from './widgets'
import { getWidgetHost } from './bootstrap'
import { getMetricValue, metricsReady } from './metrics'

type FilterValue = 'all' | WidgetType
type SortOrder = 'none' | 'asc' | 'desc'

const widgets = getWidgetConfigs()

// 复用 bootstrap 已建好的 slot：交互只改既有节点的属性与相对位置，绝不重建卡片 DOM。
const slots: HTMLElement[] = []
for (const w of widgets) {
  const host = getWidgetHost(w.id)
  if (host) {
    slots.push(host)
  }
}

const byType = new Map<FilterValue, number[]>([['all', []]])
for (const type of WIDGET_TYPES) {
  byType.set(type, [])
}
widgets.forEach((w, i) => {
  byType.get('all')!.push(i)
  byType.get(w.type)!.push(i)
})

let currentFilter: FilterValue = 'all'
let currentSort: SortOrder = 'none'
let selectedIndex: number | null = null

let detail: HTMLElement | null = null
let detailMetric: HTMLElement | null = null
let detailList: HTMLElement | null = null

export function initInteractions(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  const grid = document.querySelector<HTMLElement>('.dashboard-grid')
  if (!app || !grid) {
    return
  }

  const toolbar = buildToolbar()
  app.insertBefore(toolbar, grid)

  grid.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const card = target.closest<HTMLElement>('.widget-card')
    if (!card) {
      return
    }
    const index = widgets.findIndex((w) => w.id === card.id)
    if (index < 0) {
      return
    }
    // 再次点击同一卡片：关闭；点击其它卡片：切换指向。
    if (selectedIndex === index) {
      closeDetail()
    } else {
      openDetail(index)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetail()
    }
  })
}

function buildToolbar(): HTMLElement {
  const toolbar = document.createElement('div')
  toolbar.className = 'filter-bar'

  const filterGroup = document.createElement('div')
  filterGroup.className = 'control-group'
  const filterLabel = document.createElement('span')
  filterLabel.className = 'control-label'
  filterLabel.textContent = 'Type'
  filterGroup.appendChild(filterLabel)

  const filters: FilterValue[] = ['all', ...WIDGET_TYPES]
  for (const value of filters) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'filter-button'
    button.textContent = value === 'all' ? 'All' : value
    if (value === currentFilter) {
      button.classList.add('is-active')
    }
    button.addEventListener('click', () => {
      setFilter(value)
      toolbar.querySelectorAll('.filter-button').forEach((b) => {
        b.classList.toggle('is-active', b === button)
      })
    })
    filterGroup.appendChild(button)
  }

  const sortGroup = document.createElement('div')
  sortGroup.className = 'control-group'
  const sortLabel = document.createElement('span')
  sortLabel.className = 'control-label'
  sortLabel.textContent = 'Metric'
  sortGroup.appendChild(sortLabel)

  const sortOptions: Array<{ order: SortOrder; label: string }> = [
    { order: 'none', label: 'Default' },
    { order: 'asc', label: 'Asc' },
    { order: 'desc', label: 'Desc' },
  ]
  const sortButtons: HTMLButtonElement[] = []
  for (const option of sortOptions) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'sort-button'
    button.textContent = option.label
    if (option.order !== 'none') {
      // 指标缓存未就绪前禁止排序，避免读到空值；就绪只发生一次。
      button.disabled = true
    } else {
      button.classList.add('is-active')
    }
    button.addEventListener('click', () => {
      applySort(option.order)
      sortButtons.forEach((b) => {
        b.classList.toggle('is-active', b === button)
      })
    })
    sortButtons.push(button)
    sortGroup.appendChild(button)
  }
  void metricsReady.then(() => {
    sortButtons.forEach((b) => {
      b.disabled = false
    })
  })

  toolbar.append(filterGroup, sortGroup)
  return toolbar
}

// 筛选只对新旧集合的差集切换 hidden，受影响卡片之外一律不触碰；
// 无卡片重建，显示变化在同一任务内同步生效。
function setFilter(next: FilterValue): void {
  if (next === currentFilter) {
    return
  }
  const shown = new Set(byType.get(currentFilter))
  const nextShown = new Set(byType.get(next))
  for (const i of shown) {
    if (!nextShown.has(i)) {
      slots[i].hidden = true
    }
  }
  for (const i of nextShown) {
    if (!shown.has(i)) {
      slots[i].hidden = false
    }
  }
  currentFilter = next
  // 筛选后排序只作用于可见卡片：无论排序开关与否，都按当前顺序键
  // 把可见节点整体重排一次，关闭排序时恢复原始索引顺序。
  reorderVisible()
  // 详情指向的卡片被隐藏即关闭，杜绝悬空指向。
  if (selectedIndex !== null && slots[selectedIndex].hidden) {
    closeDetail()
  }
}

function applySort(order: SortOrder): void {
  if (order === currentSort) {
    return
  }
  currentSort = order
  reorderVisible()
}

// 一次排序 = 先在 JS 中完成全部读（指标值来自 metrics 缓存，无布局读取），
// 再把所有可见 slot 收进同一个 DocumentFragment 一次性移动；不存在写读交错。
function reorderVisible(): void {
  const visible: HTMLElement[] = []
  const indexOfSlot = new Map<HTMLElement, number>()
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (!slot.hidden) {
      visible.push(slot)
      indexOfSlot.set(slot, i)
    }
  }
  visible.sort((a, b) => {
    const ia = indexOfSlot.get(a)!
    const ib = indexOfSlot.get(b)!
    if (currentSort === 'none') {
      // 关闭排序时按原始索引恢复；隐藏节点不可见故留在原位，
      // 下次筛选变化时会一并归入同一 fragment 重排。
      return ia - ib
    }
    const ma = getMetricValue(ia) ?? 0
    const mb = getMetricValue(ib) ?? 0
    const diff = currentSort === 'asc' ? ma - mb : mb - ma
    return diff !== 0 ? diff : ia - ib
  })
  const grid = visible[0]?.parentElement
  if (!grid) {
    return
  }
  const fragment = document.createDocumentFragment()
  for (const slot of visible) {
    fragment.appendChild(slot)
  }
  grid.appendChild(fragment)
}

function ensureDetail(): HTMLElement {
  if (detail) {
    return detail
  }
  detail = document.createElement('aside')
  detail.className = 'detail-panel'
  detail.setAttribute('aria-hidden', 'true')

  const header = document.createElement('header')
  header.className = 'detail-header'
  const title = document.createElement('h2')
  title.className = 'detail-title'
  const badge = document.createElement('span')
  badge.className = 'detail-type'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'detail-close'
  close.textContent = 'Close'
  close.addEventListener('click', () => {
    closeDetail()
  })
  header.append(title, badge, close)

  const metricRow = document.createElement('div')
  metricRow.className = 'detail-metric-row'
  const metricLabel = document.createElement('span')
  metricLabel.className = 'control-label'
  metricLabel.textContent = 'Metric'
  detailMetric = document.createElement('strong')
  detailMetric.className = 'detail-metric'
  metricRow.append(metricLabel, detailMetric)

  detailList = document.createElement('ol')
  detailList.className = 'detail-data'

  detail.append(header, metricRow, detailList)
  document.body.appendChild(detail)
  return detail
}

function openDetail(index: number): void {
  const panel = ensureDetail()
  const w = widgets[index]
  panel.querySelector<HTMLElement>('.detail-title')!.textContent = w.title
  panel.querySelector<HTMLElement>('.detail-type')!.textContent = w.type
  if (detailMetric) {
    const value = getMetricValue(index)
    detailMetric.textContent = value === null ? '—' : value.toFixed(0)
  }
  if (detailList) {
    const items = document.createDocumentFragment()
    for (let i = 0; i < Math.min(20, w.data.length); i++) {
      const item = document.createElement('li')
      item.dataset.index = String(i)
      item.textContent = String(w.data[i])
      items.appendChild(item)
    }
    detailList.replaceChildren(items)
  }
  panel.classList.add('is-open')
  panel.setAttribute('aria-hidden', 'false')
  markSelected(index)
  selectedIndex = index
}

function closeDetail(): void {
  if (selectedIndex !== null) {
    markSelected(null)
    selectedIndex = null
  }
  if (detail) {
    detail.classList.remove('is-open')
    detail.setAttribute('aria-hidden', 'true')
  }
}

function markSelected(index: number | null): void {
  if (selectedIndex !== null) {
    slots[selectedIndex].querySelector('.widget-card')?.classList.remove('is-selected')
  }
  if (index !== null) {
    slots[index].querySelector('.widget-card')?.classList.add('is-selected')
  }
}

// 指标缓存就绪时，若详情正开着，用与卡片相同的缓存值刷新一次，仍无重算。
void metricsReady.then(() => {
  if (selectedIndex !== null && detailMetric) {
    const value = getMetricValue(selectedIndex)
    detailMetric.textContent = value === null ? '—' : value.toFixed(0)
  }
})
