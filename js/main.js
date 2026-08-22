// main.js - 应用入口（含默认数据集保护及 UI 更新）

// ==================== 固定备注定义 ====================
var DEFAULT_REMARK = "1-26.07.16 “向渊行”版本完整实装基质列表\n2-“用户新建数据集默认模板”";
var SAMPLE_DATASET_KEY = '数据示例-表格样式参考';
var SAMPLE_REMARK = "1-数据表单元格 数据填充状态预览\n2-每次重新进入时随机刷新填充效果，仅供效果参考";

function switchPanel(panelName) {
    if (state.leftPanel !== 'table') return; // 非数据表视图时不允许切换右侧面板
    state.activePanel = panelName;
    dom.sidebarBtns.forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.panel === panelName);
    });
    dom.inputPanel.classList.toggle('active-panel', panelName === 'input');
    dom.statsPanel.classList.toggle('active-panel', panelName === 'stats');
    dom.recordPanel.classList.toggle('active-panel', panelName === 'record');
    if (panelName === 'stats') renderStats();
    updateHighlightedCell();
}

// 左侧面板切换
function switchLeftPanel(panelName) {
    state.leftPanel = panelName;
    // 更新按钮激活样式
    dom.leftSidebarBtns.forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.leftPanel === panelName);
    });

    // 控制各区域的显示/隐藏
    var tableArea = document.getElementById('tableArea');
    var rightSidebar = document.getElementById('sidebar');
    var panelContainer = document.getElementById('panelContainer');
    var emptyPage = document.getElementById('emptyPage');

    if (panelName === 'table') {
        tableArea.style.display = '';
        rightSidebar.style.display = '';
        panelContainer.style.display = '';
        emptyPage.style.display = 'none';
        // 恢复之前的面板（input/record/stats）
        switchPanel(state.activePanel);
    } else if (panelName === 'empty') {
        tableArea.style.display = 'none';
        rightSidebar.style.display = 'none';
        panelContainer.style.display = 'none';
        emptyPage.style.display = 'flex';
    }
}

function init() {
    loadTheme();

    var lastKey = localStorage.getItem('smarttable_current_dataset');
    if (lastKey && /^[a-zA-Z0-9_]+$/.test(lastKey)) {
        STORAGE_KEY_DATA = lastKey;
    }

    var list = getDatasetList();

    // ========== 默认数据集（加载内嵌数据） ==========
    if (!list.includes(DEFAULT_STORAGE_KEY)) {
        addDatasetKey(DEFAULT_STORAGE_KEY);
        if (typeof DEFAULT_ROWS !== 'undefined' && Array.isArray(DEFAULT_ROWS)) {
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(DEFAULT_ROWS));
            if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
                state.rows = DEFAULT_ROWS.map(function(row) {
                    return { name: row.name, data: row.data.map(normalizeCell) };
                });
                renderAllTables();
            }
        } else {
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(createInitialRows()));
        }
    }

    // ========== 示例数据集（随机数据） ==========
    if (!list.includes(SAMPLE_DATASET_KEY)) {
        addDatasetKey(SAMPLE_DATASET_KEY);
        localStorage.setItem(SAMPLE_DATASET_KEY, JSON.stringify(createSampleRows()));
    }

    updateDatasetDisplay();
    updateDatasetSelect();

    if (!loadData()) {
        state.rows = createInitialRows();
        saveData();
    }

    populateDropdowns();
    bindEvents();
    renderAllTables();
    resetTripleInputs();
    switchPanel('input');
    initSettings();

    // 保存默认数据集的基准数据，用于保护已有数据不被减少
    if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
        saveBaseline();
    }

    localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
    dom.inputHint.textContent = '准备就绪';

    initCellTooltip();
    initNoteFeature();

    // 恢复用户自定义颜色
    (function applySavedColors() {
        try {
            var raw = localStorage.getItem('smarttable_user_colors');
            if (!raw) return;
            var data = JSON.parse(raw);
            var theme = isDarkTheme() ? 'dark' : 'light';
            var colors = data[theme];
            if (!colors) return;
            var map = {
                hasValue: '--has-value-bg',
                statusNone: '--status-none-bg',
                statusPartial: '--status-partial-bg',
                statusFull: '--status-full-bg'
            };
            Object.keys(map).forEach(function(type) {
                if (colors[type]) {
                    document.documentElement.style.setProperty(map[type], colors[type]);
                }
            });
        } catch(e) {}
    })();

    // ========== 备注初始化 ==========
    updateDatasetRemark();

    // 编辑框（textarea）事件
    dom.datasetRemarkInput.addEventListener('blur', saveRemarkFromInput);
    dom.datasetRemarkInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.blur();
        }
    });
    dom.datasetRemarkInput.addEventListener('input', function() {
        if (dom.remarkCharCount) {
            dom.remarkCharCount.textContent = this.value.length;
        }
        autoResizeRemark();
    });

    // 点击显示区域进入编辑（仅普通数据集可编辑）
    dom.datasetRemarkDisplay.addEventListener('click', function() {
        if (!this.classList.contains('editable')) return;
        this.style.display = 'none';
        var textarea = dom.datasetRemarkInput;
        textarea.value = this.textContent;
        textarea.style.display = 'block';
        textarea.focus();
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });

    // 左侧侧边栏按钮点击
    dom.leftSidebarBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            switchLeftPanel(this.dataset.leftPanel);
        });
    });

    // 更新 UI 保护状态（默认数据集仅禁用清除功能，保留添加功能）
    updateLockedUI();

    // 自动打开“关于”弹窗（每个标签页首次加载时显示，刷新不显示）
    var aboutShown = sessionStorage.getItem('smarttable_about_shown');
    if (!aboutShown && dom.modalVersionInfo) {
        openModal(dom.modalVersionInfo);
        sessionStorage.setItem('smarttable_about_shown', '1');
    }
}

