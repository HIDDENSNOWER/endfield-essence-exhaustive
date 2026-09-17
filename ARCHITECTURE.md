# ARCHITECTURE · 开发者文档

> EEE 项目内部结构、模块依赖与扩展指南。
> 适用版本：**v0.9.22**

---

## 改动索引 ⭐

| 我想改…… | 主要文件 | 次要涉及 |
|----------|---------|---------|
| 表格布局 / 单元格渲染 | `features/table/table-renderer.js` | `layout.css` |
| 表格列宽 / 行高 / 底色 | `features/preferences/table-style.js` | `settings-table.css` |
| 单元格键盘导航 / 自定义按键 | `features/keyboard.js` | `index.html` / `settings-table.css` |
| 单元格状态颜色 | `features/preferences/color-preview.js` | `settings-color-preview.css` |
| 界面颜色 / 预览模板 | `features/preferences/interface-colors.js` | `index.html`（`interfacePreviewTemplate`） |
| 颜色方案保存 / 切换 | `features/preferences/scheme-manager.js` | `settings-scheme.css` |
| 明暗主题 | `features/preferences/theme.js` | `base.css` |
| 数据集 CRUD / 备注 | `features/data/dataset-manager.js` / `dataset-remark.js` | `dom.js` |
| 导入 / 导出 / 合并 | `features/data/import-export.js` / `dataset-merge.js` | `lib/jszip.min.js` |
| 外部日志导入 / 转换 | `features/data/external-import.js` | `features/table/stats.js` / `core/dom.js` / `events.js` / `css/features/external-import.css` |
| 默认数据集加载 | `features/data/default-loader.js` | `data/data.json` |
| 地区增删改 / 悬停高亮 | `features/data/region-manager.js` | `dom.js` / `features/region.css` |
| 未获取统计 / 筛选 / 进度条 / 检索 / 模式 / 双击锁定 | `features/table/unacquired.js` | `features/unacquired.css` / `dom.js` |
| 统计信息面板（总览 / 进度 / 维度明细 / 排序 / 展开 / 缺口分析 / 筛选 / 拥有状态 / 列表 / 详情窗 / 拖动 / 动画 / 双击筛选 / 基质总数） | `features/table/stats.js` | `features/stats.css` / `layout.css` |
| 可获取地点悬浮窗（主窗） | `features/table/cell-acquire-tooltip.js` | `features/acquire-tooltip.css` |
| 单元格备注悬浮窗（从窗） | `features/note/note.js` | `features/note.css` |
| 悬浮窗定位工具 | `core/utils.js`（`buildAroundCursor` / `rectsOverlap`） | `note.js` / `cell-acquire-tooltip.js` |
| 高亮控制 / 索引缓存 | `features/table/cell-highlighter.js` | `features/table/table-renderer.js` / `features/keyboard.js` |
| 键盘快捷键 | `features/keyboard.js` | `services/modal.js` |
| 单元格备注数据 + 图片 | `features/note/note.js` | `services/image-store.js` |
| 数值录入 / 对比 / 撤回重做 | `features/cell/cell-value.js` / `cell-record.js` / `history.js` | — |
| 行筛选 | `features/table/row-filter.js` | — |
| 存储管理 / 清除缓存 | `features/preferences/storage-manager.js` / `features/data/cache-clear.js` | — |
| 错误边界 / 数据迁移 / 分层视图 | `core/error-handler.js` / `migration.js` / `namespace.js` | `main.js` |
| 新常量 / 新 DOM / 新事件 | `core/constants.js` / `core/dom.js` / `js/events.js` | — |
| 备注 / 悬浮框 / 图片查看样式 | `css/features/note.css` | — |
| 加载指示器样式 | `css/features/loading.css` | — |
| 地区卡片 / 收集进度条样式 | `css/features/region.css` | — |
| 外部导入引导样式 | `css/features/external-import.css` | `index.html`（`modalExternalImport`） |
| CI / 提交前 hook | `.github/workflows/ci.yml` / `.husky/pre-commit` / `package.json`（`lint-staged`） | — |
| 版本号一键更新 | `bump-version.js` | 7 文件（含 `package-lock.json`） |
| 重复基质提示悬浮窗 | `features/data/dataset-duplicates.js` | `index.html` / `core/dom.js` / `events.js` / `features/data/dataset-manager.js` / `css/features/external-import.css` |

---

## 30 秒速览

```
┌──────────────────────────────────────────────┐
│  入口层   events.js / main.js                │
│  ─────────────────────────────────────────── │
│  功能层   features/{data,table,cell,         │
│                     preferences,note}/       │
│              features/keyboard.js            │
│  ─────────────────────────────────────────── │
│  服务层   services/{storage,modal,           │
│                     image-store}.js          │
│  ─────────────────────────────────────────── │
│  核心层   core/{constants,state,dom,utils,   │
│                  data-model,migration,       │
│                  error-handler,namespace}.js │
└──────────────────────────────────────────────┘
```

- **依赖规则**：上层可依赖下层，下层不可依赖上层；同层可互调
- **规模**：53 个自写源文件 / 约 16,600 行
- **形态**：纯前端 SPA，无框架 / 无构建 / 无后端
- **CSS**：模块化拆分——`base` / `layout` / `components` + `features/`（7 文件）+ `settings/`
- **持久化**：localStorage（数据 / 设置 / 地区 / 导航按键 / 统计面板状态）+ IndexedDB（图片）
- **外部依赖**：仅 `jszip.min.js`
- **开发依赖**：eslint / prettier / jsdom / husky / lint-staged
- **运行要求**：HTTP 服务器（`file://` 下 fetch 被拦截）

---

## 术语约定

| 术语 | 对应常量 | 数据示例 |
|------|---------|---------|
| **能力值** | `SUB_ATTRS` | 敏捷、力量、意志、智识、主能力 |
| **属性** | `ROW_NAMES` | 攻击提升、生命提升、…、终结技充能效率提升 |
| **系列技能** | `ALL_GROUPS` | 强攻、压制、追袭、…、效益 |

**表格结构**：12 属性 × 14 系列技能 × 5 能力值 = 840 格
**刷取组合**：每地区 10 能力值组合 × 16（8 属性 + 8 系列技能）= 160 种

> 代码字段名（`rowName` / `sub` / `groupName` / `ALL_GROUPS`）**保持不变**；存储键名（`smarttable_*`）**保持不变**。

---

## 模块清单

### 核心层 `core/`
| 挂载点 | 职责 |
|--------|------|
| `App.errorHandler` | 全局错误边界（window.onerror + unhandledrejection） |
| `App.constants` | 存储键、系列技能、属性、能力值、默认地区、颜色、尺寸 |
| `App.migration` | 数据迁移框架（按版本顺序执行） |
| `App.state` | 业务状态（rows / theme / baseline / history / panel / sort） |
| `App.uiState` | 临时 UI 状态（pendingApply / confirmCallback / timer / 高亮元素） |
| `App.dom` | DOM 元素一次性缓存 |
| `App.utils` | 单元格标准化、颜色转换、列索引、HTML 转义、悬浮窗候选位 |
| `App.dataModel` | 空单元格 / 空行 / 初始行 / 示例数据工厂 |
| `App.namespace` | 分层视图入口（`App.core.*` / `services.*` / `features.*` / `entry.*`）；`App.core` / `App.services` 冻结 |

### 服务层 `services/`
| 挂载点 | 职责 |
|--------|------|
| `App.storage` | localStorage 统一封装 |
| `App.modal` | 弹窗管理与 Toast（幂等、引用计数、modalStack、A11y） |
| `App.imageStore` | IndexedDB 图片增删查、Blob URL、`closeDB()` |

### 功能层 `features/`
| 子目录 | 模块 |
|--------|------|
| data | `datasetManager` / `datasetRemark` / `importExport` / `datasetMerge` / `defaultLoader` / `cacheClear` / `regionManager` / `externalImport` / `datasetDuplicates` |
| table | `tableRenderer` / `rowFilter` / `stats` / `noteSearch` / `cellTooltip` / `unacquired` / `cellAcquireTooltip` / `cellHighlighter` |
| cell | `cellValue` / `cellRecord` / `history` |
| preferences | `theme` / `tableStyle` / `colorPreview` / `interfaceColors` / `schemeManager` / `stateColorSchemeManager` / `storageManager` |
| note | `note` |
| keyboard | `keyboard` |

### 入口层
| 挂载点 | 职责 |
|--------|------|
| `App.events` | 统一绑定所有模块事件 |
| `App.layout` | 面板切换、布局状态恢复 |

---

## 启动流程

`main.js` 的 `init()` 按序执行，每步由 `safeCall` 包裹（单步失败不阻断）：

