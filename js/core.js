// core.js - 全局状态、常量、DOM引用与基础工具函数
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
    historyIndex: -1
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
    settingsPanel: document.getElementById('settingsPanel'),
    colWidthSlider: document.getElementById('colWidthSlider'),
    rowHeightSlider: document.getElementById('rowHeightSlider'),
    colWidthValue: document.getElementById('colWidthValue'),
    rowHeightValue: document.getElementById('rowHeightValue'),
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),
    btnRecordClear: document.getElementById('btnRecordClear'),
    btnClearCell: document.getElementById('btnClearCell'),
    previewHasValue: document.getElementById('previewHasValue'),
    pickerHasValue: document.getElementById('pickerHasValue'),
    inputHasValue: document.getElementById('inputHasValue'),
    previewStatusNone: document.getElementById('previewStatusNone'),
    pickerStatusNone: document.getElementById('pickerStatusNone'),
    inputStatusNone: document.getElementById('inputStatusNone'),
    previewStatusPartial: document.getElementById('previewStatusPartial'),
    pickerStatusPartial: document.getElementById('pickerStatusPartial'),
    inputStatusPartial: document.getElementById('inputStatusPartial'),
    previewStatusFull: document.getElementById('previewStatusFull'),
    pickerStatusFull: document.getElementById('pickerStatusFull'),
    inputStatusFull: document.getElementById('inputStatusFull'),
    btnResetColors: document.getElementById('btnResetColors'),
    previewTextLight: document.getElementById('previewTextLight'),
    pickerTextLight: document.getElementById('pickerTextLight'),
    inputTextLight: document.getElementById('inputTextLight'),
    previewTextDark: document.getElementById('previewTextDark'),
    pickerTextDark: document.getElementById('pickerTextDark'),
    inputTextDark: document.getElementById('inputTextDark'),
    fontSizeSlider: document.getElementById('fontSizeSlider'),
    fontSizeValue: document.getElementById('fontSizeValue'),
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
    deleteConfirmBody: document.getElementById('deleteConfirmBody'),
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
};

function normalizeCell(cell) {
    if (typeof cell === 'object' && cell !== null && 'v' in cell && 't' in cell && 'a' in cell) return cell;
    if (typeof cell === 'string' || typeof cell === 'number') return { v: cell === '' ? '' : String(cell), t: 0, a: 0 };
    return defaultCellMeta();
}

var COLOR_MAP = {
    hasValue: { var: '--has-value-bg', defaultLight: '#c8e6c9', defaultDark: '#2a4a35', preview: 'previewHasValue', picker: 'pickerHasValue', input: 'inputHasValue' },
    statusNone: { var: '--status-none-bg', defaultLight: '#cfd8dc', defaultDark: '#3a3f47', preview: 'previewStatusNone', picker: 'pickerStatusNone', input: 'inputStatusNone' },
    statusPartial: { var: '--status-partial-bg', defaultLight: '#ffe0b2', defaultDark: '#5a4a28', preview: 'previewStatusPartial', picker: 'pickerStatusPartial', input: 'inputStatusPartial' },
    statusFull: { var: '--status-full-bg', defaultLight: '#a5d6a7', defaultDark: '#2e5a3b', preview: 'previewStatusFull', picker: 'pickerStatusFull', input: 'inputStatusFull' }
};

var TEXT_COLOR_MAP = {
    textLight: { var: '--text-cell', defaultLight: '#1f2328', defaultDark: '#1f2328', preview: 'previewTextLight', picker: 'pickerTextLight', input: 'inputTextLight', theme: 'light' },
    textDark:  { var: '--text-cell', defaultLight: '#e6edf3', defaultDark: '#e6edf3', preview: 'previewTextDark', picker: 'pickerTextDark', input: 'inputTextDark', theme: 'dark' }
};

var STORAGE_KEY_COLORS = 'smarttable_user_colors';
var userColorData = { light: {}, dark: {} };

// ========== 基础工具函数 ==========
function isDarkTheme() { return state.theme === 'dark'; }

function getDefaultColor(key) {
    var cfg = COLOR_MAP[key];
    return isDarkTheme() ? cfg.defaultDark : cfg.defaultLight;
}

function getCurrentCSSColor(varName) {
    var rootStyle = getComputedStyle(document.documentElement);
    return rootStyle.getPropertyValue(varName).trim() || '';
}

function hexToRgbString(hex) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

function rgbStringToHex(rgb) {
    var match = rgb.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (!match) return null;
    function toHex(n) {
        var num = parseInt(n);
        if (num < 0 || num > 255) return null;
        return num.toString(16).padStart(2, '0');
    }
    var r = toHex(match[1]), g = toHex(match[2]), b = toHex(match[3]);
    return r && g && b ? '#' + r + g + b : null;
}

function saveUserColors() {
    localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(userColorData));
}

function loadUserColors() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY_COLORS);
        if (saved) userColorData = JSON.parse(saved);
    } catch(e) {}
}

function applyColorVariable(key, value) {
    document.documentElement.style.setProperty(COLOR_MAP[key].var, value);
    var cfg = COLOR_MAP[key];
    if (dom[cfg.preview]) dom[cfg.preview].style.backgroundColor = value;
    if (dom[cfg.picker]) dom[cfg.picker].value = value;
    if (dom[cfg.input]) dom[cfg.input].value = value;
}

function applyColorVariableForText(key, value) {
    document.documentElement.style.setProperty('--text-cell', value);
    var cfg = TEXT_COLOR_MAP[key];
    if (dom[cfg.preview]) dom[cfg.preview].style.backgroundColor = value;
    if (dom[cfg.picker]) dom[cfg.picker].value = value;
    if (dom[cfg.input]) dom[cfg.input].value = value;
}

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