// settings.js - 主题切换、列宽行高、颜色字体设置、设置弹窗导航

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
    // 设置输入框和滑块的初始值
    if (dom.colWidthInput) dom.colWidthInput.value = colWidth;
    if (dom.colWidthSlider) dom.colWidthSlider.value = colWidth;
    if (dom.rowHeightInput) dom.rowHeightInput.value = rowHeight;
    if (dom.rowHeightSlider) dom.rowHeightSlider.value = rowHeight;
    if (dom.colWidthValue) dom.colWidthValue.textContent = colWidth;
    if (dom.rowHeightValue) dom.rowHeightValue.textContent = rowHeight;
    applyStyle(colWidth, rowHeight);
}

function applyStyle(colWidth, rowHeight) {
    // 更新 CSS 变量（保留，不影响直接操作）
    document.documentElement.style.setProperty('--col-width', colWidth + 'px');
    document.documentElement.style.setProperty('--row-height', rowHeight + 'px');
    localStorage.setItem('smarttable_style', JSON.stringify({ colWidth: colWidth, rowHeight: rowHeight }));

    // ★ 直接暴力设置所有数据单元格的宽度和高度
    var allDataCells = document.querySelectorAll('table tbody td:not(:first-child)');
    for (var i = 0; i < allDataCells.length; i++) {
        allDataCells[i].style.width = colWidth + 'px';
        allDataCells[i].style.height = rowHeight + 'px';
        allDataCells[i].style.minWidth = colWidth + 'px';
        allDataCells[i].style.maxWidth = colWidth + 'px';
    }
    // 同时设置表头子列单元格（第二行）
    var allHeaderCells = document.querySelectorAll('table thead tr:nth-child(2) th');
    for (var j = 0; j < allHeaderCells.length; j++) {
        allHeaderCells[j].style.width = colWidth + 'px';
        allHeaderCells[j].style.height = rowHeight + 'px';
    }
}

// ========== 颜色/字体设置 ==========
function syncColorUI() {
    var currentTheme = isDarkTheme() ? 'dark' : 'light';
    Object.keys(COLOR_MAP).forEach(function(key) {
        var savedColor = userColorData[currentTheme] && userColorData[currentTheme][key];
        var currentColor = savedColor || getDefaultColor(key);
        applyColorVariable(key, currentColor);
    });
    var textKey = currentTheme === 'dark' ? 'textDark' : 'textLight';
    var textColor = (userColorData[currentTheme] && userColorData[currentTheme][textKey]) || (currentTheme === 'dark' ? '#e6edf3' : '#1f2328');
    applyColorVariableForText(textKey, textColor);
    loadFontStyle();
}

function toggleColorMode(targetKey) {
    var cfg = COLOR_MAP[targetKey];
    var inputEl = dom[cfg.input];
    if (!inputEl) return;
    var currentVal = inputEl.value.trim();
    var isHex = currentVal.startsWith('#');
    if (isHex) {
        inputEl.value = hexToRgbString(currentVal);
    } else {
        var hex = rgbStringToHex(currentVal);
        if (hex) inputEl.value = hex;
    }
}

function handleColorChange(key, newColor) {
    var hex = newColor;
    if (newColor.startsWith('rgb')) {
        var converted = rgbStringToHex(newColor);
        if (converted) hex = converted;
    }
    applyColorVariable(key, hex);
    var currentTheme = isDarkTheme() ? 'dark' : 'light';
    if (!userColorData[currentTheme]) userColorData[currentTheme] = {};
    userColorData[currentTheme][key] = hex;
    saveUserColors();
}

function resetAllColors() {
    var currentTheme = isDarkTheme() ? 'dark' : 'light';
    userColorData[currentTheme] = {};
    saveUserColors();
    syncColorUI();
    showAlert('颜色已恢复为默认值', '设置已重置');
}

function handleTextColorChange(key, newColor) {
    var hex = newColor;
    if (newColor.startsWith('rgb')) {
        var converted = rgbStringToHex(newColor);
        if (converted) hex = converted;
    }
    applyColorVariableForText(key, hex);
    var currentTheme = isDarkTheme() ? 'dark' : 'light';
    if (!userColorData[currentTheme]) userColorData[currentTheme] = {};
    userColorData[currentTheme][key] = hex;
    saveUserColors();
}

function applyFontStyle() {
    var root = document.documentElement;
    if (!dom.fontSizeSlider) return;
    var size = dom.fontSizeSlider.value + 'px';
    root.style.setProperty('--cell-font-size', size);
    if (dom.fontSizeValue) dom.fontSizeValue.textContent = dom.fontSizeSlider.value;
    var currentTheme = isDarkTheme() ? 'dark' : 'light';
    if (!userColorData[currentTheme]) userColorData[currentTheme] = {};
    userColorData[currentTheme].fontSize = size;
    saveUserColors();
}

function loadFontStyle() {
    var currentTheme = isDarkTheme() ? 'dark' : 'light';
    var saved = userColorData[currentTheme] || {};
    var fontSize = saved.fontSize || '12px';
    if (dom.fontSizeSlider) dom.fontSizeSlider.value = parseInt(fontSize);
    if (dom.fontSizeValue) dom.fontSizeValue.textContent = parseInt(fontSize);
    applyFontStyle();
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