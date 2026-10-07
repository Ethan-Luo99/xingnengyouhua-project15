import './style.css'
import { initAllWidgets } from './bootstrap'
import { attachMetricsRecalc } from './metrics'
import { initControls } from './controls'
import { initDetail } from './detail'

window.addEventListener('load', () => {
  initAllWidgets()
  attachMetricsRecalc()
  initControls()
  initDetail()
})
