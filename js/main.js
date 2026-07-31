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
}

init();