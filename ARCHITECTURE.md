# Endfield-Essence-Exhaustive (EEE) — 开发关系与程序运行结构文档

> 本文档面向开发者，完整记录项目的**分层架构、模块依赖关系、程序运行结构、数据模型、存储结构、核心功能流程与扩展指南**。
> 适用版本：ver.0.8.4 ("再访基地"更新) ｜ 最后更新：与 v0.8.4 代码同步

---

## 1. 项目概述

- **定位**：《明日方舟：终末地》"基质"数据的记录、管理与统计工具
- **形态**：纯前端单页应用，**零构建、零运行依赖**（唯一外部库为 JSZip）
- **模块化方案**：每个 JS 文件为 IIFE，挂载到全局命名空间 `window.App`，通过 `App.xxx` 互调
- **数据持久化**：数据集与设置为 `localStorage`，备注图片为 IndexedDB；默认数据集从 `data/data.json` 异步加载
- **运行要求**：需 HTTP 服务器承载（`file://` 下 fetch 被 CORS 拦截），推荐 `一键本地运行.bat`

---

## 2. 目录结构与模块清单

### 2.1 目录树

    index.html                应用主页面（UI 结构 + 样式/脚本引入 + 防 FOUC 内联脚本）
    一键本地运行.bat           本地 HTTP 服务器启动脚本
    css/                      样式表（按层叠顺序：base → layout → components → features → settings/）
    js/
    ├── lib/jszip.min.js      ZIP 导入导出库
    ├── core/                 核心层（无业务，被所有模块依赖）
    ├── services/             服务层（通用能力）
    │   ├── storage.js        localStorage 封装
    │   ├── modal.js          弹窗与 Toast
    │   └── image-store.js    IndexedDB 图片存储
    ├── features/             功能层（业务模块，按领域分 5 个子目录）
    │   ├── data/             数据管理
    │   ├── table/            表格
    │   ├── cell/             单元格操作
    │   ├── preferences/      设置与个性化
    │   └── note/             备注
    ├── events.js             统一事件绑定入口
    └── main.js               应用初始化与布局管理
    data/
    ├── data.json             默认数据集（12 行 × 70 列完整数据 + 图片引用）
    ├── default.js            占位脚本（当前为空数组，未使用）
    └── images/               默认数据集备注图片

### 2.2 App 命名空间模块映射（33 个）

| 挂载名 | 文件 | 层级 |
|--------|------|------|
| `App.constants` | `js/core/constants.js` | 核心 |
| `App.state` | `js/core/state.js` | 核心 |
| `App.dom` | `js/core/dom.js` | 核心 |
| `App.utils` | `js/core/utils.js` | 核心 |
| `App.dataModel` | `js/core/data-model.js` | 核心 |
| `App.storage` | `js/services/storage.js` | 服务 |
| `App.modal` | `js/services/modal.js` | 服务 |
| `App.imageStore` | `js/services/image-store.js` | 服务 |
| `App.datasetManager` | `js/features/data/dataset-manager.js` | 功能-数据 |
| `App.datasetRemark` | `js/features/data/dataset-remark.js` | 功能-数据 |
| `App.importExport` | `js/features/data/import-export.js` | 功能-数据 |
| `App.datasetMerge` | `js/features/data/dataset-merge.js` | 功能-数据 |
| `App.defaultLoader` | `js/features/data/default-loader.js` | 功能-数据 |
| `App.cacheClear` | `js/features/data/cache-clear.js` | 功能-数据 |
| `App.tableRenderer` | `js/features/table/table-renderer.js` | 功能-表格 |
| `App.rowFilter` | `js/features/table/row-filter.js` | 功能-表格 |
| `App.stats` | `js/features/table/stats.js` | 功能-表格 |
| `App.cellTooltip` | `js/features/table/cell-tooltip.js` | 功能-表格 |
| `App.cellValue` | `js/features/cell/cell-value.js` | 功能-单元格 |
| `App.cellRecord` | `js/features/cell/cell-record.js` | 功能-单元格 |
| `App.history` | `js/features/cell/history.js` | 功能-单元格 |
| `App.theme` | `js/features/preferences/theme.js` | 功能-偏好 |
| `App.tableStyle` | `js/features/preferences/table-style.js` | 功能-偏好 |
| `App.colorPreview` | `js/features/preferences/color-preview.js` | 功能-偏好 |
| `App.interfaceColors` | `js/features/preferences/interface-colors.js` | 功能-偏好 |
| `App.schemeManager` | `js/features/preferences/scheme-manager.js` | 功能-偏好 |
| `App.stateColorSchemeManager` | `js/features/preferences/state-color-scheme-manager.js` | 功能-偏好 |
| `App.storageManager` | `js/features/preferences/storage-manager.js` | 功能-偏好 |
| `App.note` | `js/features/note/note.js` | 功能-备注 |
| `App.events` | `js/events.js` | 入口 |
| `App.layout`（+`App.main`） | `js/main.js` | 入口 |

