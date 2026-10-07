import './style.css'
import { initAllWidgets } from './bootstrap'
import { attachMetricsRecalc } from './metrics'
import { initInteractions } from './interactions'

window.addEventListener('load', () => {
  initAllWidgets()
  attachMetricsRecalc()
  initInteractions()
})
