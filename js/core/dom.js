/**
 * dom.js - DOM 元素缓存与初始化
 * 挂载到 App.dom，提供 initDomCache
 *
 * 本模块负责：
 * - 在页面加载完成后，一次性获取所有需要频繁操作的 DOM 元素
 * - 将它们缓存到 App.dom 对象中，避免每次操作时重复查询 DOM，提升性能
 * - 为部分带连字符的 id 提供驼峰别名，方便模块中通过点号访问
 *
 * 使用前提：
 * - 必须在 DOM 加载完成后调用 initDomCache()
 * - 通常由 main.js 在初始化流程的第一步调用
 *
 * 设计约定：
 * - 所有需要动态操作的 HTML 元素必须具有唯一 id
 * - 新增元素时需在 ids 数组中登记，否则无法通过 App.dom 访问
 * - NodeList 类型元素（如多个按钮）使用 querySelectorAll 单独缓存
 */
(function (App) {
    'use strict';

    // 初始化空对象，后续填充所有缓存的 DOM 元素
    App.dom = {};

    /**
     * 初始化 DOM 缓存
     * 必须在 DOM 加载完成后调用
     */
    App.initDomCache = function () {
        const dom = App.dom;

        // =========================================================================
        // 需要缓存的所有元素 ID 列表
        // 数组中的每个字符串对应 index.html 中的一个元素 id
        // 按功能模块分组排列，便于查找和维护
        // =========================================================================
        const ids = [

            // ---------- 表格区域 ----------
            'tableHead1',                       // 第一部分表格的表头（强攻~残暴）
            'tableBody1',                       // 第一部分表格的表体
            'tableHead2',                       // 第二部分表格的表头（附术~效益）
            'tableBody2',                       // 第二部分表格的表体

            // ---------- 行筛选相关 ----------
            'btnRowFilter',                     // 导航栏中的行筛选按钮
            'modalRowFilter',                   // 行筛选弹窗遮罩
            'rowFilterCheckboxes',              // 行筛选复选框列表容器
            'btnSelectAllRows',                 // 全选按钮
            'btnSelectNoneRows',                // 全不选按钮
            'btnApplyRowFilter',                // 应用筛选按钮
            'btnCancelRowFilter',               // 取消筛选按钮
            'btnCloseRowFilter',                // 关闭筛选弹窗右上角按钮
            'rowFilterLabel',                   // 行筛选按钮上的文字标签（如"全部行"）

            // ---------- 主题切换相关 ----------
            'btnToggleTheme',                   // 右上角主题切换按钮
            'icon-sun',                         // 太阳图标（亮色主题显示）
            'icon-moon',                        // 月亮图标（暗色主题显示）

            // ---------- 导航栏维护按钮 ----------
            'btnForceRefresh',                  // 强制刷新按钮（清空缓存并重新加载页面）
            'btnClearCache',                    // 清除浏览器缓存按钮

            // ---------- 三联输入框（数据输入面板） ----------
            'inputVal1',                        // 第一位数字输入框
            'inputVal2',                        // 第二位数字输入框
            'inputVal3',                        // 第三位数字输入框

            // ---------- 数据输入面板按钮 ----------
            'btnApplyValue',                    // 应用数值按钮
            'btnClearAll',                      // 清空当前数据集按钮
            'inputHint',                        // 数据输入提示文字区域

            // ---------- 数据输入面板下拉框 ----------
            'inputRow',                         // 副属性（行）选择下拉框
            'inputGroup',                       // 词条组选择下拉框
            'inputSubCol',                      // 主属性（副属性）选择下拉框

            // ---------- 数据集管理按钮 ----------
            'btnExport',                        // 导出按钮
            'btnImport',                        // 导入按钮
            'btnNewDataset',                    // 新建数据集按钮
            'btnRename',                        // 重命名数据集按钮
            'btnDeleteDataset',                 // 删除数据集按钮
            'importFile',                       // 导入文件选择输入框（隐藏）
            'datasetName',                      // 当前数据集名称显示
            'datasetSelect',                    // 数据集切换下拉框
            'btnSyncTFromDefault',              // 同步默认数据的 t 值和备注按钮

            // ---------- 数值对比弹窗 ----------
            'modalCompare',                     // 数值对比弹窗遮罩
            'compareBody',                      // 对比内容容器
            'btnKeepOld',                       // 保留旧值按钮
            'btnReplaceNew',                    // 替换为新值按钮
            'btnCloseCompare',                  // 关闭对比弹窗按钮

            // ---------- 二次确认弹窗 ----------
            'modalConfirm',                     // 二次确认弹窗遮罩
            'confirmBody',                      // 确认内容容器
            'btnCancelConfirm',                 // 取消按钮
            'btnConfirmAction',                 // 确认按钮
            'btnCloseConfirm',                  // 关闭按钮

            // ---------- 全部获取提示弹窗 ----------
            'modalFullAcquire',                 // 弹窗遮罩
            'fullAcquireBody',                  // 提示内容容器
            'btnCloseFullAcquire',              // 关闭按钮
            'btnConfirmFullAcquire',            // 确定按钮

            // ---------- 非法输入提示弹窗 ----------
            'modalIllegalInput',                // 弹窗遮罩
            'illegalBody',                      // 提示内容容器
            'btnCloseIllegal',                  // 关闭按钮
            'btnConfirmIllegal',                // 确定按钮

            // ---------- 新建数据集弹窗 ----------
            'modalNewDataset',                  // 弹窗遮罩
            'newDatasetName',                   // 名称输入框
            'btnCancelNewDataset',              // 取消按钮
            'btnConfirmNewDataset',             // 确认按钮
            'btnCloseNewDataset',               // 关闭按钮

            // ---------- 重命名数据集弹窗 ----------
            'modalRenameDataset',               // 弹窗遮罩
            'renameOldName',                    // 原名称显示
            'renameDatasetName',                // 新名称输入框
            'btnCancelRenameDataset',           // 取消按钮
            'btnConfirmRenameDataset',          // 确认按钮
            'btnCloseRenameDataset',            // 关闭按钮

            // ---------- 通用提示弹窗 ----------
            'modalAlert',                       // 弹窗遮罩
            'alertTitle',                       // 标题
            'alertBody',                        // 内容容器
            'btnCloseAlert',                    // 关闭按钮
            'btnConfirmAlert',                  // 确定按钮

            // ---------- 通用确认弹窗 ----------
            'modalConfirmDialog',               // 弹窗遮罩
            'confirmDialogTitle',               // 标题
            'confirmDialogBody',                // 内容容器
            'btnCancelConfirmDialog',           // 取消按钮
            'btnConfirmConfirmDialog',          // 确认按钮
            'btnCloseConfirmDialog',            // 关闭按钮

            // ---------- 右侧面板相关 ----------
            'inputPanel',                       // 数据管理面板
            'statsPanel',                       // 统计面板
            'statsContent',                     // 统计内容容器
            'recordPanel',                      // 录入面板
            'recordSubCol',                     // 录入面板主属性选择
            'recordRow',                        // 录入面板副属性选择
            'recordGroup',                      // 录入面板词条选择
            'panelContainer',                   // 右侧面板容器
            'btnRecordApply',                   // 录入按钮
            'recordHint',                       // 录入提示文字
            'unacquiredPanel',                  // 未获取统计面板
            'unacquiredContent',                // 未获取统计内容容器
            'regionPanel',                      // 地区管理面板
            'regionList',                       // 地区列表容器
            'btnAddRegion',                     // 新增地区按钮
            'btnResetRegions',                  // 恢复默认地区按钮
            'modalRegionEdit',                  // 地区编辑弹窗
            'regionEditTitle',                  // 弹窗标题
            'regionEditName',                   // 地区名输入框
            'regionEditRows',                   // 副属性复选框容器
            'regionEditGroups',                 // 词条复选框容器
            'btnConfirmRegionEdit',             // 保存按钮
            'btnCancelRegionEdit',              // 取消按钮
            'btnCloseRegionEdit',               // 关闭按钮
            'regionFilterDetails',              // 地区筛选折叠容器
            'regionFilterCount',                // 已选地区计数
            'regionFilterCheckboxes',           // 地区复选框容器
            'btnRegionFilterAll',               // 全选按钮
            'btnRegionFilterNone',              // 全不选按钮

            // ---------- 表格尺寸设置 ----------
            'colWidthSlider',                   // 列宽滑块
            'rowHeightSlider',                  // 行高滑块
            'colWidthValue',                    // 列宽数值显示
            'rowHeightValue',                   // 行高数值显示
            'colWidthInput',                    // 列宽数字输入框
            'rowHeightInput',                   // 行高数字输入框

            // ---------- 撤回/重做/清除按钮 ----------
            'btnUndo',                          // 撤回按钮
            'btnRedo',                          // 重做按钮
            'btnRecordClear',                   // 清除录入面板单元格按钮
            'btnClearCell',                     // 清除数据输入面板单元格按钮

            // ---------- 清空确认弹窗 ----------
            'modalClearAll',                    // 弹窗遮罩
            'clearAllCountdown',                // 倒计时显示
            'clearAllInput',                    // 确认文字输入框
            'btnCancelClearAll',                // 取消按钮
            'btnConfirmClearAll',               // 确认按钮
            'btnCloseClearAll',                 // 关闭按钮

            // ---------- 清空错误提示弹窗 ----------
            'modalClearError',                  // 弹窗遮罩
            'errorCountdown',                   // 倒计时显示
            'btnCloseClearError',               // 关闭按钮
            'btnForceCloseError',               // 立即关闭按钮

            // ---------- 删除确认弹窗（带倒计时和文字确认） ----------
            'modalDeleteConfirm',               // 弹窗遮罩
            'deleteConfirmDatasetName',         // 数据集名称显示
            'deleteConfirmCountdown',           // 倒计时显示
            'deleteConfirmInput',               // 确认文字输入框
            'btnCancelDeleteConfirm',           // 取消按钮
            'btnConfirmDeleteAction',           // 确认删除按钮
            'btnCloseDeleteConfirm',            // 关闭按钮

            // ---------- 删除错误提示弹窗 ----------
            'modalDeleteError',                 // 弹窗遮罩
            'deleteErrorCountdown',             // 倒计时显示
            'btnCloseDeleteError',              // 关闭按钮
            'btnForceCloseDeleteError',         // 立即关闭按钮

            // ---------- 导出弹窗 ----------
            'modalExport',                      // 弹窗遮罩
            'exportFileName',                   // 文件名输入框
            'btnCancelExport',                  // 取消按钮
            'btnConfirmExport',                 // 导出按钮
            'btnCloseExport',                   // 关闭按钮

            // ---------- 其他全局元素 ----------
            'btnOpenSettings',                  // 设置按钮
            'cellTooltip',                      // 单元格悬停提示栏
            'tableArea',                        // 表格区域容器

            // ---------- 可获取地点提示悬浮窗 ----------   
            'acquireTooltip',                              
            'acquireTooltipBody',                          
            'btnCloseAcquireTooltip',                      

            // ---------- 设置弹窗 ----------
            'modalSettingsOverlay',             // 设置弹窗遮罩
            'modalSettingsContent',             // 设置弹窗内容
            'btnCloseSettingsModal',            // 右上角关闭按钮
            'btnCloseSettingsModalBottom',      // 底部关闭按钮

            // ---------- 数据集备注 ----------
            'datasetRemarkInput',               // 备注输入框
            'datasetRemarkDisplay',             // 备注展示区
            'remarkCharCount',                  // 备注字数统计

            // ---------- 重置与撤减按钮 ----------
            'btnResetSync',                     // 重置同步按钮
            'btnRecordDecrement',               // 撤减按钮

            // ---------- 左侧边栏 ----------
            'leftSidebar',                      // 左侧边栏容器
            'emptyPage',                        // 空白页面容器

            // ---------- 右侧面板折叠按钮 ----------
            'btnToggleRightPanel',              // 折叠/展开按钮
            'icon-panel-collapse',              // 折叠图标
            'icon-panel-expand',                // 展开图标

            // ---------- 版本信息弹窗 ----------
            'btnVersionInfo',                   // 底部版本信息按钮
            'modalVersionInfo',                 // 关于弹窗
            'btnCloseVersionInfo',              // 关闭按钮
            'btnConfirmVersionInfo',            // 关闭按钮（底部）
            'versionInfoBody',                  // 版本信息内容容器

            // ---------- 表格底色设置（已并入界面颜色，保留兼容） ----------
            'tableBgColorOdd',                  // 奇数行颜色选择器
            'tableBgColorOddValue',             // 奇数行颜色值显示
            'tableBgColorEven',                 // 偶数行颜色选择器
            'tableBgColorEvenValue',            // 偶数行颜色值显示
            'btnResetTableBgOdd',               // 重置奇数行颜色按钮
            'btnResetTableBgEven',              // 重置偶数行颜色按钮

            // ---------- 单元格备注 ----------
            'cellNoteText',                     // 备注文本输入框
            'cellNoteDisplay',                  // 备注展示区
            'cellNoteCharCount',                // 备注字数统计
            'btnAddNoteImage',                  // 添加图片按钮
            'noteImageInput',                   // 图片文件选择输入框（隐藏）
            'noteImageList',                    // 图片缩略图列表
            'btnClearNoteImages',               // 清除全部图片按钮
            'btnSaveNote',                      // 保存备注按钮
            'btnClearNote',                     // 清除当前备注按钮

            // ---------- 备注悬浮框 ----------
            'noteTooltip',                      // 悬浮框主体
            'noteTooltipBody',                  // 悬浮框内容容器
            'noteTooltipHeader',                // 悬浮框头部（可拖动）
            'btnNoteTooltipClose',              // 关闭按钮
            'btnNoteTooltipLayout',             // 切换布局按钮
            'noteTooltipResizer',               // 调整大小手柄

            // ---------- 导入合并预览弹窗 ----------
            'modalMergePreview',                // 合并预览弹窗
            'mergeSummary',                     // 差异摘要
            'mergeStrategyRow',                 // 策略单选区
            'mergeConflictList',                // 冲突清单
            'mergeCellDetail',                  // 单元格详情区
            'btnConfirmMerge',                  // 确认应用按钮
            'btnCancelMerge',                   // 取消按钮
            'btnCloseMergePreview',             // 关闭按钮

            // ---------- 数据集合并选择弹窗 ----------
            'btnMergeDatasets',                 // 工具栏"合并"按钮
            'modalMergePicker',                 // 数据集选择弹窗
            'mergePickList',                    // 数据集复选框列表
            'mergeNewName',                     // 合并结果新名称输入框
            'btnConfirmMergePick',              // 开始合并按钮
            'btnCancelMergePick',               // 取消按钮
            'btnCloseMergePick',                // 关闭按钮

            // ---------- 方案管理（界面颜色方案） ----------
            'btnSchemeSave',                    // 保存当前为界面方案按钮
            'btnSchemeExport',                  // 导出界面方案按钮
            'btnSchemeImport',                  // 导入界面方案按钮
            'schemeImportFile',                 // 界面方案导入文件输入框
            'schemeNewName',                    // 新界面方案名称输入框
            'schemeCurrentName',                // 当前界面方案名称显示
            'schemeList',                       // 界面颜色方案列表容器

            // ---------- 颜色编辑器按钮（状态颜色） ----------
            'btnDiscardChanges',                // 放弃修改按钮
            'btnRestoreScheme',                 // 恢复方案颜色按钮
            'btnSaveToScheme',                  // 保存到方案按钮
            'btnSaveAsNewScheme',               // 另存为新方案按钮
            'btnExportColors',                  // 导出颜色按钮
            'btnImportColors',                  // 导入颜色按钮
            'colorImportFile',                  // 颜色导入文件输入框
            'btnRestoreSystemLight',            // 恢复白天系统默认按钮
            'btnRestoreSystemDark',             // 恢复黑夜系统默认按钮

            // ---------- 界面颜色面板 ----------
            'interfaceColorPanel',              // 界面颜色面板容器

            // ---------- 状态颜色方案管理 ----------
            'stateColorSchemeList',             // 单元格颜色方案列表容器
            'stateColorSchemeCurrentName',      // 当前单元格颜色方案名称显示
            'stateColorSchemeNewName',          // 新单元格颜色方案名称输入框
            'btnStateColorSchemeSave',          // 保存当前为单元格颜色方案按钮
            'btnStateColorSchemeExport',        // 导出单元格颜色方案按钮
            'btnStateColorSchemeImport',        // 导入单元格颜色方案按钮
            'stateColorSchemeImportFile',       // 单元格颜色方案导入文件输入框

            // ---------- 存储管理 ----------
            'storageOverview',                  // 存储使用情况总览容器
            'storageQuota',                     // 总配额显示
            'storageUsage',                     // 已使用显示
            'storageRemaining',                 // 剩余可用显示
            'storageProgressBar',               // 存储进度条
            'storageDetails',                   // 数据占用明细容器
            'storageDatasets',                  // 数据集占用大小显示
            'storageRemarks',                   // 备注占用大小显示
            'storageSettings',                  // 设置占用大小显示
            'storageImages',                    // 图片占用大小显示
            'storageOther',                     // 其他占用大小显示
            'barDatasets',                      // 数据集占比进度条
            'barRemarks',                       // 备注占比进度条
            'barSettings',                      // 设置占比进度条
            'barImages',                        // 图片占比进度条
            'barOther',                         // 其他占比进度条
            'btnRefreshStorage',                // 刷新存储按钮
            'customQuotaInput',                 // 自定义配额输入框
            'warnPercentInput',                 // 警示百分比输入框
            'btnSaveQuota',                     // 保存配额按钮
            'quotaStatusMessage',               // 配额状态消息显示
            'datasetStorageList',               // 数据集详细统计列表容器

            // ---------- 备注检索器 ----------
            'noteSearchInput',                  // 备注搜索输入框
            'noteSearchCount',                  // 匹配数量显示
            'btnNoteSearchPrev',                // 上一个匹配按钮
            'btnNoteSearchNext',                // 下一个匹配按钮
        ];

        // =========================================================================
        // 批量获取所有 ID 对应的元素，并缓存到 dom 对象
        // 若元素不存在（例如某些面板未渲染），对应值为 null，使用时需判空
        // =========================================================================
        ids.forEach(id => {
            dom[id] = document.getElementById(id);
        });

        // =========================================================================
        // 非 ID 选择器元素（NodeList）
        // 有些元素需要通过类名或层级关系获取，无法用 getElementById 直接得到
        // =========================================================================
        dom.sidebarBtns = document.querySelectorAll('#sidebar .sidebar-btn');               // 右侧侧边栏所有按钮
        dom.leftSidebarBtns = document.querySelectorAll('#leftSidebar .sidebar-btn');        // 左侧侧边栏所有按钮
        dom.settingsNavBtns = document.querySelectorAll('.settings-nav-btn');               // 设置弹窗导航按钮
        dom.settingsPanelContents = document.querySelectorAll('.settings-panel-content');    // 设置面板内容区

        // =========================================================================
        // 图标驼峰别名
        // 为带连字符的 id 提供驼峰形式引用，提高代码可读性
        // 例如 App.dom.iconSun 等同于 App.dom['icon-sun']
        // =========================================================================
        dom.iconSun = dom['icon-sun'];
        dom.iconMoon = dom['icon-moon'];
    };

})(window.App = window.App || {});