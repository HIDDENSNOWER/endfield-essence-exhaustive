/**
 * state.js - 全局状态管理
 * 挂载到 App.state，提供 getState/setState 及辅助方法
 *
 * 本模块集中管理应用的全局状态，包括：
 * - 核心数据状态：rows（所有行数据）、theme（主题）、activePanel（当前面板）等
 * - 历史记录：history、historyIndex，用于撤回/重做
 * - 临时操作状态：pendingApply、confirmCallback、各类定时器等
 * - 默认数据集保护基准：baselineRows
 * - 统计排序偏好：statsSortBy、statsSortOrder
 *
 * 通过 App.state 提供的 getter/setter 和辅助方法，
 * 其他模块可以安全地读取和修改状态，避免直接操作内部对象。
 */
(function (App) {
    'use strict';

    // ==================== 初始状态 ====================
    const initialState = {
        rows: [],                 // 行数据：包含12个对象，每个对象有 name 和 data（70列单元格）
        searchQuery: '',          // 搜索关键词（保留字段，当前版本未使用）
        theme: 'light',           // 当前主题：'light' 或 'dark'
        activePanel: 'input',     // 右侧激活面板：'input' | 'record' | 'stats'
        history: [],              // 操作历史记录数组，用于撤回/重做
        historyIndex: -1,         // 当前历史位置索引，-1 表示无操作
        leftPanel: 'table',       // 左侧激活面板：'table' | 'empty'
        rightPanelCollapsed: false, // 右侧面板是否折叠
        selectedRows: App.constants.ROW_NAMES.slice()  // 当前筛选显示的行名列表，默认全部行
    };

    // ==================== 其他全局可变变量 ====================
    // 这些变量不属于核心状态，但需要跨模块访问，因此集中管理

    let pendingApply = null;      // 等待应用的新值信息（数值对比弹窗使用）
    let confirmCallback = null;   // 二次确认弹窗的回调函数
    let clearAllTimer = null;     // 清空确认倒计时定时器
    let clearErrorTimer = null;   // 清空错误提示倒计时定时器
    let deleteConfirmTimer = null; // 删除确认倒计时定时器
    let deleteErrorTimer = null;  // 删除错误提示倒计时定时器
    let highlightedCellElement = null; // 当前高亮的单元格 DOM 元素
    let baselineRows = null;      // 默认数据集保护基准数据（深拷贝的初始行数据）
    let statsSortBy = 'totalMatrix'; // 统计面板排序依据：'totalMatrix' | 'totalT' | 'totalA' | 'unacquired'
    let statsSortOrder = 'desc';  // 统计面板排序方向：'asc' | 'desc'

    // ==================== 状态对象 ====================
    // 基于 initialState 创建实际的状态对象，后续修改都作用于该对象
    const state = { ...initialState };

    // ==================== App.state 接口 ====================
    App.state = {
        /**
         * 获取整个状态对象的引用
         * @returns {Object} 当前状态对象
         */
        getState() {
            return state;
        },

        /**
         * 批量更新状态
         * @param {Object} partial - 需要更新的字段（键值对）
         */
        setState(partial) {
            Object.assign(state, partial);
        },

        // ---------- 核心状态访问器 ----------
        // 提供 rows 的 getter/setter
        get rows() { return state.rows; },
        set rows(val) { state.rows = val; },

        // 提供 theme 的 getter/setter
        get theme() { return state.theme; },
        set theme(val) { state.theme = val; },

        // 提供 activePanel 的 getter/setter
        get activePanel() { return state.activePanel; },
        set activePanel(val) { state.activePanel = val; },

        // 提供 history 的 getter/setter
        get history() { return state.history; },
        set history(val) { state.history = val; },

        // 提供 historyIndex 的 getter/setter
        get historyIndex() { return state.historyIndex; },
        set historyIndex(val) { state.historyIndex = val; },

        // 提供 leftPanel 的 getter/setter
        get leftPanel() { return state.leftPanel; },
        set leftPanel(val) { state.leftPanel = val; },

        // 提供 rightPanelCollapsed 的 getter/setter
        get rightPanelCollapsed() { return state.rightPanelCollapsed; },
        set rightPanelCollapsed(val) { state.rightPanelCollapsed = val; },

        // 提供 selectedRows 的 getter/setter
        get selectedRows() { return state.selectedRows; },
        set selectedRows(val) { state.selectedRows = val; },

        // ---------- 其他全局变量访问器 ----------
        // 提供 pendingApply 的 getter/setter（数值对比弹窗使用）
        get pendingApply() { return pendingApply; },
        set pendingApply(val) { pendingApply = val; },

        // 提供 confirmCallback 的 getter/setter（二次确认弹窗使用）
        get confirmCallback() { return confirmCallback; },
        set confirmCallback(val) { confirmCallback = val; },

        // 清空确认倒计时定时器
        get clearAllTimer() { return clearAllTimer; },
        set clearAllTimer(val) { clearAllTimer = val; },

        // 清空错误提示倒计时定时器
        get clearErrorTimer() { return clearErrorTimer; },
        set clearErrorTimer(val) { clearErrorTimer = val; },

        // 删除确认倒计时定时器
        get deleteConfirmTimer() { return deleteConfirmTimer; },
        set deleteConfirmTimer(val) { deleteConfirmTimer = val; },

        // 删除错误提示倒计时定时器
        get deleteErrorTimer() { return deleteErrorTimer; },
        set deleteErrorTimer(val) { deleteErrorTimer = val; },

        // 当前高亮的单元格元素
        get highlightedCellElement() { return highlightedCellElement; },
        set highlightedCellElement(val) { highlightedCellElement = val; },

        // 默认数据集保护基准数据
        get baselineRows() { return baselineRows; },
        set baselineRows(val) { baselineRows = val; },

        // 统计排序依据
        get statsSortBy() { return statsSortBy; },
        set statsSortBy(val) { statsSortBy = val; },

        // 统计排序方向
        get statsSortOrder() { return statsSortOrder; },
        set statsSortOrder(val) { statsSortOrder = val; },

        // ---------- 辅助方法 ----------
        /**
         * 判断当前是否为暗色主题
         * @returns {boolean} 是暗色主题返回 true，否则 false
         */
        isDarkTheme() {
            return state.theme === 'dark';
        },

        /**
         * 重置历史记录（清空 history 并复位索引）
         */
        resetHistory() {
            state.history = [];
            state.historyIndex = -1;
        }
    };

})(window.App = window.App || {});