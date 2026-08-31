/**
 * events.js - 统一事件绑定入口
 * 挂载到 App.events
 */
(function (App) {
    'use strict';

    App.events = {
        /**
         * 绑定所有事件
         */
        bindAllEvents() {
            // 主题切换
            if (App.theme && App.theme.bindThemeEvents) {
                App.theme.bindThemeEvents();
            }

            // 表格样式（尺寸、底色）
            if (App.tableStyle && App.tableStyle.bindTableStyleEvents) {
                App.tableStyle.bindTableStyleEvents();
            }

            // 颜色预览（设置弹窗内）
            if (App.colorPreview && App.colorPreview.bindColorPreviewEvents) {
                App.colorPreview.bindColorPreviewEvents();
            }

            // 行筛选
            if (App.rowFilter && App.rowFilter.bindRowFilterEvents) {
                App.rowFilter.bindRowFilterEvents();
            }

            // 数据集管理
            if (App.datasetManager && App.datasetManager.bindDatasetManagerEvents) {
                App.datasetManager.bindDatasetManagerEvents();
            }

            // 导入导出
            if (App.importExport && App.importExport.bindImportExportEvents) {
                App.importExport.bindImportExportEvents();
            }

            // 数据集备注
            if (App.datasetRemark && App.datasetRemark.bindDatasetRemarkEvents) {
                App.datasetRemark.bindDatasetRemarkEvents();
            }

            // 单元格数值应用
            if (App.cellValue && App.cellValue.bindCellValueEvents) {
                App.cellValue.bindCellValueEvents();
            }

            // 单元格录入、清除等
            if (App.cellRecord && App.cellRecord.bindCellRecordEvents) {
                App.cellRecord.bindCellRecordEvents();
            }

            // 撤回/重做
            if (App.history && App.history.bindHistoryEvents) {
                App.history.bindHistoryEvents();
            }

            // 通用弹窗事件
            if (App.modal && App.modal.bindModalEvents) {
                App.modal.bindModalEvents();
            }

            // 其他全局事件
            this.bindGlobalEvents();
        },

        /**
         * 绑定不属于特定模块的全局事件
         */
        bindGlobalEvents() {
            const dom = App.dom;

            // 右侧面板折叠/展开
            if (dom.btnToggleRightPanel) {
                dom.btnToggleRightPanel.addEventListener('click', function () {
                    App.state.rightPanelCollapsed = !App.state.rightPanelCollapsed;
                    const layout = document.querySelector('.main-layout');
                    const collapseIcon = document.getElementById('icon-panel-collapse');
                    const expandIcon = document.getElementById('icon-panel-expand');
                    if (App.state.rightPanelCollapsed) {
                        layout.classList.add('right-collapsed');
                        collapseIcon.style.display = 'none';
                        expandIcon.style.display = 'inline';
                        this.title = '展开面板';
                    } else {
                        layout.classList.remove('right-collapsed');
                        collapseIcon.style.display = 'inline';
                        expandIcon.style.display = 'none';
                        this.title = '折叠面板';
                    }
                    App.storage.saveRightCollapsed(App.state.rightPanelCollapsed);
                });
            }

            // 右侧面板切换
            if (dom.sidebarBtns) {
                dom.sidebarBtns.forEach(btn => {
                    btn.addEventListener('click', function () {
                        App.layout.switchPanel(this.dataset.panel);
                    });
                });
            }

            // 左侧面板切换
            if (dom.leftSidebarBtns) {
                dom.leftSidebarBtns.forEach(btn => {
                    btn.addEventListener('click', function () {
                        App.layout.switchLeftPanel(this.dataset.leftPanel);
                    });
                });
            }

            // 强制刷新
            if (dom.btnForceRefresh) {
                dom.btnForceRefresh.addEventListener('click', function () {
                    window.location.reload(true);
                });
            }

            // ---------- 下拉框联动 ----------
            if (dom.inputGroup) {
                dom.inputGroup.addEventListener('change', function () {
                    App.utils.updateSubColOptions(parseInt(this.value));
                });
            }
            if (dom.recordGroup) {
                dom.recordGroup.addEventListener('change', function () {
                    App.utils.updateRecordSubColOptions(parseInt(this.value));
                });
            }

            // ---------- 下拉框滚轮切换 ----------
            [
                dom.inputSubCol, dom.inputRow, dom.inputGroup,
                dom.recordSubCol, dom.recordRow, dom.recordGroup,
                dom.datasetSelect
            ].forEach(select => {
                if (select) App.utils.enableWheelSelect(select);
            });

            // ---------- 单元格高亮更新 ----------
            [
                dom.inputSubCol, dom.inputRow, dom.inputGroup,
                dom.recordSubCol, dom.recordRow, dom.recordGroup
            ].forEach(select => {
                if (select) {
                    select.addEventListener('change', function () {
                        App.tableRenderer.updateHighlightedCell();
                    });
                }
            });

            // ---------- 三联输入框滚轮 ----------
            [dom.inputVal1, dom.inputVal2, dom.inputVal3].forEach(input => {
                if (input) App.utils.enableTripleInputScroll(input);
            });

            // ---------- 设置弹窗打开 ----------
            if (dom.btnOpenSettings) {
                dom.btnOpenSettings.addEventListener('click', function () {
                    App.modal.openModal(dom.modalSettingsOverlay);
                    if (App.colorPreview && App.colorPreview.initColorPreview) {
                        App.colorPreview.initColorPreview();
                    }
                });
            }

            // ---------- 设置弹窗关闭 ----------
            if (dom.btnCloseSettingsModal) {
                dom.btnCloseSettingsModal.addEventListener('click', function () {
                    App.modal.closeModal(dom.modalSettingsOverlay);
                });
            }
            if (dom.btnCloseSettingsModalBottom) {
                dom.btnCloseSettingsModalBottom.addEventListener('click', function () {
                    App.modal.closeModal(dom.modalSettingsOverlay);
                });
            }
            if (dom.modalSettingsOverlay) {
                dom.modalSettingsOverlay.addEventListener('click', function (e) {
                    if (e.target === this) {
                        App.modal.closeModal(dom.modalSettingsOverlay);
                    }
                });
            }

            // ---------- 设置弹窗导航 ----------
            if (dom.settingsNavBtns) {
                dom.settingsNavBtns.forEach(btn => {
                    btn.addEventListener('click', function () {
                        dom.settingsNavBtns.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        const panelId = this.dataset.settingsPanel;
                        dom.settingsPanelContents.forEach(p => p.classList.remove('active'));
                        const targetPanel = document.getElementById('settingsPanel' + panelId.charAt(0).toUpperCase() + panelId.slice(1));
                        if (targetPanel) targetPanel.classList.add('active');
                    });
                });
            }

            // ---------- 版本信息弹窗 ----------
            if (dom.btnVersionInfo) {
                dom.btnVersionInfo.addEventListener('click', function () {
                    App.modal.openModal(dom.modalVersionInfo);
                });
            }
            if (dom.btnCloseVersionInfo) {
                dom.btnCloseVersionInfo.addEventListener('click', function () {
                    App.modal.closeModal(dom.modalVersionInfo);
                });
            }
            if (dom.btnConfirmVersionInfo) {
                dom.btnConfirmVersionInfo.addEventListener('click', function () {
                    App.modal.closeModal(dom.modalVersionInfo);
                });
            }
            if (dom.modalVersionInfo) {
                dom.modalVersionInfo.addEventListener('click', function (e) {
                    if (e.target === this) {
                        App.modal.closeModal(dom.modalVersionInfo);
                    }
                });
            }
        }
    };

})(window.App = window.App || {});