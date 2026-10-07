import { getWidgetConfigs } from './widgets'
import { allWidgetsMounted, getWidgetHost } from './bootstrap'

const CHUNK_BUDGET_MS = 12

let cachedTotals: number[] | null = null
let metricEls: (HTMLElement | null)[] | null = null
let applyScheduled = false

// 指标缓存就绪后 resolve；交互模块据此启用排序并读取缓存值，不触发任何重算。
export const metricsReady = new Promise<void>((resolve) => {
  resolveMetricsReady = resolve
})
let resolveMetricsReady: () => void = () => {}

export function getMetricValue(index: number): number | null {
  return cachedTotals ? cachedTotals[index] : null
}

export function attachMetricsRecalc(): void {
  window.addEventListener(
    'scroll',
    () => {
      // 滚动帧里不做任何重算与布局读写，只调度一次缓存结果的写入。
      scheduleApply()
    },
    { passive: true },
  )
  // 数据挂载后不可变，totals 只需算一次：分帧增量计算，完成后统一上屏。
  void computeTotalsIncremental()
    .then(() => {
      resolveMetricsReady()
    })
    .then(() => allWidgetsMounted)
    .then(() => {
      scheduleApply()
    })
}

function scheduleApply(): void {
  if (!cachedTotals || applyScheduled) {
    return
  }
  applyScheduled = true
  requestAnimationFrame(() => {
    applyScheduled = false
    applyTotals()
  })
}

function applyTotals(): void {
  if (!cachedTotals) {
    return
  }
  const widgets = getWidgetConfigs()
  if (!metricEls) {
    metricEls = widgets.map(
      (w) => getWidgetHost(w.id)?.querySelector<HTMLElement>('.metric') ?? null,
    )
  }
  for (let i = 0; i < widgets.length; i++) {
    const el = metricEls[i]
    if (el) {
      el.textContent = cachedTotals[i].toFixed(0)
    }
  }
}

// 与旧算法完全相同的求和顺序（逐行、逐列），结果逐位一致；
// 区别仅在于按时间预算分片让出主线程，且结果缓存复用。
function computeTotalsIncremental(): Promise<void> {
  const widgets = getWidgetConfigs()
  const acc = new Float64Array(widgets.length)
  let row = 0
  return new Promise<void>((resolve) => {
    const step = (): void => {
      const start = performance.now()
      do {
        const a = widgets[row].data
        let total = 0
        for (let j = 0; j < widgets.length; j++) {
          total += pairwiseDistance(a, widgets[j].data)
        }
        acc[row] = total
        row += 1
      } while (row < widgets.length && performance.now() - start < CHUNK_BUDGET_MS)
      if (row < widgets.length) {
        requestAnimationFrame(step)
      } else {
        cachedTotals = Array.from(acc)
        resolve()
      }
    }
    requestAnimationFrame(step)
  })
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
