# ARCHITECTURE · 开发者文档

> EEE 项目内部结构、模块依赖与扩展指南。
> 适用版本：**v0.9.4** ｜ 与代码同步

---

## 改动索引 ⭐

**遇到任务先查这张表。**

| 我想改…… | 主要文件 | 次要涉及 |
|----------|---------|---------|
| 表格布局 / 单元格渲染 | `features/table/table-renderer.js` | `layout.css` |
| 表格列宽 / 行高 / 底色 | `features/preferences/table-style.js` | `settings-table.css` |
| 单元格状态颜色 | `features/preferences/color-preview.js` | `settings-color-preview.css` |
| 界面颜色（除状态色） | `features/preferences/interface-colors.js` | `settings-interface-colors.css` |
| 颜色方案保存 / 切换 | `features/preferences/scheme-manager.js` | `settings-scheme.css` |
| 明暗主题 | `features/preferences/theme.js` | `base.css` |
| 数据集新建 / 重命名 / 删除 | `features/data/dataset-manager.js` | `dom.js` 中的 ids |
| 数据集备注 | `features/data/dataset-remark.js` | — |
| 导入 / 导出 | `features/data/import-export.js` | `lib/jszip.min.js` |
| 数据集合并逻辑 | `features/data/dataset-merge.js` | — |
| 默认数据集加载 | `features/data/default-loader.js` | `data/data.json` |
| **地区增删改 / 悬停高亮** | **`features/data/region-manager.js`** | **`dom.js` / `features.css`** |
| **未获取统计 / 进度条 / 筛选** | **`features/table/unacquired.js`** | **`features.css`** |
| **可获取地点悬浮窗** | **`features/table/cell-acquire-tooltip.js`** | **`features.css`** |
| **高亮控制（未获取/地区）** | **`features/table/cell-highlighter.js`** | **`features.css`** |
| 单元格备注 + 图片 | `features/note/note.js` | `services/image-store.js` |
| 数值录入 / 对比 / 建议 | `features/cell/cell-value.js` | `cell-record.js` |
| 撤回 / 重做 | `features/cell/history.js` | — |
| 行筛选 | `features/table/row-filter.js` | — |
| 统计面板 | `features/table/stats.js` | — |
| 存储管理 | `features/preferences/storage-manager.js` | — |
| 清除缓存 | `features/data/cache-clear.js` | `services/image-store.js` |
| 添加新常量 | `core/constants.js` | — |
| 添加新 DOM 缓存 | `core/dom.js` 的 `ids` 数组 | `index.html` 对应 id |
| 添加新事件绑定 | `js/events.js` 的 `bindAllEvents()` | 新建模块的 `bindXXXEvents()` |

---

## 30 秒速览

```
┌──────────────────────────────────────────────┐
│  入口层   events.js / main.js                │
│  ─────────────────────────────────────────── │
│  功能层   features/{data,table,cell,         │
│                     preferences,note}/       │
│  ─────────────────────────────────────────── │
│  服务层   services/{storage,modal,           │
│                     image-store}.js          │
│  ─────────────────────────────────────────── │
│  核心层   core/{constants,state,dom,         │
│                  utils,data-model}.js        │
└──────────────────────────────────────────────┘
```

**依赖规则**：上层可依赖下层，下层不可依赖上层；同层可互调。

**模块规模**：48 个自写源文件 / 约 15,000 行代码。

---

## 项目基本形态

| 项目 | 值 |
|------|-----|
| 形态 | 纯前端单页应用（无框架、无构建、无后端） |
| 模块方案 | IIFE 挂载 `window.App` 命名空间 |
| 持久化 | localStorage（数据/设置/地区）+ IndexedDB（图片） |
| 外部依赖 | 仅 `jszip.min.js` |
| 运行要求 | HTTP 服务器（`file://` 下 fetch 被拦截） |
| 表格结构 | 12 行 × 14 词条组 × 5 主属性 = 840 格 |
| 刷取组合 | 每地区 10 主属性组合 × 16 属性（8副+8词） = 160 种 |

---

## 模块清单

### 核心层 `core/`
| 挂载点 | 职责 |
|--------|------|
| `App.constants` | 存储键、词条组、行名、主属性、默认地区、颜色、尺寸常量 |
| `App.state` | 全局状态（含 getter/setter、历史、基准） |
| `App.dom` | 所有 DOM 元素一次性缓存 |
| `App.utils` | 单元格标准化、颜色转换、列索引、HTML 转义 |
| `App.dataModel` | 空单元格 / 空行 / 初始行 / 示例数据工厂 |

