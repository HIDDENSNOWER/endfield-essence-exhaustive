# ARCHITECTURE · 开发者文档

> EEE 项目内部结构、模块依赖与扩展指南。
> 适用版本：**v0.9.16**

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
| 默认数据集加载 | `features/data/default-loader.js` | `data/data.json` |
| 地区增删改 / 悬停高亮 | `features/data/region-manager.js` | `dom.js` / `features.css` |
| 未获取统计 / 筛选 / 进度条 / 检索 / 模式 / 双击锁定 | `features/table/unacquired.js` | `features.css` / `dom.js` |
| 可获取地点悬浮窗（主窗） | `features/table/cell-acquire-tooltip.js` | `features.css` |
| 单元格备注悬浮窗（从窗） | `features/note/note.js` | `features.css` |
| **悬浮窗定位工具** | **`core/utils.js`（`buildAroundCursor` / `rectsOverlap`）** | **`note.js` / `cell-acquire-tooltip.js`** |
| 高亮控制 / 索引缓存 | `features/table/cell-highlighter.js` | `features/table/table-renderer.js` / `features/keyboard.js` |
| 键盘快捷键 | `features/keyboard.js` | `services/modal.js` |
| 单元格备注数据 + 图片 | `features/note/note.js` | `services/image-store.js` |
| 数值录入 / 对比 / 撤回重做 | `features/cell/cell-value.js` / `cell-record.js` / `history.js` | — |
| 行筛选 / 统计面板 | `features/table/row-filter.js` / `stats.js` | — |
| 存储管理 / 清除缓存 | `features/preferences/storage-manager.js` / `features/data/cache-clear.js` | — |
| 错误边界 / 数据迁移 / 分层视图 | `core/error-handler.js` / `migration.js` / `namespace.js` | `main.js` |
| 新常量 / 新 DOM / 新事件 | `core/constants.js` / `core/dom.js` / `js/events.js` | — |
| **CI / 提交前 hook** | **`.github/workflows/ci.yml` / `.husky/pre-commit` / `package.json`（`lint-staged`）** | — |
| **版本号一键更新** | **`bump-version.js`** | **7 文件（含 `package-lock.json`）** |

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
- **规模**：52 个自写源文件 / 约 16,000 行
- **形态**：纯前端 SPA，无框架 / 无构建 / 无后端
- **持久化**：localStorage（数据 / 设置 / 地区 / 导航按键）+ IndexedDB（图片）
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
| `App.utils` | 单元格标准化、颜色转换、列索引、HTML 转义、**悬浮窗候选位** |
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
| data | `datasetManager` / `datasetRemark` / `importExport` / `datasetMerge` / `defaultLoader` / `cacheClear` / `regionManager` |
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
17.   events.bindAllEvents()
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

---

## 关键机制

### 数据保护

默认数据集受"只增不减"保护——`isCellOperationAllowed()` 检查新单元格是否低于基准：

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
- **`openModal` 重复打开同一弹窗时不重复计数**（v0.9.16 修复）：
  - 先设置 `display:flex` / A11y 属性（幂等刷新）
  - 若已在 `modalStack` 中 → **直接返回**，不 `modalOpenCount++`
  - 修复前的 bug：先移除再压入 → 计数累加 → `body.overflow` 永久锁定
- 确认弹窗回调存 `window.__dialogConfirmCallback`，**关闭时立即清理**
- `modalStack` + `closeTopModal()` 支持 `Esc` 逐层关闭
- A11y：`role="dialog"` / `aria-modal` / Tab 焦点陷阱 / 关闭后焦点恢复
- 测试钩子：`_resetState()`（`@internal`）供测试重置闭包状态

### 事件绑定

| 模式 | 位置 |
|------|------|
| 集中绑定 | `events.js` `bindAllEvents()`（主流，18+ 模块） |
| 模块自绑 | `note.js` `initNoteFeature()` / `cell-acquire-tooltip.js` `init()` / `keyboard.js` `init()` |

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
- 两部分横向不相邻，但**上下视为连续**

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

