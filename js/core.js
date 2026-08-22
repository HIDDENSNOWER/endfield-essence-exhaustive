/**
 * core.js - 全局状态、常量、DOM 引用与基础工具函数
 * 包含：数据定义、单元格元数据、状态管理、DOM 缓存、工具函数、默认数据集保护
 */

// ========== 存储键与常量 ==========
const STORAGE_KEY_THEME = 'smarttable_theme';
const DEFAULT_STORAGE_KEY = '默认数据集';
const DATASET_LIST_KEY = 'smarttable_dataset_list';
let STORAGE_KEY_DATA = DEFAULT_STORAGE_KEY;
const PROTECTED_DATASETS = ['默认数据集', '数据示例-表格样式参考'];

// ========== 词条组与行列定义 ==========
const ALL_GROUPS = [
    { name: '强攻', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '压制', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '追袭', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '粉碎', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '昂扬', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '巧技', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '残暴', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '附术', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '医疗', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '切骨', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '迸发', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '夜幕', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '流转', sub: ['敏捷','力量','意志','智识','主能力'] },
    { name: '效益', sub: ['敏捷','力量','意志','智识','主能力'] }
];

const GROUP1 = ALL_GROUPS.slice(0, 7);
const GROUP2 = ALL_GROUPS.slice(7);
const COLS1 = GROUP1.reduce((s, g) => s + g.sub.length, 0);
const COLS2 = GROUP2.reduce((s, g) => s + g.sub.length, 0);

const ROW_NAMES = [
    '攻击提升', '生命提升', '暴击率提升', '物理伤害提升', '灼热伤害提升',
    '法术伤害提升', '自然伤害提升', '电磁伤害提升', '寒冷伤害提升',
    '源石技艺提升', '治疗效率提升', '终结技效率提升'
];

// ========== 单元格数据模型 ==========
/**
 * 创建默认的单元格元数据
 * @returns {{v: string, t: number, a: number, note: {text: string, images: string[]}}}
 */
function defaultCellMeta() {
    return { v: '', t: 0, a: 0, note: { text: '', images: [] } };
}

/**
 * 创建空行数据（70 列）
 * @returns {Array<{v: string, t: number, a: number, note: Object}>}
 */
function createEmptyRowData() {
    return new Array(70).fill(null).map(() => defaultCellMeta());
}

/**
 * 创建初始行数据（12 个提升项，每个含 70 列空数据）
 * @returns {Array<{name: string, data: Array}>}
 */
function createInitialRows() {
    return ROW_NAMES.map(name => ({ name, data: createEmptyRowData() }));
}

// ========== 全局状态 ==========
const state = {
    rows: createInitialRows(),
    searchQuery: '',               // 已不再使用，保留兼容
    theme: 'light',
    activePanel: 'input',
    history: [],
    historyIndex: -1,
    leftPanel: 'table',
    rightPanelCollapsed: false,
    selectedRows: ROW_NAMES.slice()   // 当前筛选显示的行（默认全部）
};

// ========== 其他全局状态 ==========
let pendingApply = null;          // 等待应用的新值信息
let confirmCallback = null;       // 二次确认回调
let clearAllTimer = null;         // 清空倒计时定时器
let clearErrorTimer = null;       // 清空错误提示定时器
let deleteConfirmTimer = null;    // 删除倒计时定时器
let deleteErrorTimer = null;      // 删除错误提示定时器
let highlightedCellElement = null; // 当前高亮的单元格 DOM
let statsSortBy = 'totalMatrix';  // 统计排序依据
let statsSortOrder = 'desc';      // 统计排序方向
let baselineRows = null;          // 默认数据集保护基准数据