```
 0.   errorHandler.init()       全局错误边界
 0.5  migration.migrate()       数据迁移
 1.   initDomCache()            缓存所有 DOM
 2.   state.rows = 空数据        初始化 12×70
 3.   theme.loadTheme()         读主题偏好
 4.   interfaceColors.applyCurrentTheme()
 5.   确保示例数据集存在
 6.   datasetManager.loadData()
 7.   updateDatasetSelect()
 8.   populateDropdowns()       填充 属性/系列技能/能力值
 9.   resetTripleInputs()
10.   initTableStyle()
11.   initNoteFeature()         备注（含自绑事件）
11.5  cellAcquireTooltip.init()
12.   renderAllTables()         渲染主表格
12.5  移除首屏加载遮罩
13.   initCellTooltip()
14.   updateDatasetRemark()
15.   updateLockedUI()
16.   restoreRightPanelState()
17.   events.bindAllEvents()    ← 含 externalImport.bindEvents()
17.5  namespace.init()          构建分层视图（幂等；末尾冻结 core / services）
17.6  keyboard.init()           键盘快捷键（含导航按键设置绑定）
18.   layout.switchPanel('input')
19.   首访弹窗 / 异步加载默认数据
20.   版本检测（fetch version.json）
```

**时序要点**：
- `errorHandler` / `migration` 必须最先执行
- `namespace.init()` 必须在所有模块挂载后；内部用 `_initialized` 保证幂等
- `keyboard.init()` 依赖 `history` / `modal` / `tableRenderer` 就绪
- 异步默认数据加载前记录数据集键，返回时校验（竞态防护）
- `keyboard.init()` 的 `bindNavKeySettings` 依赖 `index.html` 中的 `.key-capture-input` 已渲染
- `externalImport.bindEvents()` 依赖 `dom.js` 已缓存 `btnImportExternal` 等 id

---

## 关键机制

### 数据保护

默认数据集受“只增不减”保护——`isCellOperationAllowed()` 检查新单元格是否低于基准：

- 基准有 `v` → 新 `v` 必须相同
- 基准有 `t` → 新 `t` 不能更小
- 基准有 `a` → 新 `a` 不能更小

示例数据集与默认数据集**不可删除 / 清空 / 重命名**。

### 历史记录

- 栈上限 **20 步**；每条记录 `{ rowIdx, colIndex, oldCell, newCell }`（深拷贝）
- 数据集切换 / 清空 / 导入 / 合并后调用 `resetHistorySafe()` 清空

### 图片存储

- IndexedDB：`eee_image_db` → `images`（`keyPath: 'id'`）→ `{ id, blob }`
- `note.images` 仅保存 ID；兼容旧 base64 数据
- **删除时机**：编辑时仅从数组移除；保存 / 清除时通过差集删除

### 弹窗管理（v0.9.16 修复）

- 引用计数控制滚动锁；`bindModalEvents` 幂等
- `openModal` 重复打开同一弹窗时不重复计数：
  - 先设置 `display:flex` / A11y 属性（幂等刷新）
  - 若已在 `modalStack` 中 → 直接返回，不 `modalOpenCount++`
  - 修复前的 bug：先移除再压入 → 计数累加 → `body.overflow` 永久锁定
- 确认弹窗回调存 `window.__dialogConfirmCallback`，关闭时立即清理
- `modalStack` + `closeTopModal()` 支持 `Esc` 逐层关闭
- A11y：`role="dialog"` / `aria-modal` / Tab 焦点陷阱 / 关闭后焦点恢复
- 测试钩子：`_resetState()`（`@internal`）供测试重置闭包状态

### 事件绑定

| 模式 | 位置 |
|------|------|
| 集中绑定 | `events.js` `bindAllEvents()`（主流，19+ 模块） |
| 模块自绑 | `note.js` `initNoteFeature()` / `cell-acquire-tooltip.js` `init()` / `keyboard.js` `init()` / `stats.js` `_bindEvents()` |

### 键盘导航

**架构**：`keyboard.js` 内的 `moveCellSelection(direction)` 是核心。

**入口**：`_onKeydown` 中 `isEditableTarget` 过滤后调用 `_handleCellNav(e)`，命中导航键则调用 `moveCellSelection`。

**判定条件**：

1. 无弹窗打开（`_isAnyModalOpen()`）
2. 无 `Ctrl` / `Cmd` / `Alt` 修饰键
3. `App.state.activePanel` 为 `'input'` 或 `'record'`
4. 按下的键匹配 `getNavKeys()` 返回的四个方向键

**坐标模型**：

- 全局列索引 `colIdx ∈ [0, 69]`
- 第一部分 `[0, 34]`（对应 `ALL_GROUPS[0..6]`）
- 第二部分 `[35, 69]`（对应 `ALL_GROUPS[7..13]`）
- 两部分横向不相邻，但上下视为连续

**上下键跨表算法**：

```
若当前在可见行列表的首位：
    若 colIdx >= COLS1（第二部分）：
        newRow = 可见行列表末位
        newCol = colIdx - COLS1   // 镜像到第一部分
    否则 return true（已在第一部分顶部）

若当前在可见行列表的末位：
    若 colIdx < COLS1（第一部分）：
        newRow = 可见行列表首位
        newCol = colIdx + COLS1   // 镜像到第二部分
    否则 return true（已在第二部分底部）
```

**左右键**：

- 到第一部分 `colIdx = 0` 或 `colIdx = 34` 时不跨表，直接 return true
- 到第二部分 `colIdx = 35` 或 `colIdx = 69` 时同样不跨表

**列索引 ↔ 系列技能/能力值换算**：

```js
// colIdx → (groupIdx, subIdx)
let offset = 0;
for (let gi = 0; gi < ALL_GROUPS.length; gi++) {
    const len = ALL_GROUPS[gi].sub.length;
    if (colIdx < offset + len) return { gi, si: colIdx - offset };
    offset += len;
}

// (groupIdx, subIdx) → colIdx
App.utils.getColumnIndex(groupIdx, subIdx)
```

**UI 更新流程**（在 `moveCellSelection` 末尾）：

1. 回写 `rowSel.value`、`groupSel.value`
2. 调 `updateSubColOptions(newGroup)` / `updateRecordSubColOptions(newGroup)` 刷新能力值下拉框
3. 回写 `subSel.value`
4. `App.tableRenderer.updateHighlightedCell()` → 高亮新单元格 + 加载备注
5. `_scrollCellIntoView(newRow, newCol)` → `scrollIntoView({ block: 'nearest', inline: 'nearest' })`

**行筛选交互**：`_getVisibleRowIndices()` 从 `App.state.selectedRows` 推导可见行索引数组；上下键在可见行之间移动，跨表时用可见行列表的首尾。

**焦点释放**（`_bindTableBlurHandler`）：

- 在 `tableArea` 上监听 `mousedown`
- 若 `document.activeElement` 是 `INPUT` / `TEXTAREA` / `SELECT`，则 `blur()`
- 效果：点击表格任意位置后，方向键能立即触发导航

**自定义按键配置**：

- 存储：`smarttable_cell_nav_keys`（localStorage）
- 结构：`{ up, down, left, right }`，值为 `KeyboardEvent.key`
- 默认：`ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`
- 读取：`getNavKeys()`（带异常回退）
- 保存：`saveNavKeys(keys)`
- UI 绑定：`bindNavKeySettings()` 遍历 `.key-capture-input[data-dir]`，捕获 keydown 后保存
- 键名格式化：`_formatKeyName(key)` 将 `ArrowUp` 等映射为 `↑ 上` 等

### 悬浮窗主从定位

**背景**：v0.9.13 及之前，`note` 与 `acquire` 各自以鼠标为锚点独立定位，两者常选到相邻候选位，当宽度较大时横向间距不足 30px，必然重叠。

**v0.9.14 重设计**：

| 角色 | 悬浮窗 | 触发延迟 | 定位依据 |
|------|--------|---------|---------|
| 主窗 | 可获取地点（acquire） | 300ms | 鼠标 8 候选位 |
| 从窗 | 单元格备注（note） | 350ms | 主窗实际矩形外侧 8 候选位；主窗未显示时回退鼠标候选位 |

**从窗候选位生成**（围绕主窗矩形 `A = {left, top, right, bottom}`，间距 `gap = 8`）：

```
右            (A.right + gap, A.top)
右（下对齐）  (A.right + gap, A.bottom - h)
下            (A.left,        A.bottom + gap)
下（右对齐）  (A.right - w,   A.bottom + gap)
左            (A.left - w - gap, A.top)
左（下对齐）  (A.left - w - gap, A.bottom - h)
上            (A.left,        A.top - h - gap)
上（右对齐）  (A.right - w,   A.top - h - gap)
```

**关键不变量**：

1. 主窗永不理会从窗
2. 从窗候选位全部紧贴主窗边缘，几何上不可能重叠
3. 50ms 延迟差保证主窗先完成定位
4. 位置读取用 `style.left/top` + `offsetWidth/Height`，不用 `getBoundingClientRect()`

**v0.9.16 工具抽取**：

- `App.utils.buildAroundCursor(x, y, w, h)`：8 候选位生成器（原 `note.js` / `cell-acquire-tooltip.js` 各一份，现统一）
- `App.utils.rectsOverlap(a, b)`：矩形重叠判断（同上）

**已移除的旧机制**：

- `acquire` 的 `MutationObserver`（会与新策略冲突）
- `acquire-tooltip` 的 CSS `transition: left/top 0.15s ease`

### 统一高亮控制

`App.cellHighlighter`：

