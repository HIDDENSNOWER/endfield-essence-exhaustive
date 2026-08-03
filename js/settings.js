// settings.js - 主题切换、列宽行高、颜色恢复、设置弹窗导航

// ========== 主题 ==========
function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    dom.iconSun.style.display = theme === 'dark' ? 'none' : '';
    dom.iconMoon.style.display = theme === 'dark' ? '' : 'none';
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    syncColorUI();
}

function toggleTheme() {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
}

function loadTheme() {
    var saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) {
        applyTheme(saved);
    } else {
        applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
}

// ========== 颜色恢复 ==========
var COLOR_MAP = {
    hasValue:       { var: '--has-value-bg',       defaultLight: '#c8e6c9', defaultDark: '#2a4a35' },
    statusNone:     { var: '--status-none-bg',     defaultLight: '#cfd8dc', defaultDark: '#3a3f47' },
    statusPartial:  { var: '--status-partial-bg',  defaultLight: '#ffe0b2', defaultDark: '#5a4a28' },
    statusFull:     { var: '--status-full-bg',     defaultLight: '#a5d6a7', defaultDark: '#2e5a3b' }
};

function getDefaultColor(key) {
    var cfg = COLOR_MAP[key];
    return isDarkTheme() ? cfg.defaultDark : cfg.defaultLight;
}

function applyStoredColors() {
    try {
        var raw = localStorage.getItem('smarttable_user_colors');
        if (!raw) return;
        var data = JSON.parse(raw);
        var theme = isDarkTheme() ? 'dark' : 'light';
        var colors = data[theme];
        if (!colors) return;
        Object.keys(COLOR_MAP).forEach(function(key) {
            if (colors[key]) {
                document.documentElement.style.setProperty(COLOR_MAP[key].var, colors[key]);
            }
        });
    } catch(e) {}
}

function syncColorUI() {
    applyStoredColors();
    // 如果用户未自定义颜色，CSS 变量会使用 :root 中的默认值，因此无需额外操作
}

// ========== 列宽/行高设置 ==========
function initSettings() {
    var savedStyle = localStorage.getItem('smarttable_style');
    var colWidth = 36, rowHeight = 24;
    if (savedStyle) {
        try {
            var p = JSON.parse(savedStyle);
            if (p.colWidth) colWidth = p.colWidth;
            if (p.rowHeight) rowHeight = p.rowHeight;
        } catch(e) {}
    }
    if (dom.colWidthInput) dom.colWidthInput.value = colWidth;
    if (dom.colWidthSlider) dom.colWidthSlider.value = colWidth;
    if (dom.rowHeightInput) dom.rowHeightInput.value = rowHeight;
    if (dom.rowHeightSlider) dom.rowHeightSlider.value = rowHeight;
    if (dom.colWidthValue) dom.colWidthValue.textContent = colWidth;
    if (dom.rowHeightValue) dom.rowHeightValue.textContent = rowHeight;
    applyStyle(colWidth, rowHeight);
}

function applyStyle(colWidth, rowHeight) {
    // 1. 更新 CSS 变量（供其他样式使用）
    document.documentElement.style.setProperty('--col-width', colWidth + 'px');
    document.documentElement.style.setProperty('--row-height', rowHeight + 'px');
    localStorage.setItem('smarttable_style', JSON.stringify({ colWidth: colWidth, rowHeight: rowHeight }));

    // 2. 直接设置所有数据列的 <col> 宽度（立即生效）
    var dataCols = document.querySelectorAll('col.data-col');
    for (var i = 0; i < dataCols.length; i++) {
        dataCols[i].style.width = colWidth + 'px';
    }

    // 3. 强制所有数据单元格和表头子行为指定高度
    var cells = document.querySelectorAll('table tbody td, table thead tr:nth-child(2) th');
    for (var j = 0; j < cells.length; j++) {
        cells[j].style.height = rowHeight + 'px';
    }

    // 4. 数据单元格宽度也强制同步（保险）
    var dataCells = document.querySelectorAll('table tbody td:not(:first-child)');
    for (var k = 0; k < dataCells.length; k++) {
        dataCells[k].style.width = colWidth + 'px';
        dataCells[k].style.minWidth = colWidth + 'px';
        dataCells[k].style.maxWidth = colWidth + 'px';
    }
}

// ========== 设置弹窗导航切换 ==========
function initSettingsNav() {
    var settingsNavBtns = document.querySelectorAll('.settings-nav-btn');
    settingsNavBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var panelId = this.dataset.settingsPanel;
            settingsNavBtns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.settings-panel-content').forEach(function(p) { p.classList.remove('active'); });
            var targetPanel = document.getElementById('settingsPanel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}