export type WidgetType = 'stat' | 'chart' | 'table' | 'list'

export interface WidgetConfig {
  id: string
  mountSelector: string
  type: WidgetType
  title: string
  data: readonly number[]
}

export const WIDGET_COUNT = 500

const SERIES_LENGTH = 48

export const WIDGET_TYPES: WidgetType[] = ['stat', 'chart', 'table', 'list']

const TITLE_PREFIXES = [
  'CPU',
  'Memory',
  'Latency',
  'Throughput',
  'Errors',
  'Queue',
  'Cache',
  'Sessions',
  'Disk',
  'Network',
]

const TITLE_SUFFIXES = [
  'us-east',
  'us-west',
  'eu-central',
  'ap-south',
  'edge',
  'core',
  'api',
  'worker',
  'db',
  'gateway',
]

let cachedConfigs: WidgetConfig[] | null = null

export function getWidgetConfigs(): WidgetConfig[] {
  if (cachedConfigs) {
    return cachedConfigs
  }
  const configs: WidgetConfig[] = []
  for (let i = 0; i < WIDGET_COUNT; i++) {
    configs.push({
      id: `widget-${i}`,
      mountSelector: `#widget-slot-${i}`,
      type: WIDGET_TYPES[i % WIDGET_TYPES.length],
      title: `${TITLE_PREFIXES[i % TITLE_PREFIXES.length]} ${
        TITLE_SUFFIXES[Math.floor(i / TITLE_PREFIXES.length) % TITLE_SUFFIXES.length]
      } #${i}`,
      data: Object.freeze(seedSeries(i)),
    })
  }
  cachedConfigs = configs
  return configs
}

function seedSeries(seed: number): number[] {
  const series: number[] = []
  let value = (seed * 7919 + 13) % 997
  for (let i = 0; i < SERIES_LENGTH; i++) {
    value = (value * 1103515245 + 12345 + seed * 31) % 2147483647
    series.push(Math.abs(value % 100))
  }
  return series
}