- `highlight(cellList, options)`：接收 `[{rowIdx, colIndex, isUnacquired}]`
- `clear()`：按记录 + 全表兜底双重清理
- `_applyDimming()` / `_removeDimming()`：两表格同步变暗
- `buildIndex()`：构建 `Map<"r_c", td>`，320 次 `querySelector` 降为 O(1)
- `_getCell(rowIdx, colIndex)`：优先查缓存，未命中回退 `querySelector`
- 面板切换时由 `main.js` 的 `switchPanel()` 调用 `clear()`

**v0.9.16 索引缓存复用**：

- `table-renderer.js:updateHighlightedCell`：优先 `App.cellHighlighter._getCell(...)`
- `keyboard.js:_scrollCellIntoView`：同上
- 效果：长按方向键 3 秒时，DOM 查询量从 N 次降为 O(1) 次

### 命名空间冻结（v0.9.16）

`namespace.js` 的 `init()`：

1. 顶部 `if (this._initialized) return;` 幂等保护
2. `Object.assign(App.core, {...})` / `Object.assign(App.services, {...})` 等
3. 末尾 `Object.freeze(App.core)` / `Object.freeze(App.services)`

**语义**：

- 冻结是浅冻结——只锁定顶层属性引用，不锁内部字段
- `App.core.constants = {}` 会失败（防止误替换模块）
- `App.core.constants.ROW_NAMES = []` 仍可（正常数据操作不受影响）
- `App.features` / `App.entry` 不冻结（模块可能动态挂载）

### 外部数据导入（v0.9.21）

**入口**：数据管理面板「导入/转换外部数据」按钮 → `modalExternalImport` 弹窗。

**输入源**：`endfield-essence-recognizer`（终末地基质妙妙小工具，AGPL-3.0）生成的 `log_*.log`。

**日志关键行**：

```
[INFO]    已识别当前基质，属性: A、B、C, 稀有度: R, 未弃用, 已锁定
[WARNING] 这个基质虽然匹配武器X（N★ 类型），但…因此这个基质是养成材料。   ← 实装
[SUCCESS] 这个基质是养成材料，它不匹配任何已实装武器。                     ← 非实装
```

- A = 能力值（敏捷 / 力量 / 意志 / 智识 / 主能力）
- B = 属性（`ROW_NAMES` 中 12 项之一）
- C = 系列技能（`ALL_GROUPS` 中 14 项之一）
- 三词条可带 `+N` 等级后缀；无后缀按满级 `6` 计

**解析流程**（`parseLog`）：

1. 逐行扫描
2. 命中 `已识别当前基质` 正则 → 建立 pending 条目，同时提取三词条等级拼成 `vStr`（如 `"321"`）
3. 后续行若含 `虽然匹配武器` → 标记 pending 条目的 `isImplemented = true`
4. 下一条 `已识别` 前若没命中 `虽然匹配武器` → 视为非实装

**映射**（`resolveEntries`）：

- 通过 `findIndexByName` 在 `SUB_ATTRS` / `ROW_NAMES` / `ALL_GROUPS` 中匹配（容忍 `"XX"` / `"XX提升"` 两种写法）
- 匹配失败 → 计入 `unresolved`，预览时展示前 5 条

**聚合**（`buildRows`）：

| data.json 该格 | 日志识别 | 结果 |
|---|---|---|
| `t > 0` | 实装 | `a += 1` |
| `t > 0` | 非实装 | `a += 1`（不写 `v`） |
| `t = 0` | 实装 | `a += 1` |
| `t = 0` | 非实装 | `v = max(v, vStr)` |

- `t` 直接取自 `data/data.json` 的基准，不累加
- 基准通过 `fetch('data/data.json', { cache: 'no-store' })` 读取，加载一次后缓存到 `_baseRows`
- 加载失败 → `_baseRows = null`，`t` 基准按 0 处理（预览面板明确提示）

**落库**（`_save`）：

- 归一化：`rawRows.map(row => ({ name, data: row.data.map(App.utils.normalizeCell) }))`
  - `a ≤ t` 夹紧（避免 `t=0`、`a=3` 的不一致状态）
  - `v` 修剪、`note` 结构补齐
- 与 `import-export.js` 的 `proceedImport` 保持一致
- 通过 `App.storage.setJSON(<数据集名>, rows)` 落入现有数据集体系

**预览面板**（`preview`）：

- 显示：日志条目数 / 实装条数 / 非实装条数 / 命中格数 / 未映射条数（前 5 条明细）/ t 基准加载状态 / 示例条目（实装 3 条 + 非实装 2 条）
- 点「导入为新数据集」前必须先预览一次（`_lastPreview` 非空）

**引导 UI**：

- `<details class="ext-guide">` 折叠，内含 `<ol class="ext-guide-steps">` 11 步
- 步骤高度固定（`max-height: 320px`），内部滚动，`<summary>` 常驻可见
- 图片懒加载（`loading="lazy"`），折叠时不请求
- 图片存 `assets/guide/*.png`（11 张）
- 样式全在 `css/features/external-import.css`

**数据契约**：

- 不新增 localStorage 键
- 不使用 `version: '2.0'` 导出文件格式（那是 `import-export.js` 的范围）

### 统计面板（v0.9.17 重写 · v0.9.18 维度明细增强 · v0.9.20 筛选/动画增强 · v0.9.21 基质总数）

**位置**：左侧独立页（`#leftStatsPage`），不再占用右侧面板容器。右侧面板容器原「统计」按钮和面板已移除。

**布局**：`.stats-layout` 三列 grid = 左列 | 分割条 | 右列
- 左列：数据集卡片 + 统计信息卡片（并排）→ 进度卡片 → 维度明细卡片 → 缺口分析卡片
- 右列：筛选卡片 → 结果列表卡片

**关键状态**：
- `_datasetKey`：统计面板当前查看的数据集（null = 跟随主界面）
- `_dimension`：`sub` / `row` / `group`
- `_filters`：三维度 `Set`，交集逻辑（未选维度 = 该维度不参与筛选；全空 = 不显示结果）
- `_ownershipFilter`：拥有状态集合，默认 `{'owned', 'unowned'}`（双选 = 不筛选）
- `_dimSort`：`gap-desc` / `gap-asc` / `default`（持久化 `smarttable_stats_dim_sort`）
- `_dimExpanded`：维度明细展开状态（持久化 `smarttable_stats_dim_expanded`）
- `_skipSummaryAnim`：一次性标志，切换维度 tab / 排序时置 true，仅跳过底部进度条动画

**6 项总览口径**（5 种单元格状态 S0~S4）：
- S0 空：`v='' & t=0` → 未填充
- S1 纯数值：`v≠'' & t=0` → 已填充（完整）
- S2 实装未获取：`t>0 & a=0` → 未填充
- S3 实装部分：`t>0 & 0<a<t` → 已填充（不完整，加权 a/t）
- S4 实装满：`t>0 & a=t` → 已填充（完整）

**缺口贡献**：
```js
if (t > 0) return Math.max(0, t - a);
if (!v) return 1;
return 0;
```

**缺口分析**：单 `<table class="nx-unified">` 组织 31 列（左 15 + 间隙 1 + 右 15），13 行。单元格颜色按 `hsl(120 → 0)` 连续映射，每表独立 max 归一化。底部 `.nx-colorbar-gradient` 显示标尺。

**右列宽度**：
- 存储：`smarttable_stats_right_width`（280~720 px）
- 锁定：`smarttable_stats_right_locked`
- 拖动：mousedown + mousemove（rAF 节流）+ mouseup 保存

**详情悬浮窗**：fixed 定位遮罩 + 居中面板，点空白关闭。

**维度明细（v0.9.18）**：

- 三维度切换：能力值 / 属性 / 系列技能
- **排序选择器**（`#statsDimSort`）三种模式：
  - `gap-desc`：未获取降序 / 获取升序（默认）
  - `gap-asc`：未获取升序 / 获取降序
  - `default`：按 `SUB_ATTRS` / `ROW_NAMES` / `ALL_GROUPS` 数组原序
  - 排序逻辑在 `sortDimList(list, order)` 中集中实现
  - 排序键为 `b.none`（未获取**格数**），非基质数
- **基质口径数据**：
  - `newBucket` 扩展两个累加器：`totalEssence` / `ownedEssence`
  - 聚合规则与 `calcOverviewStats` / `calcGroupStats` 完全一致：
    ```js
    b.totalEssence += Math.max(1, t);
    if (t > 0) b.ownedEssence += a;
    else if (cell.v) b.ownedEssence += 1;
    ```
  - 行内显示「已获取基质数（绿） / 未获取基质数（红）」
  - 进度条宽度 = 右侧百分比 = `ownedEssence / totalEssence × 100%`
  - 三处数字同源，视觉上永远自洽
  - 各行 `totalEssence` 相加 = 总览「总基质数」；与「统计信息」详情窗一致
- **双色显示**：
  - `<b class="stat-owned">` → `.stats-dim-row-gap .stat-owned { color: #52c41a }`
  - `<b class="stat-missing">` → `.stats-dim-row-gap .stat-missing { color: #ff4d4f }`
  - 优先级覆盖现有 `.stats-dim-row-gap b { color: var(--danger-primary) }`（0,2,0 > 0,1,1）
