import './style.css'
import { initAllWidgets } from './bootstrap'
import { attachMetricsRecalc } from './metrics'

window.addEventListener('load', () => {
  initAllWidgets()
  attachMetricsRecalc()
})