### 服务层 `services/`
| 挂载点 | 职责 |
|--------|------|
| `App.storage` | localStorage 统一封装（含数据集、地区、筛选的读写） |
| `App.modal` | 弹窗管理与 Toast（幂等、滚动锁引用计数） |
| `App.imageStore` | IndexedDB 图片增删查、Blob URL、`closeDB()` |

### 功能层 `features/`
| 挂载点 | 子目录 |
|--------|--------|
| `App.datasetManager` | data |
| `App.datasetRemark` | data |
| `App.importExport` | data |
| `App.datasetMerge` | data |
| `App.defaultLoader` | data |
| `App.cacheClear` | data |
| **`App.regionManager`** | **data（v0.9.1 新增）** |
| `App.tableRenderer` | table |
| `App.rowFilter` | table |
| `App.stats` | table |
| `App.noteSearch` | table |
| `App.cellTooltip` | table |
| **`App.unacquired`** | **table（v0.9.1 新增）** |
| **`App.cellAcquireTooltip`** | **table（v0.9.1 新增）** |
| **`App.cellHighlighter`** | **table（v0.9.2 新增）** |
| `App.cellValue` | cell |
| `App.cellRecord` | cell |
| `App.history` | cell |
| `App.theme` | preferences |
| `App.tableStyle` | preferences |
| `App.colorPreview` | preferences |
| `App.interfaceColors` | preferences |
| `App.schemeManager` | preferences |
| `App.stateColorSchemeManager` | preferences |
| `App.storageManager` | preferences |
| `App.note` | note |

### 入口层
| 挂载点 | 职责 |
|--------|------|
| `App.events` | 统一绑定所有模块事件 |
| `App.layout` | 面板切换、布局状态恢复 |

---

## 启动流程

`main.js` 的 `init()` 按序执行，每步由 `safeCall` 包裹（单步失败不阻断启动）：

```
 1. initDomCache()              缓存所有 DOM
 2. state.rows = 空数据          初始化 12×70
 3. theme.loadTheme()           读主题偏好 / 跟随系统
 4. interfaceColors.applyCurrentTheme()   应用自定义颜色
 5. 确保示例数据集存在
 6. datasetManager.loadData()   加载当前数据集
 7. updateDatasetSelect()       渲染数据集下拉框
 8. populateDropdowns()         填充行/词条/副属性
 9. resetTripleInputs()         三联输入框重置
10. initTableStyle()            表格尺寸 + 底色
11. initNoteFeature()           备注模块（含自绑事件）
11.5 cellAcquireTooltip.init()  可获取地点悬浮窗（v0.9.1 新增）
12. renderAllTables()           渲染主表格
13. initCellTooltip()           悬停提示栏
14. updateDatasetRemark()       刷新数据集备注区
15. updateLockedUI()            更新保护状态
16. restoreRightPanelState()    恢复面板折叠
17. events.bindAllEvents()      统一绑定事件
18. layout.switchPanel('input') 激活数据管理面板
19. 首访显示关于弹窗 / 异步加载默认数据
20. 版本检测（fetch version.json）
```

> **竞态防护**：异步默认数据加载前记录当前数据集键，返回时校验是否被切换。

---

## 关键机制

### 数据保护（只增不减）

默认数据集受"只增不减"保护：`isCellOperationAllowed()` 检查新单元格是否低于基准。规则：

- 基准有 `v` → 新 `v` 必须相同
- 基准有 `t` → 新 `t` 不能更小
- 基准有 `a` → 新 `a` 不能更小

示例数据集与默认数据集**不可删除 / 清空 / 重命名**。

### 历史记录（撤回/重做）

- 栈上限 **20 步**
- 每条记录 `{ rowIdx, colIndex, oldCell, newCell }`（深拷贝）
- 数据集切换 / 清空 / 导入 / 合并后调用 `resetHistorySafe()` 清空

### 图片存储

- 数据库 `eee_image_db` → 对象仓库 `images` → 记录 `{ id, blob }`
- `note.images` 仅保存 ID
- 兼容旧数据：base64 Data URL 在读取时自动识别
- **删除时机**：编辑时仅从数组移除；保存 / 清除备注时通过差集计算执行实际删除

