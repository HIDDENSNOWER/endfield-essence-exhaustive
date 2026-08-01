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

    if (!getDatasetList().includes(DEFAULT_STORAGE_KEY)) {
        addDatasetKey(DEFAULT_STORAGE_KEY);
        localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(createInitialRows()));
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