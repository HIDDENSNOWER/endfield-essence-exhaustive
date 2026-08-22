/**
 * settings.js - 主题切换、颜色恢复、列宽行高、表格底色、设置导航
 */

// ========== 主题管理 ==========
/**
 * 应用主题
 * @param {string} theme - 'light' 或 'dark'
 */
function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (dom.iconSun) dom.iconSun.style.display = theme === 'dark' ? 'none' : '';
    if (dom.iconMoon) dom.iconMoon.style.display = theme === 'dark' ? '' : 'none';
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    syncColorUI();
    syncTableBgColors();
}

/**
 * 切换主题
 */
function toggleTheme() {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
}

/**
 * 从 localStorage 或系统偏好加载主题
 */
function loadTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) {
        applyTheme(saved);
    } else {
        applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
}

// ========== 用户自定义颜色恢复 ==========
const COLOR_MAP = {
    hasValue:      { var: '--has-value-bg',      defaultLight: '#c8e6c9', defaultDark: '#2a4a35' },
    statusNone:    { var: '--status-none-bg',    defaultLight: '#cfd8dc', defaultDark: '#3a3f47' },
    statusPartial: { var: '--status-partial-bg', defaultLight: '#ffe0b2', defaultDark: '#5a4a28' },
    statusFull:    { var: '--status-full-bg',    defaultLight: '#a5d6a7', defaultDark: '#2e5a3b' }
};

/**
 * 获取指定状态颜色的默认值
 * @param {string} key - 状态键
 * @returns {string} 颜色值
 */
function getDefaultColor(key) {
    const cfg = COLOR_MAP[key];
    return isDarkTheme() ? cfg.defaultDark : cfg.defaultLight;
}

/**
 * 应用存储在 localStorage 中的用户自定义颜色
 */
function applyStoredColors() {
    // 先移除所有状态颜色变量的内联样式，防止旧主题颜色残留
    Object.keys(COLOR_MAP).forEach(key => {
        document.documentElement.style.removeProperty(COLOR_MAP[key].var);
    });

    try {
        const raw = localStorage.getItem('smarttable_user_colors');
        if (!raw) return;
        const data = JSON.parse(raw);
        const theme = isDarkTheme() ? 'dark' : 'light';
        const colors = data[theme];
        if (!colors) return;
        Object.keys(COLOR_MAP).forEach(key => {
            if (colors[key]) {
                document.documentElement.style.setProperty(COLOR_MAP[key].var, colors[key]);
            }
        });
    } catch (e) {
        // 忽略解析错误
    }
}

/**
 * 同步颜色 UI（供主题切换时调用）
 */
function syncColorUI() {
    applyStoredColors();
}

// ========== 列宽/行高设置 ==========
/**
 * 初始化列宽行高设置
 */
function initSettings() {
    let colWidth = 36, rowHeight = 24;
    try {
        const saved = JSON.parse(localStorage.getItem('smarttable_style'));
        if (saved) {
            if (saved.colWidth) colWidth = saved.colWidth;
            if (saved.rowHeight) rowHeight = saved.rowHeight;
        }
    } catch (e) {
        // 忽略解析错误
    }

    if (dom.colWidthInput) dom.colWidthInput.value = colWidth;
    if (dom.colWidthSlider) dom.colWidthSlider.value = colWidth;
    if (dom.rowHeightInput) dom.rowHeightInput.value = rowHeight;
    if (dom.rowHeightSlider) dom.rowHeightSlider.value = rowHeight;
    if (dom.colWidthValue) dom.colWidthValue.textContent = colWidth;
    if (dom.rowHeightValue) dom.rowHeightValue.textContent = rowHeight;

    applyStyle(colWidth, rowHeight);
    syncTableBgColors();
}

/**
 * 应用列宽和行高样式
 * @param {number} colWidth - 列宽（像素）
 * @param {number} rowHeight - 行高（像素）
 */
function applyStyle(colWidth, rowHeight) {
    // 更新 CSS 变量
    document.documentElement.style.setProperty('--col-width', colWidth + 'px');
    document.documentElement.style.setProperty('--row-height', rowHeight + 'px');
    localStorage.setItem('smarttable_style', JSON.stringify({ colWidth, rowHeight }));

    // 设置所有数据列的 <col> 宽度
    document.querySelectorAll('col.data-col').forEach(col => {
        col.style.width = colWidth + 'px';
    });

    // 设置所有单元格高度
    document.querySelectorAll('table tbody td, table thead tr:nth-child(2) th').forEach(cell => {
        cell.style.height = rowHeight + 'px';
    });

    // 设置数据单元格宽度（保险）
    document.querySelectorAll('table tbody td:not(:first-child)').forEach(cell => {
        cell.style.width = colWidth + 'px';
        cell.style.minWidth = colWidth + 'px';
        cell.style.maxWidth = colWidth + 'px';
    });
}