### 弹窗管理

- `openModal / closeModal` 使用**引用计数**控制滚动锁
- `bindModalEvents` 幂等（`modalEventsBound` 标志）
- 确认弹窗回调存储在 `window.__dialogConfirmCallback`，**关闭时立即清理**防残留

### 事件绑定

三种模式并存：

| 模式 | 位置 | 说明 |
|------|------|------|
| 集中绑定 | `events.js` `bindAllEvents()` | 主流方式（18+ 个模块） |
| 模块自绑 | `note.js` `initNoteFeature()` / `cell-acquire-tooltip.js` `init()` | 因依赖动态初始化 |
| 内联 onclick | `interface-colors.js` | 历史遗留，建议未来整改 |

### 未获取统计（v0.9.1）

**统计单位**：`(地区, 3主属性, 副属性或词条)` —— 每地区 160 种组合。

**缺口贡献**（每格）：
```js
if (cell.t > 0) return Math.max(0, cell.t - (cell.a || 0));  // 实装：按缺口数
if (cell.v !== '') return 0;                                  // 有数值：已获取
return 1;                                                     // 完全空白：+1
```

**展示流程**：
1. 遍历所有地区 × 所有组合，收集未获取 > 0 的条目
2. 按缺口总数降序，取前 36
3. 每条渲染：组合行 + 地区行 + 进度条 + 缺口数

**进度条**：`已完成格数 / 24`，分档着色（<30% 红 / 30~70% 橙 / ≥70% 绿）。

**地区筛选**：折叠式复选框，状态存 `smarttable_unacquired_region_filter`（`null` = 全部）。

**双色悬停高亮**：
- 缺口贡献 > 0 → `.unacquired-cell-highlight`（红）
- 贡献 = 0 → `.acquired-cell-highlight`（绿）
- 其余数据格 → `table.unacquired-dimming`（变暗蒙版）
- 滚动到第一个红框

### 地区管理（v0.9.1）

**数据结构**：`{ name, rows: string[], groups: string[] }`
- `rows`：该地区 8 个可获取副属性
- `groups`：该地区 8 个可获取词条

**默认数据**：`App.constants.DEFAULT_REGIONS`（12 个地区）。

**持久化**：`smarttable_regions`（用户修改后写入；未修改时读取 `DEFAULT_REGIONS`）。

**悬停高亮**：鼠标悬停地区卡片 → 高亮该地区 8 副属性 × 8 词条 × 5 主属性 = **320 格**，规则与未获取统计一致。

### 可获取地点悬浮窗（v0.9.1）

**触发**：悬停未完全获取的单元格 300ms。

**内容**：
- 每个可获取此基质的地区
- 两条刷取路径：选副属性「X」 / 选词条「Y」
- 每条路径下列出 6 种含当前主属性的 3 主属性组合

**地区来源**：优先读 `smarttable_unacquired_region_filter` 筛选的地区；无结果时回退全部并显示提示。

**与备注悬浮框**：
- 不互斥（两个可同屏）
- 位置自动错开：使用 MutationObserver 监听 noteTooltip 的 `style` 变化，若重叠则重新定位
- `z-index: 99` < noteTooltip `100` < modal `200`

### 统一高亮控制（v0.9.2）

`App.cellHighlighter` 集中管理表格单元格的高亮与变暗蒙版：

- `highlight(cellList, options)`：接收 `[{rowIdx, colIndex, isUnacquired}]`，统一施加红/绿描边
- `clear()`：按记录 + 全表兜底双重清理，消除 class 残留
- `_applyDimming()` / `_removeDimming()`：两表格同步变暗

调用方：`unacquired.js`（悬停未获取条目）、`region-manager.js`（悬停地区卡片）。
面板切换时由 `main.js` 的 `switchPanel()` 调用 `clear()` 清理残留。

---

## 数据契约

### localStorage 键

