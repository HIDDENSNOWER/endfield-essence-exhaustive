/**
 * namespace.js - App 命名空间分层视图
 * 挂载到 App.namespace
 *
 * 为 48 个平铺在 App.* 下的模块提供分层视图：
 *   - App.core.*     ：核心层（constants / state / uiState / dom / utils / dataModel）
 *   - App.services.* ：服务层（storage / modal / imageStore）
 *   - App.features.* ：功能层（所有业务模块）
 *   - App.entry.*    ：入口层（events / layout）
 *
 * 本文件不改变任何模块的挂载点，仅在 App 上新增分层引用。
 * 由 main.js 的 init() 末尾调用 App.namespace.init()，此时所有模块已挂载完成。
 *
 * 后续版本可逐个模块迁移挂载点到 App.<layer>.xxx，最终废弃平铺别名。
 */
(function (App) {
    'use strict';

    App.namespace = {
        /**
         * 初始化分层视图
         * 幂等：重复调用安全（Object.assign 会覆盖同值引用）
         */
        init() {
            App.core = App.core || {};
            App.services = App.services || {};
            App.features = App.features || {};
            App.entry = App.entry || {};

            // ==================== 核心层 ====================
            Object.assign(App.core, {
                constants: App.constants,
                state: App.state,
                uiState: App.uiState,
                dom: App.dom,
                utils: App.utils,
                dataModel: App.dataModel
            });

            // ==================== 服务层 ====================
            Object.assign(App.services, {
                storage: App.storage,
                modal: App.modal,
                imageStore: App.imageStore
            });

            // ==================== 功能层 ====================
            Object.assign(App.features, {
                // data
                datasetManager: App.datasetManager,
                datasetRemark: App.datasetRemark,
                importExport: App.importExport,
                datasetMerge: App.datasetMerge,
                defaultLoader: App.defaultLoader,
                cacheClear: App.cacheClear,
                regionManager: App.regionManager,
                // table
                tableRenderer: App.tableRenderer,
                rowFilter: App.rowFilter,
                stats: App.stats,
                noteSearch: App.noteSearch,
                cellTooltip: App.cellTooltip,
                unacquired: App.unacquired,
                cellAcquireTooltip: App.cellAcquireTooltip,
                cellHighlighter: App.cellHighlighter,
                // cell
                cellValue: App.cellValue,
                cellRecord: App.cellRecord,
                history: App.history,
                // preferences
                theme: App.theme,
                tableStyle: App.tableStyle,
                colorPreview: App.colorPreview,
                interfaceColors: App.interfaceColors,
                schemeManager: App.schemeManager,
                stateColorSchemeManager: App.stateColorSchemeManager,
                storageManager: App.storageManager,
                // note
                note: App.note,
                // keyboard
                keyboard: App.keyboard
            });

            // ==================== 入口层 ====================
            Object.assign(App.entry, {
                events: App.events,
                layout: App.layout
            });
        }
    };

})(window.App = window.App || {});