// ========== DOM 引用缓存 ==========
const dom = {
    tableHead1: document.getElementById('tableHead1'),
    tableBody1: document.getElementById('tableBody1'),
    tableHead2: document.getElementById('tableHead2'),
    tableBody2: document.getElementById('tableBody2'),
    btnRowFilter: document.getElementById('btnRowFilter'),
    modalRowFilter: document.getElementById('modalRowFilter'),
    rowFilterCheckboxes: document.getElementById('rowFilterCheckboxes'),
    btnSelectAllRows: document.getElementById('btnSelectAllRows'),
    btnSelectNoneRows: document.getElementById('btnSelectNoneRows'),
    btnApplyRowFilter: document.getElementById('btnApplyRowFilter'),
    btnCancelRowFilter: document.getElementById('btnCancelRowFilter'),
    btnCloseRowFilter: document.getElementById('btnCloseRowFilter'),
    rowFilterLabel: document.getElementById('rowFilterLabel'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    iconSun: document.getElementById('icon-sun'),
    iconMoon: document.getElementById('icon-moon'),
    inputVal1: document.getElementById('inputVal1'),
    inputVal2: document.getElementById('inputVal2'),
    inputVal3: document.getElementById('inputVal3'),
    btnApplyValue: document.getElementById('btnApplyValue'),
    btnClearAll: document.getElementById('btnClearAll'),
    inputHint: document.getElementById('inputHint'),
    inputRow: document.getElementById('inputRow'),
    inputGroup: document.getElementById('inputGroup'),
    inputSubCol: document.getElementById('inputSubCol'),
    btnExport: document.getElementById('btnExport'),
    btnImport: document.getElementById('btnImport'),
    btnNewDataset: document.getElementById('btnNewDataset'),
    btnRename: document.getElementById('btnRename'),
    btnDeleteDataset: document.getElementById('btnDeleteDataset'),
    importFile: document.getElementById('importFile'),
    datasetName: document.getElementById('datasetName'),
    datasetSelect: document.getElementById('datasetSelect'),
    modalCompare: document.getElementById('modalCompare'),
    compareBody: document.getElementById('compareBody'),
    btnKeepOld: document.getElementById('btnKeepOld'),
    btnReplaceNew: document.getElementById('btnReplaceNew'),
    btnCloseCompare: document.getElementById('btnCloseCompare'),
    modalConfirm: document.getElementById('modalConfirm'),
    confirmBody: document.getElementById('confirmBody'),
    btnCancelConfirm: document.getElementById('btnCancelConfirm'),
    btnConfirmAction: document.getElementById('btnConfirmAction'),
    btnCloseConfirm: document.getElementById('btnCloseConfirm'),
    modalFullAcquire: document.getElementById('modalFullAcquire'),
    fullAcquireBody: document.getElementById('fullAcquireBody'),
    btnCloseFullAcquire: document.getElementById('btnCloseFullAcquire'),
    btnConfirmFullAcquire: document.getElementById('btnConfirmFullAcquire'),
    modalIllegalInput: document.getElementById('modalIllegalInput'),
    illegalBody: document.getElementById('illegalBody'),
    btnCloseIllegal: document.getElementById('btnCloseIllegal'),
    btnConfirmIllegal: document.getElementById('btnConfirmIllegal'),
    modalNewDataset: document.getElementById('modalNewDataset'),
    newDatasetName: document.getElementById('newDatasetName'),
    btnCancelNewDataset: document.getElementById('btnCancelNewDataset'),
    btnConfirmNewDataset: document.getElementById('btnConfirmNewDataset'),
    btnCloseNewDataset: document.getElementById('btnCloseNewDataset'),
    modalRenameDataset: document.getElementById('modalRenameDataset'),
    renameOldName: document.getElementById('renameOldName'),
    renameDatasetName: document.getElementById('renameDatasetName'),
    btnCancelRenameDataset: document.getElementById('btnCancelRenameDataset'),
    btnConfirmRenameDataset: document.getElementById('btnConfirmRenameDataset'),
    btnCloseRenameDataset: document.getElementById('btnCloseRenameDataset'),
    modalDeleteDataset: document.getElementById('modalDeleteDataset'),
    deleteDatasetName: document.getElementById('deleteDatasetName'),
    btnCancelDeleteDataset: document.getElementById('btnCancelDeleteDataset'),
    btnConfirmDeleteDataset: document.getElementById('btnConfirmDeleteDataset'),
    btnCloseDeleteDataset: document.getElementById('btnCloseDeleteDataset'),
    modalAlert: document.getElementById('modalAlert'),
    alertTitle: document.getElementById('alertTitle'),
    alertBody: document.getElementById('alertBody'),
    btnCloseAlert: document.getElementById('btnCloseAlert'),
    btnConfirmAlert: document.getElementById('btnConfirmAlert'),
    modalConfirmDialog: document.getElementById('modalConfirmDialog'),
    confirmDialogTitle: document.getElementById('confirmDialogTitle'),
    confirmDialogBody: document.getElementById('confirmDialogBody'),
    btnCancelConfirmDialog: document.getElementById('btnCancelConfirmDialog'),
    btnConfirmConfirmDialog: document.getElementById('btnConfirmConfirmDialog'),
    btnCloseConfirmDialog: document.getElementById('btnCloseConfirmDialog'),
    sidebarBtns: document.querySelectorAll('#sidebar .sidebar-btn'),
    inputPanel: document.getElementById('inputPanel'),
    statsPanel: document.getElementById('statsPanel'),
    statsContent: document.getElementById('statsContent'),
    recordPanel: document.getElementById('recordPanel'),
    recordSubCol: document.getElementById('recordSubCol'),
    recordRow: document.getElementById('recordRow'),
    recordGroup: document.getElementById('recordGroup'),
    btnRecordApply: document.getElementById('btnRecordApply'),
    recordHint: document.getElementById('recordHint'),
    colWidthSlider: document.getElementById('colWidthSlider'),
    rowHeightSlider: document.getElementById('rowHeightSlider'),
    colWidthValue: document.getElementById('colWidthValue'),
    rowHeightValue: document.getElementById('rowHeightValue'),
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),
    btnRecordClear: document.getElementById('btnRecordClear'),
    btnClearCell: document.getElementById('btnClearCell'),
    modalClearAll: document.getElementById('modalClearAll'),
    clearAllCountdown: document.getElementById('clearAllCountdown'),
    clearAllInput: document.getElementById('clearAllInput'),
    btnCancelClearAll: document.getElementById('btnCancelClearAll'),
    btnConfirmClearAll: document.getElementById('btnConfirmClearAll'),
    btnCloseClearAll: document.getElementById('btnCloseClearAll'),
    modalClearError: document.getElementById('modalClearError'),
    errorCountdown: document.getElementById('errorCountdown'),
    btnCloseClearError: document.getElementById('btnCloseClearError'),
    btnForceCloseError: document.getElementById('btnForceCloseError'),
    modalDeleteConfirm: document.getElementById('modalDeleteConfirm'),
    deleteConfirmDatasetName: document.getElementById('deleteConfirmDatasetName'),
    deleteConfirmCountdown: document.getElementById('deleteConfirmCountdown'),
    deleteConfirmInput: document.getElementById('deleteConfirmInput'),
    btnCancelDeleteConfirm: document.getElementById('btnCancelDeleteConfirm'),
    btnConfirmDeleteAction: document.getElementById('btnConfirmDeleteAction'),
    btnCloseDeleteConfirm: document.getElementById('btnCloseDeleteConfirm'),
    modalDeleteError: document.getElementById('modalDeleteError'),
    deleteErrorCountdown: document.getElementById('deleteErrorCountdown'),
    btnCloseDeleteError: document.getElementById('btnCloseDeleteError'),
    btnForceCloseDeleteError: document.getElementById('btnForceCloseDeleteError'),
    modalExport: document.getElementById('modalExport'),
    exportFileName: document.getElementById('exportFileName'),
    btnCancelExport: document.getElementById('btnCancelExport'),
    btnConfirmExport: document.getElementById('btnConfirmExport'),
    btnCloseExport: document.getElementById('btnCloseExport'),
    btnForceRefresh: document.getElementById('btnForceRefresh'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    cellTooltip: document.getElementById('cellTooltip'),
    tableArea: document.getElementById('tableArea'),
    modalSettingsOverlay: document.getElementById('modalSettingsOverlay'),
    modalSettingsContent: document.getElementById('modalSettingsContent'),
    btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
    btnCloseSettingsModalBottom: document.getElementById('btnCloseSettingsModalBottom'),
    colWidthInput: document.getElementById('colWidthInput'),
    rowHeightInput: document.getElementById('rowHeightInput'),
    datasetRemarkInput: document.getElementById('datasetRemarkInput'),
    datasetRemarkDisplay: document.getElementById('datasetRemarkDisplay'),
    remarkCharCount: document.getElementById('remarkCharCount'),
    btnResetSync: document.getElementById('btnResetSync'),
    btnRecordDecrement: document.getElementById('btnRecordDecrement'),
    leftSidebar: document.getElementById('leftSidebar'),
    leftSidebarBtns: document.querySelectorAll('#leftSidebar .sidebar-btn'),
    emptyPage: document.getElementById('emptyPage'),
    btnToggleRightPanel: document.getElementById('btnToggleRightPanel'),
    iconPanelCollapse: document.getElementById('icon-panel-collapse'),
    iconPanelExpand: document.getElementById('icon-panel-expand'),
    btnVersionInfo: document.getElementById('btnVersionInfo'),
    modalVersionInfo: document.getElementById('modalVersionInfo'),
    btnCloseVersionInfo: document.getElementById('btnCloseVersionInfo'),
    btnConfirmVersionInfo: document.getElementById('btnConfirmVersionInfo'),
    versionInfoBody: document.getElementById('versionInfoBody'),
    tableBgColorOdd: document.getElementById('tableBgColorOdd'),
    tableBgColorOddValue: document.getElementById('tableBgColorOddValue'),
    tableBgColorEven: document.getElementById('tableBgColorEven'),
    tableBgColorEvenValue: document.getElementById('tableBgColorEvenValue'),
    btnResetTableBgOdd: document.getElementById('btnResetTableBgOdd'),
    btnResetTableBgEven: document.getElementById('btnResetTableBgEven'),
    cellNoteText: document.getElementById('cellNoteText'),
    cellNoteDisplay: document.getElementById('cellNoteDisplay'),
    cellNoteCharCount: document.getElementById('cellNoteCharCount'),
    btnAddNoteImage: document.getElementById('btnAddNoteImage'),
    noteImageInput: document.getElementById('noteImageInput'),
    noteImageList: document.getElementById('noteImageList'),
    btnClearNoteImages: document.getElementById('btnClearNoteImages'),
    btnSaveNote: document.getElementById('btnSaveNote'),
    btnClearNote: document.getElementById('btnClearNote'),
    noteTooltip: document.getElementById('noteTooltip'),
    noteTooltipBody: document.getElementById('noteTooltipBody'),
    noteTooltipHeader: document.getElementById('noteTooltipHeader'),
    btnNoteTooltipClose: document.getElementById('btnNoteTooltipClose'),
    btnNoteTooltipLayout: document.getElementById('btnNoteTooltipLayout'),
    noteTooltipResizer: document.getElementById('noteTooltipResizer'),
};

// ========== 单元格数据标准化 ==========
/**
 * 将各种格式的单元格数据转换为标准对象
 * @param {Object|string|number} cell - 原始单元格数据
 * @returns {{v: string, t: number, a: number, note: Object}}
 */
function normalizeCell(cell) {
    // 已为标准对象
    if (typeof cell === 'object' && cell !== null && 'v' in cell && 't' in cell && 'a' in cell) {
        if (!cell.note || typeof cell.note !== 'object') {
            cell.note = { text: '', images: [] };
        }
        if (!Array.isArray(cell.note.images)) cell.note.images = [];
        return cell;
    }
    // 字符串或数字（旧版数据）
    if (typeof cell === 'string' || typeof cell === 'number') {
        return { v: cell === '' ? '' : String(cell), t: 0, a: 0, note: { text: '', images: [] } };
    }
    // 兜底
    return defaultCellMeta();
}

// ========== 基础工具函数 ==========
/**
 * 判断当前是否为暗色主题
 * @returns {boolean}
 */
function isDarkTheme() {
    return state.theme === 'dark';
}

// ========== 下拉框填充与联动 ==========
/**
 * 填充所有下拉框选项
 */
function populateDropdowns() {
    const rowOpts = ROW_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    const groupOpts = ALL_GROUPS.map((g, i) => `<option value="${i}">${g.name}</option>`).join('');
    dom.inputRow.innerHTML = rowOpts;
    dom.inputGroup.innerHTML = groupOpts;
    dom.recordRow.innerHTML = rowOpts;
    dom.recordGroup.innerHTML = groupOpts;
    updateSubColOptions(0);
    updateRecordSubColOptions(0);
}

/**
 * 更新数据输入面板的副属性下拉框
 * @param {number} groupIdx - 词条组索引
 */
function updateSubColOptions(groupIdx) {
    dom.inputSubCol.innerHTML = ALL_GROUPS[groupIdx].sub
        .map((s, i) => `<option value="${i}">${s}</option>`).join('');
}

/**
 * 更新录入面板的副属性下拉框
 * @param {number} groupIdx - 词条组索引
 */
function updateRecordSubColOptions(groupIdx) {
    dom.recordSubCol.innerHTML = ALL_GROUPS[groupIdx].sub
        .map((s, i) => `<option value="${i}">${s}</option>`).join('');
}

/**
 * 根据词条组索引和副属性索引计算全局列索引
 * @param {number} groupIdx - 词条组索引
 * @param {number} subIdx - 副属性索引
 * @returns {number} 全局列索引（0-69）
 */
function getColumnIndex(groupIdx, subIdx) {
    let col = 0;
    for (let i = 0; i < groupIdx; i++) col += ALL_GROUPS[i].sub.length;
    return col + subIdx;
}

/**
 * 解析三位数字字符串
 * @param {string} val
 * @returns {number[]|null} 解析成功返回数字数组，否则 null
 */
function parseTriple(val) {
    const s = String(val).trim();
    return /^\d{3}$/.test(s) ? s.split('').map(Number) : null;
}

/**
 * 计算数组元素之和
 * @param {number[]} arr
 * @returns {number}
 */
function calcSum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * 重置三个输入框为默认值 '1'
 */
function resetTripleInputs() {
    dom.inputVal1.value = '1';
    dom.inputVal2.value = '1';
    dom.inputVal3.value = '1';
}

/**
 * 为单个字符输入框启用滚轮增减和数字过滤
 * @param {HTMLInputElement} inputEl
 */
function enableTripleInputScroll(inputEl) {
    inputEl.addEventListener('wheel', function (e) {
        e.preventDefault();
        let num = parseInt(this.value);
        if (isNaN(num) || num === 0) {
            num = e.deltaY > 0 ? 9 : 1;
        } else {
            num = e.deltaY > 0 ? (num === 1 ? 9 : num - 1) : (num === 9 ? 1 : num + 1);
        }
        this.value = num;
        this.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });

    inputEl.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 1);
    });
}