// ==================== 备注处理函数 ====================

function updateDatasetRemark() {
    var textarea = dom.datasetRemarkInput;
    var display = dom.datasetRemarkDisplay;
    var charCount = dom.remarkCharCount;

    display.classList.remove('editable');
    display.style.display = 'none';
    textarea.style.display = 'none';

    var fixedRemark = '';
    if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY && typeof DEFAULT_REMARK !== 'undefined') {
        fixedRemark = DEFAULT_REMARK;
    } else if (STORAGE_KEY_DATA === SAMPLE_DATASET_KEY && typeof SAMPLE_REMARK !== 'undefined') {
        fixedRemark = SAMPLE_REMARK;
    }

    if (fixedRemark) {
        display.textContent = fixedRemark;
        display.style.display = 'block';
        if (textarea.style.display === 'block') {
            autoResizeRemark();
        }
        if (charCount) charCount.textContent = fixedRemark.length;
        return;
    }

    var storedRemark = getCurrentDatasetRemark();
    if (storedRemark) {
        display.textContent = storedRemark;
        display.classList.add('editable');
        display.style.display = 'block';
        if (charCount) charCount.textContent = storedRemark.length;
    } else {
        textarea.value = '';
        textarea.style.display = 'block';
        if (charCount) charCount.textContent = '0';
    }
}

function saveRemarkFromInput() {
    var textarea = dom.datasetRemarkInput;
    var val = textarea.value.trim();
    if (val.length > 550) {
        val = val.substring(0, 550);
        textarea.value = val;
    }
    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY && STORAGE_KEY_DATA !== SAMPLE_DATASET_KEY) {
        var remarks = getDatasetRemarks();
        if (val) {
            remarks[STORAGE_KEY_DATA] = val;
        } else {
            delete remarks[STORAGE_KEY_DATA];
        }
        saveDatasetRemarks(remarks);
    }
    updateDatasetRemark();
}

function autoResizeRemark() {
    var textarea = dom.datasetRemarkInput;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// ==================== 数据集保护 UI 更新 ====================
function updateLockedUI() {
    var locked = (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY);
    // 清除相关按钮禁用
    dom.btnClearCell.disabled = locked;
    dom.btnClearAll.disabled = locked;
    dom.btnRecordClear.disabled = locked;

    // “重置同步”按钮：仅在默认数据集时显示
    if (dom.btnResetSync) {
        dom.btnResetSync.style.display = locked ? '' : 'none';
    }

    // 提示文字
    if (locked) {
        dom.inputHint.textContent = '🔒 默认数据集已保护：可增加，不可减少或清除已有数据';
        dom.recordHint.textContent = '🔒 可添加新条目或增加已有实装';
    } else {
        dom.inputHint.textContent = '准备就绪';
        dom.recordHint.textContent = '';
    }
}

// 恢复右侧面板折叠状态
var savedCollapsed = localStorage.getItem('smarttable_right_collapsed');
var collapseIcon = document.getElementById('icon-panel-collapse');
var expandIcon = document.getElementById('icon-panel-expand');
if (savedCollapsed === '1') {
    state.rightPanelCollapsed = true;
    document.querySelector('.main-layout').classList.add('right-collapsed');
    if (collapseIcon) collapseIcon.style.display = 'none';
    if (expandIcon) expandIcon.style.display = 'inline';
    if (dom.btnToggleRightPanel) dom.btnToggleRightPanel.title = '展开面板';
} else {
    if (collapseIcon) collapseIcon.style.display = 'inline';
    if (expandIcon) expandIcon.style.display = 'none';
    if (dom.btnToggleRightPanel) dom.btnToggleRightPanel.title = '折叠面板';
}

init();