- 到第一部分 `colIdx = 0` 或 `colIdx = 34` 时**不跨表**，直接 return true
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

**行筛选交互**：`_getVisibleRowIndices()` 从 `App.state.selectedRows` 推导可见行索引数组；上下键在**可见行**之间移动，跨表时用可见行列表的**首尾**。

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
| **主窗** | 可获取地点（acquire） | 300ms | 鼠标 8 候选位 |
| **从窗** | 单元格备注（note） | 350ms | 主窗实际矩形外侧 8 候选位；主窗未显示时回退鼠标候选位 |

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

1. 主窗**永不理会**从窗
2. 从窗候选位**全部紧贴主窗边缘**，几何上不可能重叠
3. 50ms 延迟差保证主窗先完成定位
4. 位置读取用 **`style.left/top` + `offsetWidth/Height`**，不用 `getBoundingClientRect()`

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

- 冻结是**浅冻结**——只锁定顶层属性引用，不锁内部字段
- `App.core.constants = {}` 会失败（防止误替换模块）
- `App.core.constants.ROW_NAMES = []` 仍可（正常数据操作不受影响）
- `App.features` / `App.entry` **不冻结**（模块可能动态挂载）

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
- `_lockItem(li)`：解除旧锁定 → 记录新锁定 → 高亮 → 插入"取消高亮"按钮
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

### 版本号管理（v0.9.16）

`bump-version.js` 一次命令更新 **7 个文件**：

1. `version.json`（含 `buildTime` 刷新）
2. `package.json`（顶层 `version` 字段）
3. `js/core/migration.js`（`CURRENT_VERSION` 常量）
4. `index.html`（所有 `ver.X.Y.Z`）
5. `README.md`（`**当前版本**：vX.Y.Z`）
6. `ARCHITECTURE.md`（`适用版本：**vX.Y.Z**`）
7. **`package-lock.json`**（通过 `npm install --package-lock-only` 自动同步）

**设计要点**：

- `package-lock.json` 是 npm 生成物，**不手动编辑**
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
| `<数据集名>` | 该数据集的行数据 |

### sessionStorage / IndexedDB

- sessionStorage：`smarttable_about_shown`（首访标记）
- IndexedDB：`eee_image_db` → `images` → `{ id, blob }`

### 命名约束

- 数据集名不可 `smarttable_` 开头
- 受保护名（`默认数据集` / `数据示例-表格样式参考`）不可被占用

---

## 测试体系（v0.9.16）

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

> 注：早前 v0.9.15 的 103 + v0.9.16 新增 41 = 144（本轮对话实测），加上后续文件统计口径可能略有差异。

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

## 工程化与 CI（v0.9.16）

### GitHub Actions（`.github/workflows/ci.yml`）

- **触发**：push / PR 到 `main` / `master`
- **矩阵**：Node 22、Node 24（**不含 18/20**，因 jsdom 30 引擎要求）
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
  "*.{json,md}": ["prettier --write"]
}
```

**应急跳过**：`git commit --no-verify`

### 版本号一键同步（`bump-version.js`）

见"版本号管理"章节。

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

### 新增测试

1. 创建 `test/xxx.test.js`
2. **必须** `new JSDOM(html, { url: 'http://localhost/' })`
3. 遵循"模块级单例 bootstrap + beforeEach 仅重置状态"模式
4. 加载依赖顺序：`constants` → `utils` → 被测模块
5. 若模块有闭包状态，为其提供 `_resetState()` 钩子（`@internal`）

### 发布新版本

```bash
# 1. 本地验证
npm ci && npm run lint && npm test

# 2. 更新版本号（7 文件）
node bump-version.js 0.9.17

# 3. 更新 README / ARCHITECTURE 版本演进表（手动）

# 4. 提交
git add -A
git commit -m "v0.9.17 <主题>"
git push