// ========== 表格底色 ==========
const TABLE_BG_STORAGE_KEY = 'smarttable_table_bg';

/**
 * 获取默认表格底色
 * @returns {{odd: string, even: string}}
 */
function getDefaultTableBgColors() {
    return isDarkTheme()
        ? { odd: '#0f1722', even: '#1b2636' }
        : { odd: '#f8fafc', even: '#eaf0f6' };
}

/**
 * 获取存储的表格底色
 * @returns {Object}
 */
function getStoredTableBgColors() {
    try {
        return JSON.parse(localStorage.getItem(TABLE_BG_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

/**
 * 保存表格底色
 * @param {{odd: string, even: string}} colors
 */
function saveTableBgColors(colors) {
    if (typeof colors !== 'object' || colors === null) return;
    const stored = getStoredTableBgColors();
    stored[isDarkTheme() ? 'dark' : 'light'] = { odd: colors.odd, even: colors.even };
    localStorage.setItem(TABLE_BG_STORAGE_KEY, JSON.stringify(stored));
}

/**
 * 应用表格底色到 CSS 变量和实际单元格
 * @param {{odd: string, even: string}} colors
 */
function applyTableBgColors(colors) {
    const defaults = getDefaultTableBgColors();
    const odd = colors.odd || defaults.odd;
    const even = colors.even || defaults.even;
    document.documentElement.style.setProperty('--group-odd-bg', odd);
    document.documentElement.style.setProperty('--group-even-bg', even);
    refreshTableBgColors();
}

/**
 * 刷新主表格中奇偶行单元格背景色
 */
function refreshTableBgColors() {
    const colors = loadTableBgColors();
    // 仅更新主表格区域，避免影响设置弹窗中的预览表格
    document.querySelectorAll('#tableArea td.group-even').forEach(td => {
        td.style.backgroundColor = colors.even;
    });
    document.querySelectorAll('#tableArea td.group-odd').forEach(td => {
        td.style.backgroundColor = colors.odd;
    });
}

/**
 * 加载当前主题下的表格底色（兼容旧格式）
 * @returns {{odd: string, even: string}}
 */
function loadTableBgColors() {
    const stored = getStoredTableBgColors();
    const theme = isDarkTheme() ? 'dark' : 'light';
    const colors = stored[theme];
    const defaults = getDefaultTableBgColors();

    if (typeof colors !== 'object' || colors === null) return defaults;
    return {
        odd: colors.odd || defaults.odd,
        even: colors.even || defaults.even
    };
}

/**
 * 更新设置弹窗中的颜色选择器 UI
 * @param {{odd: string, even: string}} colors
 */
function updateTableBgColorUI(colors) {
    if (dom.tableBgColorOdd) dom.tableBgColorOdd.value = colors.odd;
    if (dom.tableBgColorOddValue) dom.tableBgColorOddValue.textContent = colors.odd;
    if (dom.tableBgColorEven) dom.tableBgColorEven.value = colors.even;
    if (dom.tableBgColorEvenValue) dom.tableBgColorEvenValue.textContent = colors.even;
}

/**
 * 同步表格底色（初始化或主题切换时调用）
 */
function syncTableBgColors() {
    const colors = loadTableBgColors();
    applyTableBgColors(colors);
    updateTableBgColorUI(colors);
}

/**
 * 重置指定类型的表格底色为默认值
 * @param {'odd'|'even'} type
 */
function resetTableBgColor(type) {
    const colors = loadTableBgColors();
    const defaults = getDefaultTableBgColors();
    if (type === 'odd') colors.odd = defaults.odd;
    else if (type === 'even') colors.even = defaults.even;
    saveTableBgColors(colors);
    applyTableBgColors(colors);
    updateTableBgColorUI(colors);
}

// ========== 设置弹窗导航 ==========
/**
 * 初始化设置弹窗内的导航切换
 */
function initSettingsNav() {
    const settingsNavBtns = document.querySelectorAll('.settings-nav-btn');
    settingsNavBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const panelId = this.dataset.settingsPanel;
            settingsNavBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.settings-panel-content').forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById('settingsPanel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}