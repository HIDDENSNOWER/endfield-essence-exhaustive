// core.js - 全局状态、常量、DOM引用与基础工具函数（含默认数据集保护）

var STORAGE_KEY_THEME = 'smarttable_theme';
var DEFAULT_STORAGE_KEY = '默认数据集';
var DATASET_LIST_KEY = 'smarttable_dataset_list';
var STORAGE_KEY_DATA = DEFAULT_STORAGE_KEY;
var PROTECTED_DATASETS = ['默认数据集', '数据示例-表格样式参考'];

var ALL_GROUPS = [
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
var GROUP1 = ALL_GROUPS.slice(0, 7);
var GROUP2 = ALL_GROUPS.slice(7);
var COLS1 = GROUP1.reduce(function(s,g){ return s + g.sub.length; }, 0);
var COLS2 = GROUP2.reduce(function(s,g){ return s + g.sub.length; }, 0);
var ROW_NAMES = [
    '攻击提升', '生命提升', '暴击率提升', '物理伤害提升', '灼热伤害提升',
    '法术伤害提升', '自然伤害提升', '电磁伤害提升', '寒冷伤害提升',
    '源石技艺提升', '治疗效率提升', '终结技效率提升'
];

function defaultCellMeta() { return { v: '', t: 0, a: 0 }; }
function createEmptyRowData() { return new Array(70).fill(null).map(function(){ return defaultCellMeta(); }); }
function createInitialRows() { return ROW_NAMES.map(function(name){ return { name: name, data: createEmptyRowData() }; }); }

var state = {
    rows: createInitialRows(),
    searchQuery: '',
    theme: 'light',
    activePanel: 'input',
    history: [],
    historyIndex: -1,
    leftPanel: 'table',   // 当前左侧面板：'table' 或 'empty'
};
var pendingApply = null;
var confirmCallback = null;
var clearAllTimer = null;
var clearErrorTimer = null;
var deleteConfirmTimer = null;
var deleteErrorTimer = null;
var highlightedCellElement = null;
var statsSortBy = 'totalMatrix';
var statsSortOrder = 'desc';

// 默认数据集保护基准数据（仅对默认数据集记录初始状态，用于防止已有数据被删减）
var baselineRows = null;

var dom = {
    tableHead1: document.getElementById('tableHead1'),
    tableBody1: document.getElementById('tableBody1'),
    tableHead2: document.getElementById('tableHead2'),
    tableBody2: document.getElementById('tableBody2'),
    searchInput: document.getElementById('searchInput'),
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
};

function normalizeCell(cell) {
    if (typeof cell === 'object' && cell !== null && 'v' in cell && 't' in cell && 'a' in cell) return cell;
    if (typeof cell === 'string' || typeof cell === 'number') return { v: cell === '' ? '' : String(cell), t: 0, a: 0 };
    return defaultCellMeta();
}

// ========== 基础工具函数 ==========
function isDarkTheme() { return state.theme === 'dark'; }

// ========== 下拉框填充与联动 ==========
function populateDropdowns() {
    var rowOpts = ROW_NAMES.map(function(n,i){ return '<option value="' + i + '">' + n + '</option>'; }).join('');
    var groupOpts = ALL_GROUPS.map(function(g,i){ return '<option value="' + i + '">' + g.name + '</option>'; }).join('');
    dom.inputRow.innerHTML = rowOpts;
    dom.inputGroup.innerHTML = groupOpts;
    dom.recordRow.innerHTML = rowOpts;
    dom.recordGroup.innerHTML = groupOpts;
    updateSubColOptions(0);
    updateRecordSubColOptions(0);
}
function updateSubColOptions(groupIdx) {
    dom.inputSubCol.innerHTML = ALL_GROUPS[groupIdx].sub.map(function(s,i){ return '<option value="' + i + '">' + s + '</option>'; }).join('');
}
function updateRecordSubColOptions(groupIdx) {
    dom.recordSubCol.innerHTML = ALL_GROUPS[groupIdx].sub.map(function(s,i){ return '<option value="' + i + '">' + s + '</option>'; }).join('');
}

function getColumnIndex(groupIdx, subIdx) {
    var col = 0;
    for (var i=0; i<groupIdx; i++) col += ALL_GROUPS[i].sub.length;
    return col + subIdx;
}

function parseTriple(val) { var s = String(val).trim(); return /^\d{3}$/.test(s) ? s.split('').map(Number) : null; }
function calcSum(arr) { return arr.reduce(function(a,b){ return a+b; }, 0); }

function resetTripleInputs() {
    dom.inputVal1.value = '1';
    dom.inputVal2.value = '1';
    dom.inputVal3.value = '1';
}

function enableTripleInputScroll(inputEl) {
    inputEl.addEventListener('wheel', function(e) {
        e.preventDefault();
        var cur = this.value.trim();
        var num = parseInt(cur);
        if (cur === '' || isNaN(num) || num === 0) {
            num = e.deltaY > 0 ? 9 : 1;
        } else {
            if (e.deltaY > 0) {
                num = num === 1 ? 9 : num - 1;
            } else {
                num = num === 9 ? 1 : num + 1;
            }
        }
        this.value = num;
        this.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });
    inputEl.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 1);
    });
}

function enableWheelSelect(el) {
    el.addEventListener('wheel', function(e) {
        e.preventDefault();
        var opts = this.options;
        if (!opts.length) return;
        var idx = this.selectedIndex + (e.deltaY > 0 ? 1 : -1);
        if (idx < 0) idx = opts.length - 1;
        else if (idx >= opts.length) idx = 0;
        this.selectedIndex = idx;
        this.dispatchEvent(new Event('change', {bubbles:true}));
    }, {passive:false});
}

function getCellNames(rowIdx, colIndex) {
    var groupIdx = 0, remaining = colIndex;
    for (var i = 0; i < ALL_GROUPS.length; i++) {
        var subLen = ALL_GROUPS[i].sub.length;
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

var REMARKS_STORAGE_KEY = 'smarttable_dataset_remarks';

function getDatasetRemarks() {
    try { return JSON.parse(localStorage.getItem(REMARKS_STORAGE_KEY)) || {}; } catch(e) { return {}; }
}
function saveDatasetRemarks(remarks) {
    localStorage.setItem(REMARKS_STORAGE_KEY, JSON.stringify(remarks));
}
function getCurrentDatasetRemark() {
    var remarks = getDatasetRemarks();
    return remarks[STORAGE_KEY_DATA] || '';
}

// ========== 默认数据集保护 ==========
function saveBaseline() {
    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY) return;
    if (typeof DEFAULT_ROWS !== 'undefined' && Array.isArray(DEFAULT_ROWS)) {
        baselineRows = DEFAULT_ROWS.map(function(row) {
            return {
                name: row.name,
                data: row.data.map(normalizeCell)
            };
        });
    } else {
        // 极端回退：使用当前状态（一般为空）
        baselineRows = JSON.parse(JSON.stringify(state.rows));
    }
}

function isCellOperationAllowed(rowIdx, colIndex, newCell) {
    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY) return true;
    if (!baselineRows) return true;
    var baseCell = baselineRows[rowIdx].data[colIndex];
    // 检查数值 v：不允许变为空或不同值（若原基准有值）
    if (baseCell.v !== '') {
        if (newCell.v !== baseCell.v) return false;
    }
    // 检查重复数 t：不允许减少
    if (baseCell.t > 0) {
        if (newCell.t < baseCell.t) return false;
    }
    // 检查获取数 a：不允许减少
    if (baseCell.a > 0) {
        if (newCell.a < baseCell.a) return false;
    }
    return true;
}