export type WidgetType = 'stat' | 'chart' | 'table' | 'list'

export interface WidgetConfig {
  id: string
  mountSelector: string
  type: WidgetType
  title: string
  data: number[]
}

const WIDGET_TYPES: WidgetType[] = ['stat', 'chart', 'table', 'list']

const TITLE_PREFIXES = [
  'Revenue', 'Traffic', 'Latency', 'Errors', 'Signups',
  'Sessions', 'Conversion', 'Uptime', 'Throughput', 'Queue',
]

const TITLE_SUFFIXES = [
  'Overview', 'Daily', 'Weekly', 'By Region', 'Realtime',
  'Historical', 'Forecast', 'Breakdown', 'Summary', 'Trends',
]

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateWidgets(count = 500): WidgetConfig[] {
  const rand = mulberry32(20260927)
  const widgets: WidgetConfig[] = []

  for (let i = 0; i < count; i++) {
    const data: number[] = []
    for (let j = 0; j < 24; j++) {
      data.push(Math.round(rand() * 10000) / 10)
    }

    widgets.push({
      id: `widget-${i}`,
      mountSelector: `#col-${i % 5}`,
      type: WIDGET_TYPES[i % WIDGET_TYPES.length],
      title: `${TITLE_PREFIXES[i % TITLE_PREFIXES.length]} ${
        TITLE_SUFFIXES[Math.floor(i / TITLE_PREFIXES.length) % TITLE_SUFFIXES.length]
      } #${i}`,
      data,
    })
  }

  return widgets
}