| 键 | 内容 |
|----|------|
| `smarttable_dataset_list` | 数据集名称数组 |
| `smarttable_current_dataset` | 当前数据集名 |
| `smarttable_theme` | `light` / `dark` |
| `smarttable_dataset_remarks` | `{ 数据集名: 备注字符串 }` |
| `smarttable_user_colors` | `{ light: {...}, dark: {...} }` |
| `smarttable_interface_colors` | `{ light: {...}, dark: {...} }` |
| `smarttable_style` | `{ colWidth, rowHeight }` |
| `smarttable_table_bg` | `{ light: {...}, dark: {...} }` |
| `smarttable_note_layout` | `text-top` / `image-top` / `horizontal` |
| `smarttable_note_tooltip_pos` | `{ left, top, width, height }` |
| `smarttable_right_collapsed` | `'0'` / `'1'` |
| `smarttable_schemes` | 用户界面颜色方案 |
| `smarttable_active_scheme` | 激活方案 ID |
| `smarttable_state_color_schemes` | 用户单元格颜色方案 |
| `smarttable_active_state_color_scheme` | 激活方案 ID |
| `smarttable_custom_quota` | 字节数 |
| `smarttable_quota_warn_percent` | 百分比 |
| **`smarttable_regions`** | **地区配置数组 `[{name, rows, groups}]`** |
| **`smarttable_unacquired_region_filter`** | **未获取统计的地区筛选（数组或 null）** |
| `<数据集名>` | 该数据集的行数据 |

### sessionStorage 键

| 键 | 内容 |
|----|------|
| `smarttable_about_shown` | 首访标记 |

### IndexedDB

- 数据库：`eee_image_db`
- 仓库：`images`（`keyPath: 'id'`）
- 记录：`{ id: string, blob: Blob }`

### 命名约束

- 数据集名**不可**以 `smarttable_` 开头（防止覆盖系统键）
- 受保护数据集名（`默认数据集` / `数据示例-表格样式参考`）不可被占用

---

## 扩展指南

### 新增一个功能模块

1. 在 `js/features/<领域>/` 新建 `xxx.js`，IIFE 挂载 `App.xxx`
2. 在 `index.html` 的 `<script>` 区按依赖顺序引入
3. 若需 DOM 元素：在 `index.html` 加唯一 id，并在 `core/dom.js` 的 `ids` 数组登记
4. 若需事件：实现 `bindXXXEvents()`，在 `events.js` 的 `bindAllEvents()` 注册
5. 若需弹窗：复用 `App.modal` 的 `openModal / showConfirmDialog`
6. 若需持久化：通过 `App.storage` 或 `App.imageStore`
7. 若修改数据：写前 `App.history.pushHistory()`，写后 `renderAllTables() + saveData()`

### 本地验证

```bash
# 语法检查全部 JS（推送前必做）
Get-ChildItem js -Recurse -Filter *.js |
  Where-Object { $_.Name -ne 'jszip.min.js' } |
  ForEach-Object { node --check $_.FullName }
```

---

## 陷阱清单 ⚠️

| 陷阱 | 说明 |
|------|------|
| **必须 HTTP 运行** | `file://` 下 fetch(data.json) 被拦截，默认数据集加载失败 |
| **图片存 IndexedDB** | 用 JSON 导入会丢失图片；迁移必须用 ZIP |
| **数据按 origin 隔离** | 本地与部署环境数据不互通 |
| **`base.css` 与 `constants.js` 颜色双份维护** | 修改任一处必须同步另一处 |
| **`import-export.js` 中的 `version: '2.0'`** | 这是**导出数据格式版本**，不是应用版本，勿改 |
| **`note.js` 事件自绑** | 不在 `events.js` 中，需在 `initNoteFeature()` 里找 |
| **`cell-acquire-tooltip.js` 的 init 在 main.js 中** | 不在 `events.js` 的 `bindAllEvents()` 里 |
| **`interface-colors.js` 使用内联 onclick** | 与主流事件绑定模式不一致 |
| **导出 ZIP 图片统一 PNG** | 动画图片（GIF/WebP）会失去动画效果 |
| **地区配置不随数据集导出** | 换环境需重新配置地区 |
| **高亮 class 复用** | `unacquired.js` 与 `region-manager.js` 共用同名 class，切换面板时需清除残留 |
| **两个表格同步变暗** | `_applyDimming` 只要任一处高亮，两个 table 都加 `unacquired-dimming` |
| **筛选语义** | `null` = 全部选中；空数组 = 未选任何地区 |
| **`data/default.js` 是空占位** | 当前未使用，可忽略 |
| **`data.json` 引用图片文件名** | 文件名必须与 `data/images/` 中实际文件完全一致 |
| **高亮 class 残留** | 面板切换时必须调用 `App.cellHighlighter.clear()`，否则红/绿描边会遗留 |

