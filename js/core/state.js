/**
 * state.js - 全局状态管理
 * 挂载到 App.state（业务状态）与 App.uiState（临时 UI 状态）
 *
 * 拆分原则（v0.9.5）：
 *   - App.state：业务数据与跨会话状态（rows / theme / baseline / history / panel / sort）
 *   - App.uiState：临时 UI 状态（弹窗临时数据 / 倒计时定时器 / 高亮 DOM 元素）
 *
 * 提供 getter/setter 与辅助方法，其他模块通过 App.state / App.uiState 安全访问。
 */
(function (App) {
    'use strict';

    // ==================== 业务状态变量 ====================
    const initialState = {
        rows: [],
        theme: 'light',
        activePanel: 'input',
        history: [],
        historyIndex: -1,
        leftPanel: 'table',
        rightPanelCollapsed: false,
        selectedRows: App.constants.ROW_NAMES.slice()
    };

    const state = { ...initialState };

    let baselineRows = null;
    let statsSortBy = 'totalMatrix';
    let statsSortOrder = 'desc';

    // ==================== UI 状态变量 ====================
    let pendingApply = null;
    let confirmCallback = null;
    let clearAllTimer = null;
    let clearErrorTimer = null;
    let deleteConfirmTimer = null;
    let deleteErrorTimer = null;
    let highlightedCellElement = null;

    // ==================== App.state：业务状态 ====================
    App.state = {
        // ---------- 核心状态访问器 ----------
        get rows() { return state.rows; },
        set rows(val) { state.rows = val; },

        get theme() { return state.theme; },
        set theme(val) { state.theme = val; },

        get activePanel() { return state.activePanel; },
        set activePanel(val) { state.activePanel = val; },

        get history() { return state.history; },
        set history(val) { state.history = val; },

        get historyIndex() { return state.historyIndex; },
        set historyIndex(val) { state.historyIndex = val; },

        get leftPanel() { return state.leftPanel; },
        set leftPanel(val) { state.leftPanel = val; },

        get rightPanelCollapsed() { return state.rightPanelCollapsed; },
        set rightPanelCollapsed(val) { state.rightPanelCollapsed = val; },

        get selectedRows() { return state.selectedRows; },
        set selectedRows(val) { state.selectedRows = val; },

        // ---------- 业务辅助变量 ----------
        get baselineRows() { return baselineRows; },
        set baselineRows(val) { baselineRows = val; },

        get statsSortBy() { return statsSortBy; },
        set statsSortBy(val) { statsSortBy = val; },

        get statsSortOrder() { return statsSortOrder; },
        set statsSortOrder(val) { statsSortOrder = val; },

        // ---------- 辅助方法 ----------
        isDarkTheme() {
            return state.theme === 'dark';
        },

        resetHistory() {
            state.history = [];
            state.historyIndex = -1;
        }
    };

    // ==================== App.uiState：临时 UI 状态 ====================
    App.uiState = {
        get pendingApply() { return pendingApply; },
        set pendingApply(val) { pendingApply = val; },

        get confirmCallback() { return confirmCallback; },
        set confirmCallback(val) { confirmCallback = val; },

        get clearAllTimer() { return clearAllTimer; },
        set clearAllTimer(val) { clearAllTimer = val; },

        get clearErrorTimer() { return clearErrorTimer; },
        set clearErrorTimer(val) { clearErrorTimer = val; },

        get deleteConfirmTimer() { return deleteConfirmTimer; },
        set deleteConfirmTimer(val) { deleteConfirmTimer = val; },

        get deleteErrorTimer() { return deleteErrorTimer; },
        set deleteErrorTimer(val) { deleteErrorTimer = val; },

        get highlightedCellElement() { return highlightedCellElement; },
        set highlightedCellElement(val) { highlightedCellElement = val; }
    };

})(window.App = window.App || {});