- **固定 5 行视窗 + 滚轮滚动**：
  - `#statsDimBlock { max-height: 130px; overflow-y: auto; scrollbar-gutter: stable }`
  - 130px = 5 行 × 26px；行高由 `.stats-dim-row { min-height: 26px; box-sizing: border-box }` 锁定
  - 滚动条美化：`#statsDimBlock::-webkit-scrollbar` 系列
- **展开 / 收起按钮**（`#statsDimToggle`）：
  - `_dimExpanded` 控制状态；`_applyDimExpanded()` 应用 DOM 类 `.is-expanded`
  - 展开时 `#statsDimBlock.is-expanded { max-height: none; overflow-y: visible }`
  - 按钮文案：`展开` / `收起`；`aria-expanded` 同步
  - 行数 ≤ 5 时按钮自动隐藏（无滚动无意义）
  - **点击处理必须在 `click` 监听器内**（按钮是 click 事件）；误放 `change` 监听器会完全失效
  - 状态持久化到 `smarttable_stats_dim_expanded`

**拥有状态筛选（v0.9.20）**：

- 筛选卡片新增「拥有状态」组，渲染两枚 chip：`已拥有` / `未拥有`
- 状态存储于 `_ownershipFilter`，默认 `new Set(['owned', 'unowned'])`
- 语义：
  - `size === 2`（默认）→ 不筛选
  - `size === 0`（宽容处理）→ 不筛选
  - `size === 1` → 仅显示对应类别
- `isOwned = status !== 'none'`（`has` / `partial` / `full` 均算已拥有）
- 点击处理必须放在通用 `.stats-filter-chip` 分支**之前**（否则会被吞，导致 `_filters[undefined]` 报错）
- 全选 / 清空按钮同步重置到双选（保持"不筛选"语义）

**结果列表（v0.9.20）**：

- 列顺序：能力值 → 属性 → 系列技能 → 状态 → 数值 → 可获取地区
- 表头与行内容同步调整
- **列自适应**：`.stats-matrix-table { width: max-content; min-width: 100%; table-layout: auto }`；`th/td { white-space: nowrap; padding: 4px 8px }`
- **水平滚动**：`.stats-list-block { overflow-x: auto }`
- 地区明细展开后局部换行：`.stats-matrix-table .stats-cell-region-list { white-space: normal; word-break: break-word }`

**基质总数（v0.9.21）**：

- 列表头部文案：`符合条件的基质：n 项 · 共 N 基质`
- `n = items.length`（命中的格数）
- `N = items.reduce((sum, it) => sum + Math.max(1, it.t || 0), 0)`（基质口径）
- 与总览「总基质数」、详情窗、维度明细进度条口径一致
- 位置：`_renderList` 里 `const shown = items.slice(0, _listLimit);` 之后

**刷新反馈（v0.9.20）**：

- `_refreshWithFeedback(btn)`：按钮文案「刷新 → 刷新中… → ✓ 已刷新」；0.9s 后复位
- 期间 `#statsLayout` 加 `.is-refreshing`，触发 `statsRefreshFlash` 0.5s 淡入
- 可选 Toast（`App.modal.toast` 存在时）

**进度动画（v0.9.20）**：

- **`animateBars(rootEl, speedPctPerSec = 70)`**：恒定速度驱动进度条
  - 所有条共享同一时间轴 `walked = (now - start) × speedPctPerSec / 1000`
  - 每条用 `Math.min(walked, target)` 截断；到位后停止，其他条继续
  - 每帧按当前宽度重新判定 `progress-low/mid/high` → 颜色实时变档
  - 维度明细：`animateBars(dimEl, 160)`；底部进度：`animateBars(el, 120)`
  - **第二参数是「每秒百分比」不是毫秒**；常用值 80~160
- **`animateHeatmap(rootEl, speedDegPerSec = 150)`**：缺口分析动画
  - 颜色：`hue = Math.min(walked, targetHue)`，从红到目标色
  - 数字：`num = max × (1 − walked / 120)`，clamp 到 `[v, max]`
  - 颜色与数字同一帧到达
  - **第二参数是「每秒 hue 度数」不是毫秒**；默认 150 → 120° 约 0.8s
- **`_skipSummaryAnim` 一次性标志**：
  - 切换维度 tab / 排序时置 `true`
  - `_renderSummary` 开头消费后置回 `false`
  - 仅底部进度条跳过动画（`_renderProgressBars(ov, animate)`）；维度明细条始终动画
  - 刷新 / 切数据集 / 首屏进入时保持 `false`，底部进度条正常播放

**双击缺口分析应用筛选（v0.9.20）**：

- 三类单元格挂载不同 `data-*`：
  - 左半（`hmMatrix`，属性 × 系列技能）：`data-dim-row` + `data-dim-group`
  - 右上（`rowSubMatrix`，属性 × 能力值）：`data-dim-row` + `data-dim-sub`
  - 右下（`groupSubMatrix`，系列技能 × 能力值）：`data-dim-group` + `data-dim-sub`
- `container` 上委托 `dblclick`：`.nx-cell` 命中 → `_applyHeatmapFilter(cell)`
- `_applyHeatmapFilter(cell)`：
  - 读取 `dataset.dimRow` / `dimGroup` / `dimSub`
  - 清空三维度筛选后写入对应值
  - `_ownershipFilter` 保持用户原选择
  - 调 `_renderFilterOptions()` + `_renderList()` 刷新 UI
  - 单元格加 `.is-flash`，600ms 后移除
- **不与 resizer 的 dblclick 冲突**：resizer 的 `event.target` 不是 `.nx-cell`，直接 return

### 未获取统计

**统计单位**：`(地区, 3 能力值, 属性或系列技能)` —— 每地区 160 种组合。

**缺口贡献**（每格）：
```js
if (cell.t > 0) return Math.max(0, cell.t - (cell.a || 0));  // 实装：按缺口数
if (cell.v !== '') return 0;                                  // 有数值：已获取
return 1;                                                     // 完全空白：+1
```

**展示（三模式）**：

| 模式 | `_mode` 值 | 内容 |
|------|-----------|------|
| 未获取前 36 | `top` | 缺口 > 0 的条目，按缺口降序取前 36 |
| 未获取后 36 | `bottom` | 缺口 > 0 的条目，按缺口升序取前 36 |
| 全收集 | `full` | 缺口 = 0 的条目（全部刷满） |

**进度分档**：

- `_progressClass(percent)`：`< 30` → `progress-low`；`30–69` → `progress-mid`；`≥ 70` → `progress-high`

**双击锁定高亮**：

- 状态：`_lockedLi`（被锁定的 `<li>`）+ `_lockedBtnLi`（取消按钮 `<li>`）
- `_lockItem(li)`：解除旧锁定 → 记录新锁定 → 高亮 → 插入“取消高亮”按钮
- `_unlockItem(clearHighlight)`：移除按钮 `<li>` → 清空状态 → 可选清空高亮

**地区筛选**：状态存 `smarttable_unacquired_region_filter`（`null` = 全部）。

### 地区管理

**数据结构**：`{ name, rows: string[], groups: string[] }`。

**持久化**：`smarttable_regions`；未修改时读取 `DEFAULT_REGIONS`（12 地区）。

**悬停高亮**：悬停地区卡片 → 高亮 8 属性 × 8 系列技能 × 5 能力值 = **320 格**。

**收集进度条**：卡片底部显示 `已完成 / 320`（X%），分档着色（<30% 红 / 30~70% 橙 / ≥70% 绿）。

### 错误边界

`App.errorHandler.init()` 监听 `window.onerror` + `unhandledrejection`；记录最近 50 条；Toast 提示；**不阻止**浏览器原生报错。

### CSP 与 FOUC

- `index.html` 的 `Content-Security-Policy` meta（紧随 `<title>`）
- 策略：`script-src 'self'`；`style-src 'self' 'unsafe-inline'`；`img-src 'self' data: blob:`
- 内联 FOUC script 外移为 `js/fouc-prevent.js`（`<head>` 同步加载）

### 数据迁移

`App.migration`：

- 存储键 `smarttable_version`；常量 `CURRENT_VERSION`
- 由 `main.js` 第 0.5 步调用；幂等
- `_lt(a, b)` 版本比较；`_safeRun(label, fn)` 容错
- 新增迁移：更新 `CURRENT_VERSION` → 新增 `_mXXX()` → 在 `migrate()` 加调用

### 首屏优化

- **加载遮罩**：`#appLoading` → 表格渲染后 0.35s 淡出
- **脚本并行**：`<body>` 底部全部脚本加 `defer`

### 版本号管理

`bump-version.js` 一次命令更新 **7 个文件**：

1. `version.json`（含 `buildTime` 刷新）
2. `package.json`（顶层 `version` 字段）
3. `js/core/migration.js`（`CURRENT_VERSION` 常量）
4. `index.html`（所有 `ver.X.Y.Z`）
5. `README.md`（`**当前版本**：vX.Y.Z`）
6. `ARCHITECTURE.md`（`适用版本：**vX.Y.Z**`）
7. `package-lock.json`（通过 `npm install --package-lock-only` 自动同步）