/**
 * 为下拉框启用滚轮切换选项
 * @param {HTMLSelectElement} el
 */
function enableWheelSelect(el) {
    el.addEventListener('wheel', function (e) {
        e.preventDefault();
        const opts = this.options;
        if (!opts.length) return;
        let idx = this.selectedIndex + (e.deltaY > 0 ? 1 : -1);
        if (idx < 0) idx = opts.length - 1;
        else if (idx >= opts.length) idx = 0;
        this.selectedIndex = idx;
        this.dispatchEvent(new Event('change', { bubbles: true }));
    }, { passive: false });
}

/**
 * 根据行列索引获取单元格的名称信息
 * @param {number} rowIdx - 行索引
 * @param {number} colIndex - 全局列索引
 * @returns {{rowName: string, groupName: string, subName: string}}
 */
function getCellNames(rowIdx, colIndex) {
    let groupIdx = 0, remaining = colIndex;
    for (let i = 0; i < ALL_GROUPS.length; i++) {
        const subLen = ALL_GROUPS[i].sub.length;
        if (remaining < subLen) {
            return {
                rowName: ROW_NAMES[rowIdx],
                groupName: ALL_GROUPS[i].name,
                subName: ALL_GROUPS[i].sub[remaining]
            };
        }
        remaining -= subLen;
    }
    return { rowName: '?', groupName: '?', subName: '?' };
}

