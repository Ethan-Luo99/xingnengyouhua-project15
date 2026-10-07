import { getWidgetConfigs, type WidgetType } from './widgets'
import { getWidgetHost } from './bootstrap'
import { getTotals, totalsReady } from './metrics'
import { closeDetailIfHidden } from './detail'

type FilterValue = WidgetType | 'all'
type SortOrder = 'none' | 'asc' | 'desc'

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'stat', label: 'stat' },
  { value: 'chart', label: 'chart' },
  { value: 'table', label: 'table' },
  { value: 'list', label: 'list' },
]

const SORT_OPTIONS: Array<{ value: Exclude<SortOrder, 'none'>; label: string }> = [
  { value: 'asc', label: '指标 升序' },
  { value: 'desc', label: '指标 降序' },
]

let activeFilter: FilterValue = 'all'
let sortOrder: SortOrder = 'none'
let grid: HTMLElement | null = null
let slotIndexById: Map<string, number> | null = null
const filterButtons: HTMLButtonElement[] = []
const sortButtons: HTMLButtonElement[] = []

export function initControls(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  grid = app?.querySelector<HTMLElement>('.dashboard-grid') ?? null
  if (!app || !grid) {
    return
  }
  slotIndexById = new Map(
    getWidgetConfigs().map((w, i) => [w.mountSelector.slice(1), i]),
  )
  const toolbar = document.createElement('div')
  toolbar.className = 'controls-bar'
  toolbar.append(buildFilterGroup(), buildSortGroup())
  app.insertBefore(toolbar, grid)
  // totals 缓存就绪前排序无依据，先禁用排序按钮。
  void totalsReady.then(() => {
    for (const btn of sortButtons) {
      btn.disabled = false
    }
  })
}

function buildFilterGroup(): HTMLElement {
  const group = document.createElement('div')
  group.className = 'control-group'
  for (const opt of FILTER_OPTIONS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'control-btn'
    btn.textContent = opt.label
    btn.dataset.filter = opt.value
    btn.classList.toggle('is-active', opt.value === activeFilter)
    btn.addEventListener('click', () => applyFilter(opt.value))
    filterButtons.push(btn)
    group.appendChild(btn)
  }
  return group
}

function buildSortGroup(): HTMLElement {
  const group = document.createElement('div')
  group.className = 'control-group'
  for (const opt of SORT_OPTIONS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'control-btn'
    btn.textContent = opt.label
    btn.dataset.sort = opt.value
    btn.disabled = true
    btn.addEventListener('click', () => toggleSort(opt.value))
    sortButtons.push(btn)
    group.appendChild(btn)
  }
  return group
}

function applyFilter(next: FilterValue): void {
  if (next === activeFilter) {
    return
  }
  activeFilter = next
  for (const btn of filterButtons) {
    btn.classList.toggle('is-active', btn.dataset.filter === next)
  }
  // 纯写循环：只翻转可见性发生变化的 slot，不读任何布局信息。
  for (const w of getWidgetConfigs()) {
    const host = getWidgetHost(w.id)
    if (!host) {
      continue
    }
    const hide = next !== 'all' && w.type !== next
    if (host.classList.contains('is-hidden') !== hide) {
      host.classList.toggle('is-hidden', hide)
    }
  }
  closeDetailIfHidden()
  // 排序激活时重排一次，让新露出的卡片落到有序位置。
  if (sortOrder !== 'none') {
    applySort()
  }
}

function toggleSort(next: Exclude<SortOrder, 'none'>): void {
  sortOrder = sortOrder === next ? 'none' : next
  for (const btn of sortButtons) {
    btn.classList.toggle('is-active', btn.dataset.sort === sortOrder)
  }
  applySort()
}

function applySort(): void {
  const totals = getTotals()
  const indexMap = slotIndexById
  if (!grid || !totals || !indexMap) {
    return
  }
  const slots = Array.from(grid.children)
  const visible: Element[] = []
  for (const slot of slots) {
    if (!slot.classList.contains('is-hidden')) {
      visible.push(slot)
    }
  }
  // 读阶段：只取缓存的 totals 与 id 映射，不触碰布局。
  const keyOf = (slot: Element): number => {
    const index = indexMap.get(slot.id) ?? 0
    return sortOrder === 'none' ? index : totals[index]
  }
  visible.sort((a, b) => {
    const diff = keyOf(a) - keyOf(b)
    return sortOrder === 'desc' ? -diff : diff
  })
  // 写阶段：隐藏 slot 原位保留，可见 slot 按序填回，
  // 全部先进一个 DocumentFragment，再一次整体插入，避免逐节点触活 DOM。
  const frag = document.createDocumentFragment()
  let nextVisible = 0
  for (const slot of slots) {
    frag.appendChild(slot.classList.contains('is-hidden') ? slot : visible[nextVisible++])
  }
  grid.appendChild(frag)
}