**设计要点**：

- `package-lock.json` 是 npm 生成物，不手动编辑
- 通过 `execSync('npm install --package-lock-only', { shell: true })` 让 npm 维护
- 失败降级为警告，不阻塞其他 6 文件更新
- 支持 `node bump-version.js X.Y.Z` 或交互式输入

---

## 数据契约

### localStorage 键

| 键 | 内容 |
|----|------|
| `smarttable_dataset_list` | 数据集名称数组 |
| `smarttable_current_dataset` | 当前数据集名 |
| `smarttable_theme` | `light` / `dark` |
| `smarttable_version` | 应用运行版本 |
| `smarttable_dataset_remarks` | `{ 数据集名: 备注 }` |
| `smarttable_user_colors` | `{ light: {...}, dark: {...} }` |
| `smarttable_interface_colors` | `{ light: {...}, dark: {...} }` |
| `smarttable_style` | `{ colWidth, rowHeight }` |
| `smarttable_table_bg` | `{ light: {...}, dark: {...} }` |
| `smarttable_note_layout` | `text-top` / `image-top` / `horizontal` |
| `smarttable_note_tooltip_pos` | `{ left, top, width, height }` |
| `smarttable_right_collapsed` | `'0'` / `'1'` |
| `smarttable_schemes` / `smarttable_active_scheme` | 界面颜色方案 |
| `smarttable_state_color_schemes` / `..._active_...` | 单元格颜色方案 |
| `smarttable_custom_quota` / `smarttable_quota_warn_percent` | 配额与警示 |
| `smarttable_regions` | 地区配置 `[{name, rows, groups}]` |
| `smarttable_unacquired_region_filter` | 未获取统计的地区筛选（数组或 `null`） |
| `smarttable_cell_nav_keys` | 单元格导航按键 `{up, down, left, right}` |
| `smarttable_stats_right_width` | 统计面板右列宽度（280~720 px） |
| `smarttable_stats_right_locked` | 统计面板右列锁定（`'0'` / `'1'`） |
| `smarttable_stats_dim_sort` | 维度明细排序（`gap-desc` / `gap-asc` / `default`） |
| `smarttable_stats_dim_expanded` | 维度明细展开状态（`'0'` / `'1'`） |
| `<数据集名>` | 该数据集的行数据 |
| `smarttable_dataset_import_meta` | `{ [数据集名]: { importedAt, normalDuplicates[], implementedOverflows[] } }`（外部导入的重复提示记录；仅提示，不参与数据表） |

**外部导入（v0.9.21）不新增存储键**：转换结果通过 `App.storage.setJSON(<数据集名>, rows)` 落入现有数据集体系；`data/data.json` 仅作为 `t` 的只读基准被 `fetch` 读取。

### sessionStorage / IndexedDB

- sessionStorage：`smarttable_about_shown`（首访标记）
- IndexedDB：`eee_image_db` → `images` → `{ id, blob }`

### 命名约束

- 数据集名不可 `smarttable_` 开头
- 受保护名（`默认数据集` / `数据示例-表格样式参考`）不可被占用

---

## 测试体系（v0.9.20）

### 测试文件分布

| 文件 | 用例数 | 覆盖模块 |
|------|-------|---------|
| `test/constants.test.js` | 7 | `App.constants` 常量 |
| `test/utils.test.js` | 50 | `App.utils` 纯函数 + 颜色转换 |
| `test/dataset-merge.test.js` | 22 | `App.datasetMerge` 差异/合并/策略 |
| `test/dataset-manager.test.js` | 11 | `App.datasetManager.isCellOperationAllowed` |
| `test/dom.test.js`（jsdom） | 13 | `App.cellHighlighter` DOM 操作 |
| `test/keyboard.test.js`（jsdom） | 21 | `App.keyboard.moveCellSelection` + 自定义按键 |
| `test/modal.test.js`（jsdom） | 20 | `App.modal` 弹窗栈 / 回调清理 / A11y |
| `test/note.test.js`（jsdom） | 8 | `App.note.positionNoteTooltip` 主从定位 |
| `test/unacquired.test.js`（jsdom） | 12 | `App.unacquired` 模式切换 / 双击锁定 |
| **合计** | **164** | — |

> 外部导入模块（`external-import.js`）的纯函数（`parseLog` / `findIndexByName` / `buildRows`）暂无对应测试；后续如需补充，参考「新增测试」一节。注意 `_loadBaseRows` 依赖 `fetch`，测试时应 stub `_baseRows`。

### jsdom 使用规范

- **必须**给 `new JSDOM(html)` 传 `url: 'http://localhost/'`
- 原因：jsdom 默认 `about:blank` 是 opaque origin → `localStorage` 抛 `SecurityError`
- 所有交互模块（keyboard / modal / note / unacquired / cellHighlighter）的测试都必须遵守此规则

### 测试钩子

`App.modal._resetState()`（`@internal`）：

- 重置 `modalOpenCount` / `modalStack` / `focusStack` / `body.overflow`
- 仅供 `test/modal.test.js` 的 `beforeEach` 调用
- 生产代码不应调用

---

## 工程化与 CI（v0.9.20）

### GitHub Actions（`.github/workflows/ci.yml`）

- **触发**：push / PR 到 `main` / `master`
- **矩阵**：Node 22、Node 24（不含 18/20，因 jsdom 30 引擎要求）
- **步骤**：`checkout@v5` → `setup-node@v5`（缓存 npm）→ `npm ci` → `lint` → `test` → `test:coverage` → `npm audit --audit-level=high`
- **并发控制**：`concurrency` 取消同分支旧运行
- **超时**：默认（约 30 秒 / job，缓存命中时）

### 提交前 hook（`.husky/pre-commit`）

```
npx lint-staged
```

`package.json` 的 `lint-staged` 配置：

```json
{
  "js/**/*.js": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"],
  "css/**/*.css": ["prettier --write"]
}
```

**应急跳过**：`git commit --no-verify`

### 版本号一键同步（`bump-version.js`）

见“版本号管理”章节。

---

## 扩展指南

### 新增功能模块

1. `js/features/<领域>/xxx.js`，IIFE 挂载 `App.xxx`
2. `index.html` 按依赖顺序引入（**加 `defer`**）
3. 需 DOM → `index.html` 加 id + `core/dom.js` 的 `ids` 登记
4. 需事件 → 实现 `bindXXXEvents()`，在 `events.js` 注册
5. 需弹窗 → 复用 `App.modal`
6. 需持久化 → 通过 `App.storage` 或 `App.imageStore`
7. 修改数据 → 写前 `pushHistory()`，写后 `renderAllTables() + saveData()`
8. 在 `core/namespace.js` 对应层登记
9. **不向 `App.core.*` / `App.services.*` 添加字段**（已冻结）

### 新增迁移

1. 更新 `CURRENT_VERSION`
2. 新增 `_mXXX()` 方法
3. 在 `migrate()` 中加 `if (this._lt(startVer, '0.9.X')) this._safeRun('_mXXX', () => this._mXXX());`

### 新增悬浮窗

若新增第三个悬浮窗，遵循**主从定位**原则：

1. 声明角色（主窗 / 从窗）
2. 主窗用 `App.utils.buildAroundCursor` 8 候选位
3. 从窗优先依附已有主窗的外侧（围绕 `style.left/top + offsetWidth/Height` 计算）
4. 所有位置读取用 `style.left/top`，不用 `getBoundingClientRect()`
5. 通过延迟差保证主窗先定位
6. **不要**用 `MutationObserver` 追踪其他悬浮窗
7. 重叠判断复用 `App.utils.rectsOverlap`

### 新增键盘快捷键

1. 在 `keyboard.js` 的 `_onKeydown` 中加入匹配逻辑
2. 若与导航冲突（如纯字母键），在 `_handleCellNav` **之前**拦截
3. 若需要 Ctrl/Cmd 修饰，放在 `const mod = e.ctrlKey || e.metaKey;` 之后
4. 若需自定义按键，参考 `bindNavKeySettings` 与 `smarttable_cell_nav_keys` 模式

### 新增统计面板子区块（参考 v0.9.18 维度明细增强 / v0.9.20 拥有状态筛选 / v0.9.21 基质总数）

1. **骨架**：`_ensureUI` 里加 `<section class="stats-block">`，标题栏内放操作组
2. **状态**：模块顶部定义 `const XXX_KEY` + `let _xxx`；配套 `loadXxx()` / `saveXxx()`
3. **事件**：
   - 点击类 → `container.addEventListener('click', ...)` 内处理（**勿放 change**）
   - 下拉 / 输入类 → `container.addEventListener('change', ...)` 内处理
   - 双击类 → `container.addEventListener('dblclick', ...)` 内处理
4. **渲染**：`_renderXxx()` 独立函数；数据准备抽 `sortXxx()` / `calcXxx()`
5. **加载**：`_renderAll()` 里先 `_xxx = loadXxx()`，再 `_renderXxxSelect()` / `_renderXxx()`
6. **持久化**：状态改变时立即 `saveXxx()`
7. **动画**（如需恒定速度生长）：给元素挂 `data-target-width`，调 `animateBars(container, speed)`
8. **口径一致**：如需基质计数，用 `Σ max(1, t)`（与总览 / 详情窗 / 维度明细进度条一致）

