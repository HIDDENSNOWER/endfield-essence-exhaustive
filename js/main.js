// main.js - 应用入口

// ==================== 固定备注定义 ====================
var DEFAULT_REMARK = "版本 1.0 · 初始基础基质数据，包含常用实装及数值";
var SAMPLE_DATASET_KEY = '数据示例-表格样式参考';
var SAMPLE_REMARK = '表格样式参考示例数据，每次切换自动随机刷新。';

function switchPanel(panelName) {
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

    localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
    dom.inputHint.textContent = '准备就绪';

    initCellTooltip();

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
        if (e.key === 'Enter' && !e.shiftKey) {   // Enter 保存，Shift+Enter 换行
            e.preventDefault();
            this.blur();
        }
    });
    dom.datasetRemarkInput.addEventListener('input', function() {
        if (dom.remarkCharCount) {
            dom.remarkCharCount.textContent = this.value.length;
        }
        autoResizeRemark();   // 新增：实时调整高度
    });

    // 点击显示区域进入编辑（仅普通数据集可编辑）
    dom.datasetRemarkDisplay.addEventListener('click', function() {
        if (!this.classList.contains('editable')) return;
        this.style.display = 'none';
        var textarea = dom.datasetRemarkInput;
        textarea.value = this.textContent;
        textarea.style.display = 'block';
        textarea.focus();
        // 自动调整高度
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });

    function autoResizeRemark() {
        var textarea = dom.datasetRemarkInput;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

}

// ==================== 备注处理函数 ====================

function updateDatasetRemark() {
    var textarea = dom.datasetRemarkInput;
    var display = dom.datasetRemarkDisplay;
    var charCount = dom.remarkCharCount;

    // 重置状态
    display.classList.remove('editable');
    display.style.display = 'none';
    textarea.style.display = 'none';

    // 固定备注（默认数据集 / 示例数据集）
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

    // 普通数据集：可编辑
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

    // 字数超限截断（maxlength 已限制，但以防万一）
    if (val.length > 550) {
        val = val.substring(0, 550);
        textarea.value = val;
    }

    // 只有非系统数据集才保存
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

init();