---

## 安全与可靠性

| 机制 | 实现 |
|------|------|
| XSS 防护 | 用户输入拼入 `innerHTML` 前统一 `escapeHtml` |
| 存储键隔离 | `isReservedKey` 拒绝 `smarttable_*` 前缀 |
| 数据防覆盖 | 默认数据集"只增不减"；加载失败不覆盖已有数据 |
| 回调防残留 | 关闭确认弹窗时立即清空回调 |
| 存储失败提示 | `storage.set / setJSON` 返回布尔，`saveData` 失败时提示 |
| 历史隔离 | 数据集切换 / 清空 / 导入 / 合并后清空历史 |
| 输入容错 | `normalizeCell` 夹紧 `a ≤ t`，颜色越界钳制 |
| 导入安全 | ZIP ≤ 50 MB，图片路径穿越校验，缺失图片计数 |
| 图片隔离 | 图片存 IndexedDB，与 localStorage 分离 |
| 缓存清理完整 | `doClear` 关闭 IndexedDB 连接 → 删除数据库 → 清 Cache API |

---

## 设计权衡

| 决策 | 理由 |
|------|------|
| 无框架 | 项目无需响应式虚拟 DOM；纯 DOM 操作性能足够 |
| IIFE + 全局命名空间 | 避免引入模块打包器；兼容 `file://` 场景 |
| 无 TypeScript | 降低门槛；用 JSDoc + `normalizeCell` 做运行时防护 |
| 图片迁移到 IndexedDB | localStorage 5~10 MB 限制对 base64 图片极易耗尽 |
| 弹窗回调存 window | 简化按钮事件绑定；靠 `closeConfirmDialog` 集中清理 |
| 历史栈上限 20 步 | 平衡内存与可用性；超出的最早记录被移除 |
| 未获取统计按地区独立 | 更直观；与"前 36 名"排行榜语义一致 |
| 悬浮窗并列不互斥 | 用户可同时看到备注与获取地点；靠位置避让实现 |
| 地区数据支持自定义 | 适应游戏版本更新；不硬编码在代码中 |

---

## 版本约定

- **应用版本号**：`index.html`（3 处：title / 关于弹窗 / 底部按钮）
- **`version.json`**：供运行时版本检测，可与应用版本号不同（构建号追踪）
- **数据格式版本**：`import-export.js` 中的 `version: '2.0'`

修改应用版本时**至少同步** `index.html` 的 3 处与 `README.md`。

---

## Lint 基线

### v0.9.3（首次引入 ESLint 9 + Prettier）

- **error：0**
- **warning：30**
  - `no-unused-vars`：21（多为 `catch (e) {}` 未用 e）
  - `prefer-const`：3
  - `no-unused-vars`（未使用变量）：6
  - 其余：0

  ---

## 测试基线

### v0.9.4（首次引入单元测试）

**工具**：Node 内置 `node --test`，零额外依赖

**用例总数**：90

| 测试文件 | 用例数 | 覆盖 |
|---------|-------|------|
| `test/constants.test.js` | 7 | 常量一致性（14 组 × 5 副属性、12 行、COLS 派生、默认地区） |
| `test/utils.test.js` | 50 | normalizeCell / parseTriple / getColumnIndex / combinations / getUnacquiredScore / formatBytes / 颜色转换 / escapeHtml |
| `test/dataset-merge.test.js` | 22 | classifyCell / mergeCell / applyStrategy / diffDatasets / buildMultiDiff / applyMultiStrategy / formatCell |
| `test/dataset-manager.test.js` | 11 | isCellOperationAllowed 保护逻辑（v/t/a 三条规则 + 越界安全） |

**运行**：

```bash
npm test

### 处置计划

| 规则 | 数量 | 计划版本 |
|------|-----|---------|
| `no-unused-vars`（catch 参数） | ~21 | 0.9.5 架构重构时统一改为 `catch (_e)` |
| `no-unused-vars`（未使用变量） | ~6 | 0.9.5 逐条清理 |
| `prefer-const` | 3 | 0.9.5 架构重构时由 `--fix` 处理 |

### 目标

- v0.9.5：warning ≤ 10
- v0.9.7：warning = 0