### 扩展外部导入

1. **新增工具格式**：在 `external-import.js` 内新增 `parseXxxLog(text)` 独立函数，返回与 `parseLog` 相同的条目结构（`{ subAttrRaw, rowRaw, groupRaw, vStr, isImplemented, raw }`）
2. **新增词条映射**：若工具的术语与本项目不一致，扩展 `findIndexByName` 或为每个工具维护独立映射表
3. **新增预览项**：在 `preview()` 的 `html` 拼接里加一行；`_lastPreview` 结构保持不变
4. **落库必过 `normalizeCell`**：`_save` 里 `rawRows.map(row => ({ name, data: row.data.map(App.utils.normalizeCell) }))` 保持不变
5. **新增引导步骤**：`index.html` 的 `<ol class="ext-guide-steps">` 加 `<li>`，图片放 `assets/guide/`，`loading="lazy"`

### 新增测试

1. 创建 `test/xxx.test.js`
2. **必须** `new JSDOM(html, { url: 'http://localhost/' })`
3. 遵循“模块级单例 bootstrap + beforeEach 仅重置状态”模式
4. 加载依赖顺序：`constants` → `utils` → 被测模块
5. 若模块有闭包状态，为其提供 `_resetState()` 钩子（`@internal`）

### 发布新版本

```bash
# 1. 本地验证
npm ci && npm run lint && npm test

# 2. 更新版本号（7 文件）
node bump-version.js 0.9.22

# 3. 更新 README / ARCHITECTURE 版本演进表（手动）

# 4. 提交
git add -A
git commit -m "v0.9.22 <主题>"
git push

# 5. 打 tag
git tag -a v0.9.22 -m "v0.9.22 <主题>"
git push origin v0.9.22
```

### 本地验证

```bash
# 语法
Get-ChildItem js -Recurse -Filter *.js |
  Where-Object { $_.Name -ne 'jszip.min.js' } |
  ForEach-Object { node --check $_.FullName }

# 测试 + Lint
npm test
npm run lint
```

---

## 陷阱清单 ⚠️

| 陷阱 | 说明 |
|------|------|
| **必须 HTTP 运行** | `file://` 下 fetch(data.json) 被拦截 |
| **图片存 IndexedDB** | JSON 导入丢图片；迁移必须用 ZIP |
| **数据按 origin 隔离** | 本地与部署环境不互通 |
| **`base.css` 与 `constants.js` 颜色双份维护** | 改一处必须同步另一处 |
| **`import-export.js` 的 `version: '2.0'`** | 数据格式版本，非应用版本，勿改 |
| **`note.js` 事件自绑** | 不在 `events.js`，在 `initNoteFeature()` 里 |
| **`keyboard.js` / `cell-acquire-tooltip.js` init 在 main.js** | 时序敏感 |
| **导出 ZIP 图片统一 PNG** | 动画图片会失去动画 |
| **地区配置不随数据集导出** | 换环境需重新配置 |
| **高亮 class 复用** | 切换面板必须调用 `cellHighlighter.clear()` |
| **两表格同步变暗** | `_applyDimming` 只要一处高亮，两个 table 都加蒙版 |
| **筛选语义** | `null` = 全部；空数组 = 未选任何 |
| **`data.json` 图片文件名** | 必须与 `data/images/` 中实际文件一致 |
| **`App.state` / `App.uiState`** | 业务状态 vs 临时 UI 状态，勿混用 |
| **CSP 禁止内联脚本** | `index.html` 不可写内联 `<script>` |
| **`migration.js` 的 `CURRENT_VERSION`** | 每次发版需同步（`bump-version.js` 已处理） |
| **`error-handler.js` init 时序** | 必须在 `init()` 最早期 |
| **术语映射** | 能力值 / 属性 / 系列技能；代码字段名不变 |
| **未获取统计三模式** | `_mode` 切换后面板标题变化，但组件 id 不变 |
| **双击锁定需手动解除** | 切换面板 / 重渲染列表 / 再次检索会自动解除 |
| **检索结果与排序列表共用悬停逻辑** | 两者都走 `_bindListInteractions`，勿重复绑定 |
| **悬浮窗禁止 `getBoundingClientRect`** | v0.9.14 起用 `style.left/top + offsetWidth/Height` |
| **悬浮窗禁止 CSS transition 位置** | `acquire-tooltip` 已移除，新增悬浮窗勿添加 |
| **悬浮窗禁止 MutationObserver 互追** | 会与主从定位冲突 |
| **悬浮窗触发延迟差** | 主窗 300ms、从窗 350ms |
| **键盘导航左右不跨表** | `colIdx === COLS1` 或 `COLS1 - 1` 时直接 return true |
| **键盘导航上下跨表保持列位** | `colIdx ± COLS1` 换算，非重置为 0 |
| **导航设置输入框需 `readonly`** | 否则移动端弹出软键盘干扰捕获 |
| **`key-capture-input` 需在 `init()` 前渲染** | `bindNavKeySettings` 依赖 DOM 存在 |
| **自定义按键不能是修饰键** | `Control` / `Alt` / `Shift` / `Meta` / `CapsLock` 被过滤 |
| **`Object.freeze` 是浅冻结** | 只锁顶层引用，不锁内部字段（`App.core.constants.X` 仍可写） |
| **控制台非严格模式无法验证 freeze** | 控制台赋值冻结属性不抛错（静默失败）；用 `Object.isFrozen()` 或“值是否改变”判断 |
| **`App.features` / `App.entry` 不冻结** | 模块可能动态挂载 |
| **`modal.js:openModal` 引用计数** | 重复打开必须 `if (already) return;`，不得先移除再压入（会漏减） |
| **`modal.js` 测试需调 `_resetState()`** | 闭包变量跨测试不重置 |
| **jsdom 测试必须传 `url`** | `about:blank` 是 opaque origin，`localStorage` 抛 `SecurityError` |
| **`package.json` 版本号须为具体数字** | `^9.x.x` 是非法 semver；用 `^9.1.7` |
| **`package-lock.json` 由 npm 维护** | 不手动编辑；用 `npm install --package-lock-only` 同步 |
| **husky `prepare` 脚本** | 在 CI 中可能触发；必要时加 `env: HUSKY: 0` |
| **`bump-version.js` 覆盖 7 文件** | 含 `package-lock.json`（通过 npm 命令自动同步） |
| **`stats.js` 大量使用 `!= null`** | ESLint `eqeqeq` 严格模式下会报错；统一改用 `!!cell.v` 或 `cell.v !== null && cell.v !== undefined` |
| **`stats.js` 使用 `cancelAnimationFrame`** | 文件顶部加 `/* global cancelAnimationFrame */`，否则 `no-undef` |
| **缺口分析 `<table>` 的 `table-layout: fixed` 需明确宽度** | 只用 `width: max-content` 会算出 1,000,000px 溢出；必须内联 `style="width:Npx"` 或用 `<colgroup>` |
| **`_filters` / `_listLimit` 是 `const`** | 全选按钮不能整体重新赋值，要用 `clear()` + `forEach(add)` |
| **维度明细排序键用格数** | `sortDimList` 按 `b.none`（未获取**格数**）排序；显示的数字是**基质数**。若两者需要一致，需改用 `b.totalEssence - b.ownedEssence` |
| **维度明细排序选择器是 `change` 事件** | `<select>` 触发 change；与按钮的 click 事件必须分开监听 |
| **`statsDimToggle` 必须在 `click` 监听器处理** | 按钮是 click 事件，误放 `change` 监听器会完全失效（且 `t` 未定义会抛错） |
| **`#statsDimBlock` 与 `.is-expanded` 成对** | 展开时用 `.is-expanded` 覆盖 `max-height` / `overflow-y`；缺 CSS 则展开无效 |
| **维度明细固定 5 行依赖 `min-height: 26px`** | 行高漂移会导致视窗切行；改字号 / padding 需同步调整 `#statsDimBlock` 的 `max-height` |
| **维度明细行有 `border-top` 时 `box-sizing`** | 必须 `box-sizing: border-box`，否则 `min-height` 会被 border 撑大 |
| **`index.html` 引用 7 个 CSS 而非旧的 `features.css`** | 拆分为 v0.9.19；v0.9.21 新增 `external-import.css`；若只删了旧文件忘了改引用，页面会裸奔 |
| **CSS 拆分后 `.gitignore` 可能误伤 `css/features/`** | 有些 gitignore 模板带 `features/` 规则；`git status --short css/` 应显示 7 个新文件 |
| **`lint-staged` 默认不含 CSS** | v0.9.19 前只处理 js/json/md；若想 CSS 也走 prettier，需在 `package.json` 显式加 `"css/**/*.css": ["prettier --write"]` |
| **`animateBars` 第二参数是「每秒百分比」不是毫秒** | 传 600/800 会让满条 0.17s 完成；常用值 80~160 |
| **`animateHeatmap` 第二参数是「每秒 hue 度数」** | 默认 150 → 120° 约 0.8s；不要传毫秒 |
| **进度条/缺口分析颜色由 JS 逐帧改，非 CSS transition** | `transition: width` 只用于「落位不动画」路径；动画路径必须无 transition 叠加 |
| **`_skipSummaryAnim` 只在切换 tab/排序时置 true** | 刷新 / 切数据集 / 首屏进入必须保持 false，让底部进度条动画 |
| **双击缺口分析必须放在 `container` 委托上** | 若绑在 `el`（热力图容器）上，重渲染后监听会丢；委托在稳定的 `container` 上 |
| **`nx-cell` 的 `data-hue` 需保留小数点** | `toFixed(1)` 与 `animateHeatmap` 内 `parseFloat` 配对；取整会导致终点色差 |
| **拥有状态 chip 的 `data-ownership` 必须在通用 `.stats-filter-chip` 分支之前拦截** | 否则会被 `_filters[undefined]` 吞掉并抛错 |
| **拥有状态筛选默认 `size === 2` 即不筛选** | `size === 0` 也视为不筛选（宽容处理），避免「清空」后误显示空结果 |
| **`_ownershipFilter` 是 `const`** | 全选/清空按钮要用 `clear() + add()`，不能整体重新赋值 |
| **外部导入依赖 `data/data.json` 可访问** | `fetch('data/data.json')`，`file://` 下会被协议/CSP 拦截；HTTP 环境无问题 |
| **外部导入结果必须过 `normalizeCell`** | `buildRows` 可能产出 `a > t`（日志命中多次实装但 `data.json` 中 `t=0`）；`_save` 里统一 `App.utils.normalizeCell` 夹紧 |
| **`external-import.js` 的 `bindEvents` 非幂等** | 内部无 `_bound` 标志；在 `events.js` 里只调用一次，避免重复引入脚本或重复调用 |
| **引导截图路径大小写敏感** | `assets/guide/*.png` 在 Linux / GitHub Pages 上区分大小写；重命名时留意 |
| **`external-import.css` 必须在 `<head>` 引入** | 放在 `<body>` 里虽合法但违反项目约定，且首次加载顺序不可控 |
| **`extImportOnlyPristine` 已废弃** | 规则改为「两类都记录」后，该复选框无对应逻辑；HTML 与 `dom.js` 的 `ids` 里均不应再出现 |
| **外部导入不新增 localStorage 键** | 结果通过 `App.storage.setJSON(<数据集名>, rows)` 落入现有数据集体系；`data/data.json` 仅作为 `t` 的只读基准 |
| **日志「实装 / 非实装」判定靠 `虽然匹配武器`** | 逐行累积：识别行之后、下一条识别行之前，若出现该关键词，则本条为实装 |
| **无 `+N` 后缀的词条按满级 6 计** | 识别器偶有等级识别失败的情况；按 `1` 或跳过会导致 `v` 偏差 |
| **重复提示仅操作 meta，不动数据表** | `dataset-duplicates.js` 的 `clearSelected` 只改 `smarttable_dataset_import_meta`；数据表 (`App.state.rows` / 数据集键) 全程不碰 |
| **`datasetDuplicates.render()` 必须挂在 `updateLockedUI()` 里** | `init()` 流程中 `updateDatasetDisplay()` 不一定会被调用；挂 `updateLockedUI()` 才能保证刷新后按钮按数据正确显隐 |
| **`dataset-duplicates.js` 的 `bindEvents()` 在 `events.js` 调用一次** | 内部无 `_bound` 标志，避免重复引入脚本或重复调用 |

