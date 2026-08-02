// main.js - 应用入口

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

    // 确保系统数据集存在
    var list = getDatasetList();
    var sampleKey = '数据示例-表格样式参考';

    // 确保默认数据集存在（异步加载）
    if (!list.includes(DEFAULT_STORAGE_KEY)) {
        addDatasetKey(DEFAULT_STORAGE_KEY);

        // 加载远程基础数据
        var base = location.href.replace(/\/[^/]*$/, '/'); // 当前页面所在目录
        fetch(base + 'data/default.json', { cache: 'no-store' })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function(data) {
                // 验证数据格式：必须是数组，且第一项包含 name 和 data
                if (Array.isArray(data) && data.length > 0 && data[0].name && Array.isArray(data[0].data)) {
                    localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(data));
                    // 如果当前选中的正是默认数据集，直接渲染
                    if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
                        state.rows = data.map(function(row) {
                            return { name: row.name, data: row.data.map(normalizeCell) };
                        });
                        renderAllTables();
                    }
                } else {
                    throw new Error('数据格式不正确');
                }
            })
            .catch(function(error) {
                console.warn('默认数据集加载失败，将使用空数据:', error.message);
                localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(createInitialRows()));
            });
    }

    // 参考示例数据（保持原样）
    if (!list.includes(sampleKey)) {
        addDatasetKey(sampleKey);
        localStorage.setItem(sampleKey, JSON.stringify(createSampleRows()));
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
    // 强制从 localStorage 恢复颜色
    (function applySavedColors() {
        try {
            var raw = localStorage.getItem('smarttable_user_colors');
            if (!raw) return;
            var data = JSON.parse(raw);
            var theme = isDarkTheme() ? 'dark' : 'light';
            var colors = data[theme];
            if (!colors) return;
            // 映射关系（确保与 COLOR_VARS 一致）
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
}

init();