# 5. 打 tag
git tag -a v0.9.17 -m "v0.9.17 <主题>"
git push origin v0.9.17
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
| **控制台非严格模式无法验证 freeze** | 控制台赋值冻结属性**不抛错**（静默失败）；用 `Object.isFrozen()` 或"值是否改变"判断 |
| **`App.features` / `App.entry` 不冻结** | 模块可能动态挂载 |
| **`modal.js:openModal` 引用计数** | 重复打开必须 `if (already) return;`，不得先移除再压入（会漏减） |
| **`modal.js` 测试需调 `_resetState()`** | 闭包变量跨测试不重置 |
| **jsdom 测试必须传 `url`** | `about:blank` 是 opaque origin，`localStorage` 抛 `SecurityError` |
| **`package.json` 版本号须为具体数字** | `^9.x.x` 是非法 semver；用 `^9.1.7` |
| **`package-lock.json` 由 npm 维护** | 不手动编辑；用 `npm install --package-lock-only` 同步 |
| **husky `prepare` 脚本** | 在 CI 中可能触发；必要时加 `env: HUSKY: 0` |
| **`bump-version.js` 覆盖 7 文件** | 含 `package-lock.json`（通过 npm 命令自动同步） |

---

## 安全与可靠性

| 机制 | 实现 |
|------|------|
| XSS 防护 | `innerHTML` 前统一 `escapeHtml` |
| CSP | `script-src 'self'` |
| 存储键隔离 | `isReservedKey` 拒绝 `smarttable_*` |
| 数据防覆盖 | 默认数据集"只增不减" |
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
| **命名空间冻结** | `App.core` / `App.services` 运行时只读 |
| **CI 依赖扫描** | `npm audit --audit-level=high` 为硬门禁 |
| **提交前 lint** | husky + lint-staged 自动 `eslint --fix` |

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
| 未获取统计按地区独立 | 直观；与"前 36 名"语义一致 |
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
| 跨表保持相对列位（±35） | 玩家在"残暴×主能力"处按 ↓ 期望落在"效益×主能力" |
| 点击表格释放输入框焦点 | 避免方向键被"列宽"等输入框捕获 |
| 自定义按键存 localStorage | 与项目其他设置保持一致，无需额外机制 |
| 导航键捕获输入框 readonly | 防止移动端软键盘弹出干扰 |
| **`Object.freeze` 冻结 core / services** | 防止运行时误替换模块引用；浅冻结不阻数据操作 |
| **`namespace.init` 幂等** | 避免重复 `Object.assign` 向冻结对象写入 |
| **提取悬浮窗定位工具到 utils** | 消除 note / acquire 双份维护；未来候选位策略仅改一处 |
| **索引缓存复用** | `updateHighlightedCell` / `_scrollCellIntoView` 均优先 `_getCell` |
| **husky + lint-staged** | 提交前自动 lint，只处理暂存文件（< 1 秒） |
| **CI 双 Node 矩阵** | 覆盖 22 LTS 与 24 最新；jsdom 30 引擎要求不含 18/20 |
| **Actions v5** | 消除 Node 20 弃用警告；与 GitHub runner Node 24 匹配 |
| **`bump-version.js` 调 npm 命令同步 lock** | 遵循"lock 由 npm 维护"原则；避免手动改被覆盖 |

---

## 质量基线

| 项 | 值 |
|----|-----|
| ESLint | **0 error / 0 warning** |
| 单元测试 | **144 pass / 0 fail** |
| 覆盖率 | line 68% / branch 82% / funcs 61% |
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
| **合计（本轮实测）** | **144** |

> 后续新增 `note.test.js` / `unacquired.test.js`（T-09）若已落盘，用例数将达 160+。

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
| **v0.9.16** | **工程化收尾** | **CI 完整化（双 Node + audit） + 测试补全（+41 用例） + 索引缓存复用 + 命名空间冻结 + husky/lint-staged + lock 同步** |

**版本约定**：
- `index.html`（4 处：title / 底部按钮 title 属性 / 底部按钮文本 / 关于弹窗）
- `package.json` / `js/core/migration.js` / `version.json` / `README.md` / `ARCHITECTURE.md` / `package-lock.json`
- **`bump-version.js` 覆盖全部 7 文件**（第 7 个通过 npm 命令同步）