---

## 安全与可靠性

| 机制 | 实现 |
|------|------|
| XSS 防护 | `innerHTML` 前统一 `escapeHtml` |
| CSP | `script-src 'self'` |
| 存储键隔离 | `isReservedKey` 拒绝 `smarttable_*` |
| 数据防覆盖 | 默认数据集“只增不减” |
| 回调防残留 | 关闭确认弹窗立即清空 |
| 存储失败提示 | `storage.set / setJSON` 返回布尔 |
| 历史隔离 | 切换 / 清空 / 导入 / 合并后清空 |
| 输入容错 | `normalizeCell` 夹紧 `a ≤ t`；颜色钳制 |
| 导入安全 | ZIP ≤ 50 MB；路径穿越校验；缺失图片计数 |
| 图片隔离 | IndexedDB 与 localStorage 分离 |
| 缓存清理完整 | 关闭连接 → 删除 DB → 清 Cache API |
| 错误边界 | 捕获同步/异步错误，避免白屏 |
| 数据迁移 | 按版本顺序执行，单步失败不阻断 |
| A11y | `role="dialog"` / 焦点陷阱 / 焦点恢复 |
| 检索容错 | 检索前必填校验，缺项弹 Alert |
| 悬浮窗布局不重叠 | 主从定位 + 8 外侧候选 + 权威位置读取 |
| 键盘导航隔离 | 弹窗打开 / 焦点在输入框时自动跳过 |
| 自定义按键回退 | localStorage 读取失败时用默认方向键 |
| 命名空间冻结 | `App.core` / `App.services` 运行时只读 |
| 外部导入来源隔离 | 仅解析日志文本，不复制/链接/分发外部程序代码 |
| 外部导入归一化 | 结果过 `normalizeCell`，防止 `a > t` 的不一致状态 |
| CI 依赖扫描 | `npm audit --audit-level=high` 为硬门禁 |
| 提交前 lint | husky + lint-staged 自动 `eslint --fix` |
| 动画性能 | 逐帧改 `style.width` / `style.background` + `textContent`，无 DOM 结构变化 |

---

## 设计权衡

