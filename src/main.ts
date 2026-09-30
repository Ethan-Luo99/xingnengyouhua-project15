import './style.css'
import { initAllWidgets } from './bootstrap'
import { attachMetrics } from './metrics'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="dash-header">
  <div>
    <h1>Operations Dashboard</h1>
    <p>Fleet-wide telemetry across all services</p>
  </div>
  <div class="dash-status">
    <span class="dot"></span>
    Live
  </div>
</header>
<main class="dash-grid">
  <section class="dash-col" id="col-0"></section>
  <section class="dash-col" id="col-1"></section>
  <section class="dash-col" id="col-2"></section>
  <section class="dash-col" id="col-3"></section>
  <section class="dash-col" id="col-4"></section>
</main>
`

window.addEventListener('load', () => {
  initAllWidgets()
  attachMetrics()
})
