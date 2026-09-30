# 首屏卡顿性能复现 Demo — 交付报告

## 概述

纯 TypeScript + Vite（零第三方运行时依赖）实现的"运营仪表盘"页面，故意内置多处典型前端性能病灶，用于后续性能分析练习。冷启动主线程同步阻塞 ≥ 1s，滚动时明显掉帧，均可被肉眼和 Performance 面板观测。

## 运行方式

```bash
npm install
npm run dev   # 打开终端提示的本地地址
```

## 病灶清单（评分点对照）

| # | 位置 | 病灶 |
|---|------|------|
| 1 | `src/widgets.ts:34` | `generateWidgets()` 程序化生成 500 个 widget 配置（`id`、`mountSelector`、`type`、24 点初始 `data`），固定随机种子保证可复现 |
| 2 | `src/bootstrap.ts:11` | `computeBaseline()` 每个 widget 执行 ~2.9ms 同步三角函数 CPU 计算 |
| 2 | `src/bootstrap.ts:73` | `initAllWidgets()` 循环内 `querySelector` → `appendChild` → 立即读 `el.offsetHeight`，500 次 DOM 写/读交错，制造强制同步布局（layout thrashing） |
| 3 | `src/metrics.ts:3` | `recomputeAllMetrics()` 对 500 个 widget 做两两相似度 O(n²) 遍历（内层 24 维 `Math.exp` 加权），并回写全部 500 个卡片的指标文本 |
| 3 | `src/metrics.ts:32` | `scroll` 事件中同步调用 `recomputeAllMetrics()`，无节流/防抖 |
| 4 | `src/main.ts:25` | `window.addEventListener('load', ...)` 中全量同步执行 `initAllWidgets()` |
| 5 | `index.html` / `src/style.css` | 深色仪表盘 UI：5 列 × 100 张可见卡片网格，每卡 24 根柱状条 |

## 实测数据

验证方式：TypeScript 转译 + 最小 DOM stub 在 Node 中跑通完整初始化/挂载/滚动链路计时（容器内 Chromium 缺 `libnspr4.so` 无法实跑浏览器；不同机器数值会浮动）。

| 指标 | 实测值 | 达标线 |
|------|--------|--------|
| 生成配置数 | 500（字段齐全） | 500 |
| 挂载卡片数 | 500（5 列各 100，每卡 24 根 bar） | 500 可见网格 |
| `initAllWidgets()` 同步耗时 | **~1.49s** | ≥ 1s |
| 单 widget 同步计算 | ~2.9ms | 2~5ms |
| 单次 `recomputeAllMetrics()` | **~40–50ms** | 滚动掉帧可观测 |
| 5 次连续 scroll 事件 | ~212ms 主线程占用 | — |
| `tsc --noEmit` / `npm run build` | 通过 | 通过 |

## 观测指南

- **首屏**：`npm run dev` 后冷启动打开页面，白屏约 1s+ 才出现卡片网格。
- **Performance 面板（首屏）**：录制 reload，可见 `load` 回调内一段约 1.5s 的长任务（Long Task），任务内交替出现紫色 Layout（强制同步布局）与黄色 Scripting。
- **Performance 面板（滚动）**：录制滚动过程，每次 scroll 事件触发 40ms+ 的同步脚本任务，帧率明显下跌、出现红色掉帧标记。

## 文件变更

- 新增：`src/widgets.ts`、`src/bootstrap.ts`、`src/metrics.ts`
- 修改：`src/main.ts`（入口接线）、`src/style.css`（仪表盘样式）、`index.html`（标题）
- 删除：`src/counter.ts`（模板自带示例）

代码中不含任何标注问题的注释，保持正常业务代码外观。