| 决策 | 理由 |
|------|------|
| 无框架 | 无需响应式虚拟 DOM；纯 DOM 操作性能足够 |
| IIFE + 全局命名空间 | 避免模块打包器；兼容 `file://` |
| 无 TypeScript | 降低门槛；用 JSDoc + `normalizeCell` 运行时防护 |
| 图片 → IndexedDB | localStorage 5~10 MB 限制对 base64 极易耗尽 |
| 弹窗回调存 window | 简化事件绑定；靠 `closeConfirmDialog` 集中清理 |
| 历史栈 20 步 | 平衡内存与可用性 |
| 未获取统计按地区独立 | 直观；与“前 36 名”语义一致 |
| 命名空间分层视图 | 不改挂载点即得分层补全 |
| 高亮索引缓存 | Map 查表替代 320 次 querySelector |
| 术语用游戏内文案 | 降低玩家理解成本；代码字段名不变 |
| 进度条复用行缓存 | 12 张卡片 × 320 格，缓存后 normalizeCell 只跑 840 次 |
| 三模式共用一个 `_mode` | 状态最小化；切换即重渲染 |
| 检索卡与列表项共用逻辑 | 抽出 `_bindListInteractions`；避免事件重复绑定 |
| 双击锁定用 DOM 兄弟节点 | 不引入额外容器；按钮随列表重渲染自动消失 |
| 悬浮窗主从定位 | 从窗依附主窗外侧，几何上排除重叠 |
| 位置读取用 style 而非 rect | 避免 CSS 过渡/动画污染测量值 |
| 禁止 MutationObserver 互追 | 单向（主→从）定位避免死循环/追逐 |
| 触发延迟差 50ms | 保证主窗先定位 |
| 键盘导航上下跨表、左右不跨 | 两部分视觉上横向不相邻，但纵向可视为连续 |
| 跨表保持相对列位（±35） | 玩家在“残暴×主能力”处按 ↓ 期望落在“效益×主能力” |
| 点击表格释放输入框焦点 | 避免方向键被“列宽”等输入框捕获 |
| 自定义按键存 localStorage | 与项目其他设置保持一致，无需额外机制 |
| 导航键捕获输入框 readonly | 防止移动端软键盘弹出干扰 |
| `Object.freeze` 冻结 core / services | 防止运行时误替换模块引用；浅冻结不阻数据操作 |
| `namespace.init` 幂等 | 避免重复 `Object.assign` 向冻结对象写入 |
| 提取悬浮窗定位工具到 utils | 消除 note / acquire 双份维护；未来候选位策略仅改一处 |
| 索引缓存复用 | `updateHighlightedCell` / `_scrollCellIntoView` 均优先 `_getCell` |
| husky + lint-staged | 提交前自动 lint，只处理暂存文件（< 1 秒） |
| CI 双 Node 矩阵 | 覆盖 22 LTS 与 24 最新；jsdom 30 引擎要求不含 18/20 |
| Actions v5 | 消除 Node 20 弃用警告；与 GitHub runner Node 24 匹配 |
| `bump-version.js` 调 npm 命令同步 lock | 遵循“lock 由 npm 维护”原则；避免手动改被覆盖 |
| 统计面板移至左侧独立页 | 右侧面板保持数据录入 / 筛选 / 列表等操作；统计是阅读态 |
| 缺口分析用连续色阶而非分档 | 分档会掩盖同档内差异；连续色阶能反映任意两格强度差 |
| 三交叉表单表对齐 | 31 列单表方案优于 grid 三块拼装，无高度耦合问题 |
| 属性列头缩写、能力值行头全名 | 列头空间紧；能力值本身短，无需缩写 |
| 维度明细用**基质口径**而非格数 | 与总览 / 详情窗统一；partial 不再隐形；进度与百分比自洽 |
| 维度明细文字绿红双色 | 直觉化：绿 = 已获取，红 = 未获取；与单元格状态色一致 |
| 维度明细排序用格数而非基质 | 保留原有语义“未获取”= 未获取**格**；与显示基质数独立 |
| 维度明细固定 5 行视窗 | 面板高度可控；不挤压下方缺口分析卡片 |
| 展开 / 收起按钮状态持久化 | 避免每次进入都要重调 |
| 行数 ≤ 5 时隐藏展开按钮 | 无滚动即无展开意义；避免无功能按钮 |
| 用 `.is-expanded` 类切换展开 | CSS 与 JS 解耦；一个类切换 `max-height` 与 `overflow` |
| `statsDimToggle` 用 `click` 事件 | `<button>` 原生触发 click；与 `<select>` 的 change 分离 |
| 拥有状态 chip 用 `data-ownership` 区分 | 与通用筛选 chip 分开处理，避免 `_filters[undefined]` |
| 拥有状态默认双选 = 不筛选 | 与三维度「未选 = 不参与」的语义对齐；减少误过滤 |
| 拥有状态 chip 放在通用筛选分支之前 | 保证 `data-ownership` 有独立处理路径 |
| 结果列表列自适应（max-content） | 短文本不换行、不压断；内容超宽时滚动 |
| 结果列表列顺序为能力值优先 | 能力值组合是刷取时首先确定的维度，放最前符合操作直觉 |
| 恒定速度进度动画（%/s） | 长条晚到位，短条早到位；视觉上节奏统一；比固定时长更有"生长"感 |
| 颜色在生长过程中实时变档 | 每帧按当前宽度重新判定 class；用户能观察颜色过渡 |
| 缺口分析数字与颜色同源驱动 | 同一个 `walked` 驱动 hue 与 num；保证同帧到达 |
| 数字从矩阵最大值滚到目标 | 用 `max × (1 − walked/120)`；与色阶语义对齐 |
| 缺口分析双击应用筛选 | 从可视矩阵直接跳转到筛选结果，减少手动筛选成本 |
| 切换 tab/排序跳过底部进度动画 | 数据未变；动画会形成"闪烁"错觉；仅维度明细条保留动画作为视觉反馈 |
| 刷新按钮文案 + 淡入反馈 | 让"刷新无实感"变成可感知的操作；0.9s 复位避免状态残留 |
| 统计列表加「共 N 基质」 | 格数（n 项）+ 基质数（N）两个口径并排显示，避免用户误把格数当基质数 |
| 外部导入以 `data.json` 为 `t` 基准而非累加 | `data.json` 是实装数据的权威来源；重复数不应由识别日志决定 |
| 非实装只写 `v` 不动 `t` | 识别日志中非实装条目不含重复数信息；写 `t` 会污染基准 |
| 实装与非实装两条流水线互不干扰 | 规则清晰、可分别调试；一条解析出错不影响另一条 |
| 外部导入结果必过 `normalizeCell` | 与 `import-export.js` 的 `proceedImport` 保持一致；统一执行 `a ≤ t` 夹紧 |
| 引导用原生 `<details>` 而非自定义 JS | 零 JS，键盘 / A11y 由浏览器原生支持；不干扰弹窗焦点陷阱 |
| 引导图片懒加载 | 折叠时不请求；展开后才加载；11 张图不拖慢弹窗首开 |
| 引导列表固定高度 + 内部滚动 | `<summary>` 常驻可见，用户随时能折叠；`<ol>` 独立滚动 |
| 外部工具引导 11 步内嵌弹窗 | 用户不需要来回切换文档；流程闭合（下载 → 设置 → 扫描 → 导入） |
| 外部导入不新增存储键 | 复用数据集体系；减少维护面 |

---

## 质量基线

| 项 | 值 |
|----|-----|
| ESLint | **0 error / 0 warning** |
| 单元测试 | **164 pass / 0 fail** |
| 覆盖率 | line 57% / branch 83% / funcs 49% |
| CI | GitHub Actions：语法 + lint + test + coverage + audit |
| Node 版本 | CI 矩阵：22、24 |
| 依赖漏洞 | `npm audit --audit-level=high` 0 high |

**测试分布**：

| 测试文件 | 用例数 |
|---------|-------|
| `test/constants.test.js` | 7 |
| `test/utils.test.js` | 50 |
| `test/dataset-merge.test.js` | 22 |
| `test/dataset-manager.test.js` | 11 |
| `test/dom.test.js`（jsdom） | 13 |
| `test/keyboard.test.js`（jsdom） | 21 |
| `test/modal.test.js`（jsdom） | 20 |
| `test/note.test.js`（jsdom） | 8 |
| `test/unacquired.test.js`（jsdom） | 12 |
| **合计（本轮实测）** | **164** |

---

## 版本演进

| 版本 | 主题 | 核心交付 |
|------|------|---------|
| v0.9.1 | 功能扩展 | 未获取统计 + 地区管理 + 可获取提示 |
| v0.9.2 | 技术债清理 | 消除重复代码 + 统一高亮 + 版本号正则修正 |
| v0.9.3 | 质量基建 | ESLint 9 + Prettier + jsconfig |
| v0.9.4 | 测试基建 | 90 单元测试 |
| v0.9.5 | 架构收敛 | 命名空间分层 + 状态拆分 + 内联事件清理 |
| v0.9.6 | 性能与交互 | 索引缓存 + 计算缓存 + 键盘快捷键 |
| v0.9.7 | 健壮性与 A11y | 错误边界 + CSP + 弹窗 A11y + 迁移 + 模板外置 |
| v0.9.8 | 工程化收尾 | LICENSE + GitHub Actions |
| v0.9.9 | 维护与工程化 | CI 升级 v5/Node 24 + Lint 清零 + DOM 测试 + 覆盖率 |
| v0.9.10 | 首屏优化 | 加载遮罩 + 脚本 defer |
| v0.9.11 | 术语校准 | 能力值 / 属性 / 系列技能 + `bump-version.js` 覆盖 6 文件 |
| v0.9.12 | 地区进度条 | 地区卡片收集进度条 X/320 + 分档着色 |
| v0.9.13 | 未获取统计增强 | 刷取组合检索系统 + 三模式切换 + 双击锁定高亮 |
| v0.9.14 | 悬浮窗布局修复 | 主从定位 + 从窗依附主窗外侧 + 权威位置读取 |
| v0.9.15 | 单元格键盘导航 | 方向键移动 + 跨表连续 + 自定义按键 + 焦点释放 |
| v0.9.16 | 工程化收尾 | CI 完整化（双 Node + audit） + 测试补全（+41 用例） + 索引缓存复用 + 命名空间冻结 + husky/lint-staged + lock 同步 |
| v0.9.17 | 统计面板重写 | 左侧独立页 + 数据集切换 + 三维度 + 三交叉表缺口分析（连续色阶 + 底部标尺） + 详情悬浮窗 + 右列可拖动 + jszip SRI 去除 |
| v0.9.18 | 统计维度明细增强 | 三维度排序切换（未获取降序 / 升序 / 默认顺序） + 基质口径（已获取绿 / 未获取红，与总览一致） + 固定 5 行视窗 + 滚轮 + 展开/收起按钮 + 排序与展开状态持久化 |
| v0.9.19 | CSS 模块化拆分 | features.css 拆为 note / loading / unacquired / region / acquire-tooltip / stats 六文件；清理死代码（三表缺口分析样式） |
| v0.9.20 | 统计面板增强 | 拥有状态筛选（已拥有 / 未拥有） + 结果列表列顺序（能力值 → 属性 → 系列技能） + 列自适应宽度 + 刷新按钮反馈（文案 + 淡入 + Toast） + 恒定速度进度动画（颜色随宽度实时变档） + 缺口分析颜色与数字同步滚动 + 双击单元格应用筛选 |
| v0.9.21 | 外部数据导入 | 「导入/转换外部数据」按钮 + 终末地基质妙妙小工具日志解析（实装 `a+1` / 非实装写 `v` / `t` 从 `data.json` 读） + `normalizeCell` 归一化 + 11 步图文引导 + `stats.js` 列表显示「共 N 基质」 + 引导区样式外置为 `external-import.css`（第 7 个 features 文件） + 引导图 `assets/guide/` |
| **v0.9.22** | **重复基质提示** | 数据管理面板新增「⚠️ 重复基质提示」按钮 + 固定高度悬浮窗（520×420，居中） + 条目复选框（整行可点） + 底部「清除勾选」 + `smarttable_dataset_import_meta` 独立存储（不改数据表） + 切换数据集自动切换 + 刷新后保留 + 删除数据集时清理 meta |

**版本约定**：
- `index.html`（4 处：title / 底部按钮 title 属性 / 底部按钮文本 / 关于弹窗）
- `package.json` / `js/core/migration.js` / `version.json` / `README.md` / `ARCHITECTURE.md` / `package-lock.json`
- `bump-version.js` 覆盖全部 7 文件（第 7 个通过 npm 命令同步）