// ========== 数据集备注存储 ==========
const REMARKS_STORAGE_KEY = 'smarttable_dataset_remarks';

/**
 * 获取所有数据集的备注对象
 * @returns {Object}
 */
function getDatasetRemarks() {
    try {
        return JSON.parse(localStorage.getItem(REMARKS_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

/**
 * 保存所有数据集的备注对象
 * @param {Object} remarks
 */
function saveDatasetRemarks(remarks) {
    localStorage.setItem(REMARKS_STORAGE_KEY, JSON.stringify(remarks));
}

/**
 * 获取当前数据集的备注文本
 * @returns {string}
 */
function getCurrentDatasetRemark() {
    const remarks = getDatasetRemarks();
    return remarks[STORAGE_KEY_DATA] || '';
}

// ========== 默认数据集保护 ==========
/**
 * 保存默认数据集的基准数据，用于防止已有数据被删减
 */
function saveBaseline() {
    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY) return;
    if (typeof DEFAULT_ROWS !== 'undefined' && Array.isArray(DEFAULT_ROWS)) {
        baselineRows = DEFAULT_ROWS.map(row => ({
            name: row.name,
            data: row.data.map(normalizeCell)
        }));
    } else {
        // 极端回退：使用当前状态（一般为空）
        baselineRows = JSON.parse(JSON.stringify(state.rows));
    }
}

/**
 * 检查单元格操作是否被默认数据集保护允许
 * @param {number} rowIdx - 行索引
 * @param {number} colIndex - 列索引
 * @param {Object} newCell - 新单元格数据
 * @returns {boolean} 是否允许
 */
function isCellOperationAllowed(rowIdx, colIndex, newCell) {
    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY) return true;
    if (!baselineRows) return true;
    const baseCell = baselineRows[rowIdx].data[colIndex];

    // 数值 v：不允许变为空或不同值（若原基准有值）
    if (baseCell.v !== '' && newCell.v !== baseCell.v) return false;
    // 重复数 t：不允许减少
    if (baseCell.t > 0 && newCell.t < baseCell.t) return false;
    // 获取数 a：不允许减少
    if (baseCell.a > 0 && newCell.a < baseCell.a) return false;

    return true;
}