---

## 3. 分层架构与依赖关系

### 3.1 分层规则

    ┌─────────────────────────────────────────────────────┐
    │ 入口层   events.js / main.js                        │
    │   └ 初始化编排 + 统一事件绑定（只做组装，不含业务）   │
    ├─────────────────────────────────────────────────────┤
    │ 功能层   features/data · table · cell ·             │
    │         preferences · note                          │
    │   └ 业务逻辑；依赖核心层与服务层；模块间可互调       │
    ├─────────────────────────────────────────────────────┤
    │ 服务层   services/storage.js · modal.js ·           │
    │         image-store.js                              │
    │   └ 通用能力；只依赖核心层                          │
    ├─────────────────────────────────────────────────────┤
    │ 核心层   core/constants · state · dom · utils ·     │
    │         data-model                                  │
    │   └ 无业务、无相互依赖（constants 最底层）           │
    └─────────────────────────────────────────────────────┘

### 3.2 核心依赖关系（谁依赖谁）

    constants.js   ← 被所有模块读取（存储键、词条组、颜色、尺寸常量）
    state.js       ← datasetManager / history / cellRecord / rowFilter / cellValue / note / stats / theme …
    dom.js         ← 几乎所有模块（App.dom.xxx 元素缓存）
    utils.js       ← 几乎所有模块（normalizeCell / escapeHtml / 颜色 / 列索引 / 图片转换）
    data-model.js  ← datasetManager / cellRecord / defaultLoader / cellValue（建空行、示例数据）

    storage.js     ← datasetManager / datasetRemark / importExport / datasetMerge / defaultLoader /
                      cacheClear / note / theme / tableStyle / colorPreview / interfaceColors /
                      schemeManager / stateColorSchemeManager / history / storageManager
    modal.js       ← 几乎所有功能模块（showAlert / showConfirmDialog / showTemporaryHint / openModal）
    image-store.js ← note / importExport / defaultLoader（图片存取）

    功能模块之间的主要调用：
      datasetManager  ← importExport / datasetMerge / history / cellRecord / cellValue / defaultLoader
      importExport    → datasetMerge（同名导入选"合并"时）/ image-store（导入导出图片）
      datasetMerge    → datasetManager（结果提交）/ importExport（退化路径）
      cellRecord      → history / datasetManager
      cellValue       → history / datasetManager / tableRenderer
      history         → datasetManager / tableRenderer / utils
      tableRenderer   ← 几乎所有修改数据的模块（数据变更后重渲染）
      defaultLoader   → datasetManager / tableRenderer / modal / image-store
      note            → image-store（图片上传/显示/删除）
      interfaceColors ↔ schemeManager（应用、自动保存）
      colorPreview    ↔ stateColorSchemeManager（应用、自动保存）
      storageManager  → storage / modal（计算存储占用）

---

## 4. 程序运行结构

