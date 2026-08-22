/**
 * events.js - 所有事件绑定（统一入口）
 * 包含：主题切换、行筛选、下拉框联动、数据管理、数据集管理、弹窗事件、设置面板、表格底色、面板折叠等
 */

/**
 * 绑定所有事件
 */
function bindEvents() {
    // ========== 主题切换 ==========
    if (dom.btnToggleTheme) {
        dom.btnToggleTheme.addEventListener('click', toggleTheme);
    }

    // ========== 行筛选 ==========
    if (dom.btnRowFilter) {
        dom.btnRowFilter.addEventListener('click', function () {
            renderRowFilterCheckboxes();
            openModal(dom.modalRowFilter);
        });
    }
    if (dom.btnSelectAllRows) {
        dom.btnSelectAllRows.addEventListener('click', function () {
            document.querySelectorAll('#rowFilterCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
            updateSelectedRowsFromCheckboxes();
        });
    }
    if (dom.btnSelectNoneRows) {
        dom.btnSelectNoneRows.addEventListener('click', function () {
            document.querySelectorAll('#rowFilterCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
            updateSelectedRowsFromCheckboxes();
        });
    }
    if (dom.rowFilterCheckboxes) {
        dom.rowFilterCheckboxes.addEventListener('change', function (e) {
            if (e.target && e.target.matches('input[type="checkbox"]')) {
                updateSelectedRowsFromCheckboxes();
            }
        });
    }
    if (dom.btnApplyRowFilter) {
        dom.btnApplyRowFilter.addEventListener('click', function () {
            closeModal(dom.modalRowFilter);
            renderAllTables();
            updateRowFilterButtonLabel();
        });
    }
    if (dom.btnCancelRowFilter) {
        dom.btnCancelRowFilter.addEventListener('click', function () { closeModal(dom.modalRowFilter); });
    }
    if (dom.btnCloseRowFilter) {
        dom.btnCloseRowFilter.addEventListener('click', function () { closeModal(dom.modalRowFilter); });
    }
    if (dom.modalRowFilter) {
        dom.modalRowFilter.addEventListener('click', function (e) {
            if (e.target === this) closeModal(dom.modalRowFilter);
        });
    }

    // ========== 下拉框联动 ==========
    if (dom.inputGroup) {
        dom.inputGroup.addEventListener('change', function () {
            updateSubColOptions(parseInt(dom.inputGroup.value));
        });
    }
    if (dom.recordGroup) {
        dom.recordGroup.addEventListener('change', function () {
            updateRecordSubColOptions(parseInt(dom.recordGroup.value));
        });
    }

    // 启用滚轮切换下拉框
    [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup, dom.datasetSelect]
        .filter(el => el)
        .forEach(enableWheelSelect);

    // ========== 数据管理面板按钮 ==========
    if (dom.btnApplyValue) dom.btnApplyValue.addEventListener('click', applyValue);
    if (dom.btnClearAll) dom.btnClearAll.addEventListener('click', openClearAllModal);
    if (dom.btnRecordApply) dom.btnRecordApply.addEventListener('click', applyRecord);

    // ========== 右侧边栏面板切换 ==========
    dom.sidebarBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            switchPanel(btn.dataset.panel);
        });
    });

    // ========== 数据集管理 ==========
    if (dom.datasetSelect) {
        dom.datasetSelect.addEventListener('change', function () {
            switchDataset(dom.datasetSelect.value);
        });
    }
    if (dom.btnResetSync) dom.btnResetSync.addEventListener('click', resetDefaultDataset);
    if (dom.btnExport) dom.btnExport.addEventListener('click', exportData);
    if (dom.btnImport) dom.btnImport.addEventListener('click', triggerImport);
    if (dom.importFile) {
        dom.importFile.addEventListener('change', function (e) {
            if (e.target.files[0]) {
                importData(e.target.files[0]);
                e.target.value = '';
            }
        });
    }

    // ========== 新建数据集弹窗 ==========
    if (dom.btnNewDataset) dom.btnNewDataset.addEventListener('click', createNewDataset);
    if (dom.btnConfirmNewDataset) dom.btnConfirmNewDataset.addEventListener('click', confirmNewDataset);
    if (dom.btnCancelNewDataset) dom.btnCancelNewDataset.addEventListener('click', () => closeModal(dom.modalNewDataset));
    if (dom.btnCloseNewDataset) dom.btnCloseNewDataset.addEventListener('click', () => closeModal(dom.modalNewDataset));
    if (dom.modalNewDataset) dom.modalNewDataset.addEventListener('click', function (e) { if (e.target === this) closeModal(dom.modalNewDataset); });
    if (dom.newDatasetName) dom.newDatasetName.addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmNewDataset(); });

    // ========== 重命名数据集弹窗 ==========
    if (dom.btnRename) dom.btnRename.addEventListener('click', renameDataset);
    if (dom.btnConfirmRenameDataset) dom.btnConfirmRenameDataset.addEventListener('click', confirmRenameDataset);
    if (dom.btnCancelRenameDataset) dom.btnCancelRenameDataset.addEventListener('click', () => closeModal(dom.modalRenameDataset));
    if (dom.btnCloseRenameDataset) dom.btnCloseRenameDataset.addEventListener('click', () => closeModal(dom.modalRenameDataset));
    if (dom.modalRenameDataset) dom.modalRenameDataset.addEventListener('click', function (e) { if (e.target === this) closeModal(dom.modalRenameDataset); });
    if (dom.renameDatasetName) dom.renameDatasetName.addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmRenameDataset(); });

    // ========== 删除数据集弹窗 ==========
    if (dom.btnDeleteDataset) dom.btnDeleteDataset.addEventListener('click', deleteDataset);
    if (dom.btnConfirmDeleteDataset) dom.btnConfirmDeleteDataset.addEventListener('click', confirmDeleteDataset);
    if (dom.btnCancelDeleteDataset) dom.btnCancelDeleteDataset.addEventListener('click', () => closeModal(dom.modalDeleteDataset));
    if (dom.btnCloseDeleteDataset) dom.btnCloseDeleteDataset.addEventListener('click', () => closeModal(dom.modalDeleteDataset));
    if (dom.modalDeleteDataset) dom.modalDeleteDataset.addEventListener('click', function (e) { if (e.target === this) closeModal(dom.modalDeleteDataset); });

    // ========== 数值对比弹窗 ==========
    if (dom.btnKeepOld) dom.btnKeepOld.addEventListener('click', executeKeepOld);
    if (dom.btnReplaceNew) dom.btnReplaceNew.addEventListener('click', executeReplaceNew);
    if (dom.btnCloseCompare) dom.btnCloseCompare.addEventListener('click', function () {
        closeCompareModal();
        dom.inputHint.textContent = '已取消';
    });
    if (dom.modalCompare) dom.modalCompare.addEventListener('click', function (e) { if (e.target === this) closeCompareModal(); });

    // ========== 二次确认弹窗 ==========
    if (dom.btnCancelConfirm) dom.btnCancelConfirm.addEventListener('click', function () {
        closeConfirmModal();
        openModal(dom.modalCompare);
    });
    if (dom.btnConfirmAction) dom.btnConfirmAction.addEventListener('click', executeConfirmedAction);
    if (dom.btnCloseConfirm) dom.btnCloseConfirm.addEventListener('click', function () {
        closeConfirmModal();
        openModal(dom.modalCompare);
    });
    if (dom.modalConfirm) dom.modalConfirm.addEventListener('click', function (e) {
        if (e.target === this) {
            closeConfirmModal();
            openModal(dom.modalCompare);
        }
    });

    // ========== 全部获取提示弹窗 ==========
    if (dom.btnConfirmFullAcquire) dom.btnConfirmFullAcquire.addEventListener('click', closeFullAcquireModal);
    if (dom.btnCloseFullAcquire) dom.btnCloseFullAcquire.addEventListener('click', closeFullAcquireModal);
    if (dom.modalFullAcquire) dom.modalFullAcquire.addEventListener('click', function (e) { if (e.target === this) closeFullAcquireModal(); });

    // ========== 非法输入弹窗 ==========
    if (dom.btnConfirmIllegal) dom.btnConfirmIllegal.addEventListener('click', closeIllegalModal);
    if (dom.btnCloseIllegal) dom.btnCloseIllegal.addEventListener('click', closeIllegalModal);
    if (dom.modalIllegalInput) dom.modalIllegalInput.addEventListener('click', function (e) { if (e.target === this) closeIllegalModal(); });

    // ========== 通用提示弹窗 ==========
    if (dom.btnConfirmAlert) dom.btnConfirmAlert.addEventListener('click', closeAlert);
    if (dom.btnCloseAlert) dom.btnCloseAlert.addEventListener('click', closeAlert);
    if (dom.modalAlert) dom.modalAlert.addEventListener('click', function (e) { if (e.target === this) closeAlert(); });

    // ========== 通用确认弹窗 ==========
    if (dom.btnConfirmConfirmDialog) dom.btnConfirmConfirmDialog.addEventListener('click', function () {
        closeConfirmDialog();
        if (typeof window.__dialogConfirmCallback === 'function') window.__dialogConfirmCallback();
    });
    if (dom.btnCancelConfirmDialog) dom.btnCancelConfirmDialog.addEventListener('click', function () {
        closeConfirmDialog();
        if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
    });
    if (dom.btnCloseConfirmDialog) dom.btnCloseConfirmDialog.addEventListener('click', function () {
        closeConfirmDialog();
        if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
    });
    if (dom.modalConfirmDialog) dom.modalConfirmDialog.addEventListener('click', function (e) {
        if (e.target === this) {
            closeConfirmDialog();
            if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
        }
    });

    // ========== 录入面板操作 ==========
    if (dom.btnRecordClear) dom.btnRecordClear.addEventListener('click', clearCellRecord);
    if (dom.btnRecordDecrement) dom.btnRecordDecrement.addEventListener('click', decrementRecord);

    // ========== 表格设置：输入框与滑块联动 ==========
    initTableSizeControls();

    // ========== 系统主题变化 ==========
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
    });

    // ========== 撤回/重做/清除 ==========
    if (dom.btnUndo) dom.btnUndo.addEventListener('click', undo);
    if (dom.btnRedo) dom.btnRedo.addEventListener('click', redo);
    if (dom.btnClearCell) dom.btnClearCell.addEventListener('click', clearCurrentCell);

    // 三联输入框滚轮
    [dom.inputVal1, dom.inputVal2, dom.inputVal3].forEach(enableTripleInputScroll);

    // ========== 清空确认弹窗 ==========
    if (dom.btnCancelClearAll) dom.btnCancelClearAll.addEventListener('click', closeClearAllModal);
    if (dom.btnCloseClearAll) dom.btnCloseClearAll.addEventListener('click', closeClearAllModal);
    if (dom.modalClearAll) dom.modalClearAll.addEventListener('click', function (e) { if (e.target === this) closeClearAllModal(); });
    if (dom.btnConfirmClearAll) dom.btnConfirmClearAll.addEventListener('click', executeClearAll);
    if (dom.clearAllInput) dom.clearAllInput.addEventListener('input', checkClearAllButton);

    // ========== 清空错误弹窗 ==========
    if (dom.btnForceCloseError) dom.btnForceCloseError.addEventListener('click', closeClearErrorModal);
    if (dom.btnCloseClearError) dom.btnCloseClearError.addEventListener('click', closeClearErrorModal);
    if (dom.modalClearError) dom.modalClearError.addEventListener('click', function (e) { if (e.target === this) closeClearErrorModal(); });

    // ========== 删除确认弹窗 ==========
    if (dom.btnCancelDeleteConfirm) dom.btnCancelDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
    if (dom.btnCloseDeleteConfirm) dom.btnCloseDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
    if (dom.modalDeleteConfirm) dom.modalDeleteConfirm.addEventListener('click', function (e) { if (e.target === this) closeDeleteConfirmModal(); });
    if (dom.btnConfirmDeleteAction) dom.btnConfirmDeleteAction.addEventListener('click', executeDeleteAction);

    // ========== 删除错误弹窗 ==========
    if (dom.btnForceCloseDeleteError) dom.btnForceCloseDeleteError.addEventListener('click', closeDeleteErrorModal);
    if (dom.btnCloseDeleteError) dom.btnCloseDeleteError.addEventListener('click', closeDeleteErrorModal);
    if (dom.modalDeleteError) dom.modalDeleteError.addEventListener('click', function (e) { if (e.target === this) closeDeleteErrorModal(); });

    if (dom.deleteConfirmInput) dom.deleteConfirmInput.addEventListener('input', function () {});

    // ========== 导出弹窗 ==========
    if (dom.btnCancelExport) dom.btnCancelExport.addEventListener('click', () => closeModal(dom.modalExport));
    if (dom.btnCloseExport) dom.btnCloseExport.addEventListener('click', () => closeModal(dom.modalExport));
    if (dom.modalExport) dom.modalExport.addEventListener('click', function (e) { if (e.target === this) closeModal(dom.modalExport); });
    if (dom.btnConfirmExport) dom.btnConfirmExport.addEventListener('click', doExport);
    if (dom.exportFileName) dom.exportFileName.addEventListener('keydown', function (e) { if (e.key === 'Enter') doExport(); });

    // ========== 高亮更新 ==========
    [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup]
        .filter(el => el)
        .forEach(select => select.addEventListener('change', updateHighlightedCell));

    // ========== 强制刷新 ==========
    if (dom.btnForceRefresh) dom.btnForceRefresh.addEventListener('click', function () {
        window.location.reload(true);
    });

    // ========== 设置弹窗 ==========
    if (dom.btnOpenSettings) dom.btnOpenSettings.addEventListener('click', function () {
        openModal(dom.modalSettingsOverlay);
    });
    if (dom.btnCloseSettingsModal) dom.btnCloseSettingsModal.addEventListener('click', function () { closeModal(dom.modalSettingsOverlay); });
    if (dom.btnCloseSettingsModalBottom) dom.btnCloseSettingsModalBottom.addEventListener('click', function () { closeModal(dom.modalSettingsOverlay); });
    if (dom.modalSettingsOverlay) dom.modalSettingsOverlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal(dom.modalSettingsOverlay);
    });

    // 设置弹窗导航
    if (document.querySelector('.settings-nav-btn')) {
        initSettingsNav();
    }

    // ========== 右侧面板折叠/展开 ==========
    if (dom.btnToggleRightPanel) {
        dom.btnToggleRightPanel.addEventListener('click', function () {
            state.rightPanelCollapsed = !state.rightPanelCollapsed;
            const layout = document.querySelector('.main-layout');
            const collapseIcon = document.getElementById('icon-panel-collapse');
            const expandIcon = document.getElementById('icon-panel-expand');
            if (state.rightPanelCollapsed) {
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
            localStorage.setItem('smarttable_right_collapsed', state.rightPanelCollapsed ? '1' : '0');
        });
    }

    // ========== 表格底色实时更新 ==========
    if (dom.tableBgColorOdd) {
        dom.tableBgColorOdd.addEventListener('input', function () {
            const colors = loadTableBgColors();
            colors.odd = this.value;
            applyTableBgColors(colors);
            saveTableBgColors(colors);
            if (dom.tableBgColorOddValue) dom.tableBgColorOddValue.textContent = colors.odd;
        });
    }
    if (dom.tableBgColorEven) {
        dom.tableBgColorEven.addEventListener('input', function () {
            const colors = loadTableBgColors();
            colors.even = this.value;
            applyTableBgColors(colors);
            saveTableBgColors(colors);
            if (dom.tableBgColorEvenValue) dom.tableBgColorEvenValue.textContent = colors.even;
        });
    }
    if (dom.btnResetTableBgOdd) dom.btnResetTableBgOdd.addEventListener('click', () => resetTableBgColor('odd'));
    if (dom.btnResetTableBgEven) dom.btnResetTableBgEven.addEventListener('click', () => resetTableBgColor('even'));

    // ========== 版本信息弹窗 ==========
    if (dom.btnVersionInfo) dom.btnVersionInfo.addEventListener('click', function () {
        openModal(dom.modalVersionInfo);
    });
    if (dom.btnCloseVersionInfo) dom.btnCloseVersionInfo.addEventListener('click', function () { closeModal(dom.modalVersionInfo); });
    if (dom.btnConfirmVersionInfo) dom.btnConfirmVersionInfo.addEventListener('click', function () { closeModal(dom.modalVersionInfo); });
    if (dom.modalVersionInfo) dom.modalVersionInfo.addEventListener('click', function (e) { if (e.target === this) closeModal(dom.modalVersionInfo); });
}