### 4.1 启动初始化流程（main.js，约 22 个 safeCall 步骤）

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | `App.initDomCache()` | 按 id 一次性缓存全部 DOM 元素 |
| 2 | `state.rows = createInitialRows()` | 初始化 12×70 空数据 |
| 3 | `App.theme.loadTheme()` | 读保存偏好/跟随系统 |
| 3.5 | `App.interfaceColors.applyCurrentTheme()` | 应用当前主题的界面颜色自定义 |
| 4 | 确保示例数据集存在 | 不存在则创建随机示例数据 |
| 5 | `loadData()` | 加载当前数据集 |
| 5.5 | `updateDatasetSelect()` | 显式渲染数据集下拉框 |
| 6 | `populateDropdowns()` | 填充行/词条/副属性下拉框 |
| 7 | `resetTripleInputs()` | 三联输入框重置为 '1' |
| 8 | `initTableStyle()` | 应用表格尺寸与底色 |
| 9 | `initNoteFeature()` | 初始化备注模块（含事件自绑） |
| 10 | `renderAllTables()` | 渲染主表格两段 |
| 11 | `initCellTooltip()` | 初始化悬停提示栏 |
| 12 | `updateDatasetRemark()` | 刷新数据集备注区 |
| 13 | `updateLockedUI()` | 更新受保护状态与按钮禁用 |
| 14 | `restoreRightPanelState()` | 恢复右侧面板折叠状态 |
| 15 | `bindAllEvents()` | 统一绑定全部事件 |
| 16 | `switchPanel('input')` | 默认激活数据管理面板 |
| 17 | 更新 inputHint | 提示"准备就绪" |
| 18 | 首访显示关于弹窗 | 之后异步加载默认数据 |

> 所有步骤由 `safeCall` 包裹：单步失败仅 console.error，不阻断应用启动。
> 异步默认数据加载完成后：仅当"发起时的数据集键 == 当前键"才更新界面（竞态防护）。

### 4.2 统一事件绑定（events.js `bindAllEvents()` 调用 15+ 个模块）

    App.theme.bindThemeEvents              主题切换 + 系统主题监听
    App.cacheClear.bindCacheClearEvents    清除缓存按钮
    App.tableStyle.bindTableStyleEvents    表格尺寸/底色
    App.colorPreview.bindColorPreviewEvents 单元格状态颜色编辑器
    App.schemeManager.bindSchemeEvents     界面颜色方案管理
    App.stateColorSchemeManager.initPanel  单元格颜色方案管理
    App.storageManager.bindStorageEvents   存储管理（刷新/保存配额）
    App.rowFilter.bindRowFilterEvents      行筛选弹窗
    App.datasetManager.bindDatasetManagerEvents  数据集 CRUD 按钮
    App.importExport.bindImportExportEvents 导入导出
    App.datasetMerge.bindDatasetMergeEvents 合并按钮 + 预览弹窗
    App.datasetRemark.bindDatasetRemarkEvents      备注编辑
    App.cellValue.bindCellValueEvents      数值应用
    App.cellRecord.bindCellRecordEvents    录入/撤减/清除/清空
    App.history.bindHistoryEvents          撤回/重做
    App.modal.bindModalEvents              通用弹窗（幂等，仅绑定一次）

> 例外：`note.js` 在 `initNoteFeature()` 内自绑事件；`interfaceColors.js` 在 `renderPanel()` 时动态绑定控件事件。

### 4.3 全局变量与状态

- `window.DEFAULT_ROWS`：外部加载的默认数据集基准（default-loader 写入）
- `window.__dialogConfirmCallback / __dialogCancelCallback`：通用确认弹窗回调（**关闭即清理**，防残留误触发）
- `App.state`（含 rows / history / historyIndex / selectedRows / theme / baselineRows 等 getter/setter）

---

## 5. 数据模型与存储结构

### 5.1 单元格模型

| 字段 | 类型 | 含义 | 约束 |
|------|------|------|------|
| `v` | string | 数值（普通数值或实装属性值） | 空串表示无数值 |
| `t` | number | 重复数（实装基质重复次数） | ≥ 0 |
| `a` | number | 已获取数 | `0 ≤ a ≤ t`（normalizeCell 自动夹紧） |
| `note` | object | `{ text: string, images: string[] }` | images 为图片 ID 数组 |

**单元格状态判定**（`t`/`a` 组合）：
- `t = 0` 且 `v ≠ ''` → has-value（仅数值）
- `t > 0, a = 0` → status-none（未获取）
- `0 < a < t` → status-partial（部分获取）
- `a = t` → status-full（全部获取）

### 5.2 表格结构

- **14 个词条组**（强攻/压制/追袭/粉碎/昂扬/巧技/残暴/附术/医疗/切骨/迸发/夜幕/流转/效益）× **5 副属性**（敏捷/力量/意志/智识/主能力）= **70 列**
- **12 个提升项（行）**：攻击提升 … 终结技效率提升
- 渲染拆两段：`GROUP1`（强攻~残暴，35 列）+ `GROUP2`（附术~效益，35 列）