/**
 * 初始化表格尺寸控件（列宽、行高输入框与滑块联动）
 */
function initTableSizeControls() {
    const colInput = document.getElementById('colWidthInput');
    const colSlider = document.getElementById('colWidthSlider');
    const colValue = document.getElementById('colWidthValue');
    const rowInput = document.getElementById('rowHeightInput');
    const rowSlider = document.getElementById('rowHeightSlider');
    const rowValue = document.getElementById('rowHeightValue');

    if (!colInput || !colSlider || !rowInput || !rowSlider) return;

    /**
     * 应用尺寸设置
     */
    function applySizes() {
        let col = parseInt(colInput.value) || 36;
        let row = parseInt(rowInput.value) || 24;
        col = Math.max(30, Math.min(60, col));
        row = Math.max(20, Math.min(40, row));
        colInput.value = col;
        rowInput.value = row;
        colSlider.value = col;
        rowSlider.value = row;
        if (colValue) colValue.textContent = col;
        if (rowValue) rowValue.textContent = row;
        applyStyle(col, row);
    }

    // 输入框事件
    [colInput, rowInput].forEach(inp => {
        inp.addEventListener('input', applySizes);
        inp.addEventListener('wheel', function (e) {
            e.preventDefault();
            let val = parseInt(this.value) || (this === colInput ? 36 : 24);
            const min = this === colInput ? 30 : 20;
            const max = this === colInput ? 60 : 40;
            val += e.deltaY > 0 ? -1 : 1;
            val = Math.max(min, Math.min(max, val));
            this.value = val;
            applySizes();
        });
    });

    // 滑块事件
    colSlider.addEventListener('input', function () {
        colInput.value = this.value;
        applySizes();
    });
    rowSlider.addEventListener('input', function () {
        rowInput.value = this.value;
        applySizes();
    });
}