### 5.3 localStorage 键清单

| 键 | 内容 |
|----|------|
| `smarttable_dataset_list` | 全部数据集名称数组 |
| `smarttable_current_dataset` | 当前选中数据集名 |
| `smarttable_theme` | 主题偏好（light/dark） |
| `smarttable_dataset_remarks` | 数据集备注对象（键=数据集名） |
| `smarttable_user_colors` | 用户自定义单元格状态颜色（按 light/dark 主题） |
| `smarttable_interface_colors` | 用户自定义界面颜色（按 light/dark 主题） |
| `smarttable_style` | 表格列宽/行高 |
| `smarttable_table_bg` | 表格奇偶行底色（按主题） |
| `smarttable_note_layout` | 备注悬浮框布局偏好 |
| `smarttable_note_tooltip_pos` | 悬浮框位置与尺寸 |
| `smarttable_right_collapsed` | 右侧面板折叠状态 |
| `smarttable_schemes` | 用户自定义界面颜色方案（不含内置方案） |
| `smarttable_active_scheme` | 当前激活的界面颜色方案 ID |
| `smarttable_state_color_schemes` | 用户自定义单元格颜色方案 |
| `smarttable_active_state_color_scheme` | 当前激活的单元格颜色方案 ID |
| `smarttable_custom_quota` | 自定义配额（字节） |
| `smarttable_quota_warn_percent` | 配额警示百分比 |
| `<数据集名>` | 每个数据集一份行数据（键=名称） |
| *sessionStorage* `smarttable_about_shown` | 关于弹窗已显示标记 |

### 5.4 IndexedDB 结构

- 数据库名：`eee_image_db`
- 对象仓库：`images`，键路径 `id`
- 记录结构：`{ id: string, blob: Blob }`

---

## 6. 核心功能流程

### 6.1 数据录入 / 撤减 / 清除（cell-record.js）

    录入面板选中 行/词条/副属性 → 计算全局 colIndex
      ├─ t=0 → 新建实装：t=1, a=0
      ├─ t>0 → t+1
      └─ 每次操作 → isCellOperationAllowed 检查 → pushHistory → renderAllTables → saveData
    撤减：t-1（a 收敛、t=0 时 v 清空）
    清除：v/t/a 归零（含保护检查）

### 6.2 数值应用与对比（cell-value.js）

    输入三位数 → 校验 /^\d{3}$/
      ├─ t>0（实装）：a+1（已满则提示）
      ├─ 旧值有效且不同 → getSuggestion 对比 → 弹窗保留/替换
      └─ 否则直接覆盖
    所有写路径均 pushHistory（可撤回）

### 6.3 撤回 / 重做（history.js）

- 历史栈上限 20；每次写入记录 `{rowIdx, colIndex, oldCell, newCell}`（深拷贝）
- 数据集切换/新建/删除/清空/导入/合并成功后调用 `resetHistorySafe()` 清空历史

### 6.4 数据集 CRUD（dataset-manager.js）

    新建/重命名：名称校验 → 写存储 → 更新 UI → 重置历史
    删除：受保护拦截 → 倒计时+文字确认 → 删数据 + 删备注
    切换：saveCurrentDatasetKey → loadData → 重置历史 → 刷新全部 UI
    保护：默认数据集"只增不减"；默认+示例不可删除/清空/重命名

### 6.5 导入 / 导出（import-export.js）

    导出 ZIP：data.json + images/（图片从 IndexedDB 获取，统一转 PNG）
    导出 JSON：仅数据，不含图片二进制
    导入 ZIP：≤50MB，图片存入 IndexedDB，缺失图片计数提示
    导入 JSON：兼容旧 base64 图片，转为 IndexedDB ID
    重名冲突：覆盖 / 合并 / 另存为 / 取消

### 6.6 数据集覆盖 / 合并（dataset-merge.js）

    入口A：导入同名选「合并」 ｜ 入口B：工具栏「合并」勾选多数据集
    流程：buildMultiDiff（纯函数）→ 冲突暂存 → applyMultiStrategy（纯函数）→ 预览 → commit（唯一写入口）
    三种全局策略：覆盖 / 智能合并 / 保留现有；逐格可覆盖

### 6.7 存储管理（storage-manager.js）

    刷新：navigator.storage.estimate() + localStorage 扫描 + IndexedDB 估算
    展示：总配额/已用/剩余/百分比；分类明细；数据集详细统计
    自定义配额：保存 localStorage，用于百分比计算
    警示：达到警示百分比黄色，超过配额红色
    日志：展示完整计算过程

### 6.8 图片存储（image-store.js）

    保存：Blob → IndexedDB → 图片 ID
    读取：ID → Blob → Blob URL
    删除：ID → 从 IndexedDB 删除
    迁移：旧 base64 图片启动时转为 IndexedDB 存储

### 6.9 备注与悬浮框（note.js）

    单元格备注：文本（≤550 字）+ 图片（单张 ≤1MB、单格 ≤10 张）
    图片通过 image-store.js 存取
    悬浮框：拖拽/缩放/布局切换/应用内大图查看器

### 6.10 主题与个性化

    主题：保存偏好优先，否则跟随系统
    单元格状态颜色：HEX/RGB/RGBA/CMYK/HSLA 编辑
    界面颜色：所有颜色变量分组管理；CSS 变量驱动预览
    方案管理：界面方案与单元格方案独立；自动保存"用户自定义方案"

---

## 7. 安全与可靠性设计要点

| 机制 | 实现 |
|------|------|
| XSS 防护 | 数据集名/行名/导入值/图片引用在拼 innerHTML 前统一 `escapeHtml` |
| 存储键隔离 | `isReservedKey` 拒绝 `smarttable_*` 前缀与受保护名 |
| 数据防覆盖 | 默认数据集刷新不覆盖用户增量；加载失败不覆盖已有数据 |
| 回调防残留 | `closeConfirmDialog` 清空回调；冲突框隐藏底部按钮 |
| 存储失败提示 | `storage.set/setJSON` 返回布尔；`saveData` 失败弹提示 |
| 历史隔离 | 数据集切换/清空/导入/合并后 `resetHistorySafe()` |
| 弹窗管理 | `bindModalEvents` 幂等；滚动锁引用计数 |
| 输入容错 | normalizeCell 夹紧 a≤t；颜色钳制；base64ToBlob 容错 |
| 导入安全 | ZIP ≤50MB、图片路径穿越校验、缺失图片计数提示 |
| 格式检测 | 导入文件通过 `type` 字段识别，支持重定向导入并展示对比 |
| 图片隔离 | 图片存 IndexedDB，与 localStorage 数据集分离 |

---

## 8. 开发扩展指南

### 8.1 新增一个功能模块的步骤

1. 在 `js/features/<领域>/` 新建 `xxx.js`，IIFE 挂载 `App.xxx`
2. 在 `index.html` 的 script 区按依赖顺序引入
3. 若需 DOM 元素：在 `index.html` 加带唯一 id 的元素，并在 `dom.js` 的 ids 数组登记
4. 若需事件：实现 `bindXXXEvents()` 并在 `events.js` `bindAllEvents()` 中注册
5. 若需弹窗：复用 `App.modal` 的 openModal/closeModal/showConfirmDialog
6. 若需持久化：通过 `App.storage` 读写；图片通过 `App.imageStore`
7. 若修改数据：写前调用 `App.history.pushHistory`，写后 `renderAllTables + saveData`

### 8.2 本地验证命令

    # 语法检查全部 JS（推送前必做）
    Get-ChildItem js -Recurse -Filter *.js | Where-Object { $_.Name -ne 'jszip.min.js' } | ForEach-Object { node --check $_.FullName }

    # 启动本地服务
    一键本地运行.bat   # 或 python -m http.server 8000

### 8.3 已知注意事项

- **必须 HTTP 运行**：`file://` 下 fetch(data.json) 被拦截
- **图片存 IndexedDB**：localStorage 仅存图片 ID，迁移旧数据需在初始化时执行转换
- **数据按 origin 隔离**：本地与 GitHub Pages 数据不互通，迁移需"导出→导入"
- **`note.js` 事件自绑**（`initNoteFeature`）
- **`interfaceColors.js` 颜色输入框使用内联事件**（`oninput`/`onchange`）
- **导出 ZIP 图片统一 PNG**：动画图片会失去动画效果
- **版本号位置**：`index.html`（title / 关于弹窗 / 底部）×3、`README.md` ×2；`import-export.js` 中 `version:'2.0'` 是导出数据格式版本，**勿改**
