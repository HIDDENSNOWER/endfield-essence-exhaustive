// events.js - 所有事件绑定（修复版）

function bindEvents() {
    // 主题与搜索
    dom.btnToggleTheme.addEventListener('click', toggleTheme);
    dom.searchInput.addEventListener('input', function() {
        state.searchQuery = dom.searchInput.value;
        renderAllTables();
    });

    // 下拉框联动
    dom.inputGroup.addEventListener('change', function() {
        updateSubColOptions(parseInt(dom.inputGroup.value));
    });
    dom.recordGroup.addEventListener('change', function() {
        updateRecordSubColOptions(parseInt(dom.recordGroup.value));
    });

    // 启用滚轮切换下拉框
    [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup, dom.datasetSelect].forEach(enableWheelSelect);

    // 数据管理面板按钮
    dom.btnApplyValue.addEventListener('click', applyValue);
    dom.btnClearAll.addEventListener('click', openClearAllModal);
    dom.btnRecordApply.addEventListener('click', applyRecord);

    // 右侧边栏面板切换
    dom.sidebarBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            switchPanel(btn.dataset.panel);
        });
    });

    // 数据集管理按钮
    dom.datasetSelect.addEventListener('change', function() {
        switchDataset(dom.datasetSelect.value);
    });
    if (dom.btnResetSync) {
        dom.btnResetSync.addEventListener('click', resetDefaultDataset);
    }
    dom.btnExport.addEventListener('click', exportData);
    dom.btnImport.addEventListener('click', triggerImport);
    dom.importFile.addEventListener('change', function(e) {
        if (e.target.files[0]) {
            importData(e.target.files[0]);
            e.target.value = '';
        }
    });

    // 新建数据集弹窗
    dom.btnNewDataset.addEventListener('click', createNewDataset);
    dom.btnConfirmNewDataset.addEventListener('click', confirmNewDataset);
    dom.btnCancelNewDataset.addEventListener('click', function() { closeModal(dom.modalNewDataset); });
    dom.btnCloseNewDataset.addEventListener('click', function() { closeModal(dom.modalNewDataset); });
    dom.modalNewDataset.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalNewDataset); });
    dom.newDatasetName.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmNewDataset(); });

    // 重命名数据集弹窗
    dom.btnRename.addEventListener('click', renameDataset);
    dom.btnConfirmRenameDataset.addEventListener('click', confirmRenameDataset);
    dom.btnCancelRenameDataset.addEventListener('click', function() { closeModal(dom.modalRenameDataset); });
    dom.btnCloseRenameDataset.addEventListener('click', function() { closeModal(dom.modalRenameDataset); });
    dom.modalRenameDataset.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalRenameDataset); });
    dom.renameDatasetName.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmRenameDataset(); });

    // 删除数据集弹窗
    dom.btnDeleteDataset.addEventListener('click', deleteDataset);
    dom.btnConfirmDeleteDataset.addEventListener('click', confirmDeleteDataset);
    dom.btnCancelDeleteDataset.addEventListener('click', function() { closeModal(dom.modalDeleteDataset); });
    dom.btnCloseDeleteDataset.addEventListener('click', function() { closeModal(dom.modalDeleteDataset); });
    dom.modalDeleteDataset.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalDeleteDataset); });

    // 数值对比弹窗事件
    dom.btnKeepOld.addEventListener('click', executeKeepOld);
    dom.btnReplaceNew.addEventListener('click', executeReplaceNew);
    dom.btnCloseCompare.addEventListener('click', function() {
        closeCompareModal();
        dom.inputHint.textContent = '已取消';
    });
    dom.modalCompare.addEventListener('click', function(e) { if (e.target === this) closeCompareModal(); });

    // 二次确认弹窗
    dom.btnCancelConfirm.addEventListener('click', function() {
        closeConfirmModal();
        openModal(dom.modalCompare);
    });
    dom.btnConfirmAction.addEventListener('click', executeConfirmedAction);
    dom.btnCloseConfirm.addEventListener('click', function() {
        closeConfirmModal();
        openModal(dom.modalCompare);
    });
    dom.modalConfirm.addEventListener('click', function(e) {
        if (e.target === this) {
            closeConfirmModal();
            openModal(dom.modalCompare);
        }
    });

    // 全部获取提示弹窗
    dom.btnConfirmFullAcquire.addEventListener('click', closeFullAcquireModal);
    dom.btnCloseFullAcquire.addEventListener('click', closeFullAcquireModal);
    dom.modalFullAcquire.addEventListener('click', function(e) { if (e.target === this) closeFullAcquireModal(); });

    // 非法输入弹窗
    dom.btnConfirmIllegal.addEventListener('click', closeIllegalModal);
    dom.btnCloseIllegal.addEventListener('click', closeIllegalModal);
    dom.modalIllegalInput.addEventListener('click', function(e) { if (e.target === this) closeIllegalModal(); });

    // 通用提示弹窗
    dom.btnConfirmAlert.addEventListener('click', closeAlert);
    dom.btnCloseAlert.addEventListener('click', closeAlert);
    dom.modalAlert.addEventListener('click', function(e) { if (e.target === this) closeAlert(); });

    // 通用确认弹窗
    dom.btnConfirmConfirmDialog.addEventListener('click', function() {
        closeConfirmDialog();
        if (typeof window.__dialogConfirmCallback === 'function') window.__dialogConfirmCallback();
    });
    dom.btnCancelConfirmDialog.addEventListener('click', function() {
        closeConfirmDialog();
        if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
    });
    dom.btnCloseConfirmDialog.addEventListener('click', function() {
        closeConfirmDialog();
        if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
    });
    dom.modalConfirmDialog.addEventListener('click', function(e) {
        if (e.target === this) {
            closeConfirmDialog();
            if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
        }
    });

    // 清除录入面板单元格
    dom.btnRecordClear.addEventListener('click', clearCellRecord);
    // 撤减按钮
    if (dom.btnRecordDecrement) {
        dom.btnRecordDecrement.addEventListener('click', decrementRecord);
    }

    // ========== 表格设置：输入框与滑块联动 ==========
    (function() {
        const colInput = document.getElementById('colWidthInput');
        const colSlider = document.getElementById('colWidthSlider');
        const colValue = document.getElementById('colWidthValue');
        const rowInput = document.getElementById('rowHeightInput');
        const rowSlider = document.getElementById('rowHeightSlider');
        const rowValue = document.getElementById('rowHeightValue');

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

        // 输入框事件：直接输入 + 滚轮
        [colInput, rowInput].forEach(inp => {
            inp.addEventListener('input', applySizes);
            inp.addEventListener('wheel', function(e) {
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

        // 滑块事件：拖动同步到输入框
        colSlider.addEventListener('input', function() {
            colInput.value = this.value;
            applySizes();
        });
        rowSlider.addEventListener('input', function() {
            rowInput.value = this.value;
            applySizes();
        });
    })();

    // 系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
    });

    // 撤回/重做
    dom.btnUndo.addEventListener('click', undo);
    dom.btnRedo.addEventListener('click', redo);
    dom.btnClearCell.addEventListener('click', clearCurrentCell);

    // 三联输入框滚轮
    enableTripleInputScroll(dom.inputVal1);
    enableTripleInputScroll(dom.inputVal2);
    enableTripleInputScroll(dom.inputVal3);

    // 清空确认弹窗
    dom.btnCancelClearAll.addEventListener('click', closeClearAllModal);
    dom.btnCloseClearAll.addEventListener('click', closeClearAllModal);
    dom.modalClearAll.addEventListener('click', function(e) { if (e.target === this) closeClearAllModal(); });
    dom.btnConfirmClearAll.addEventListener('click', executeClearAll);
    dom.clearAllInput.addEventListener('input', checkClearAllButton);

    // 清空错误弹窗
    dom.btnForceCloseError.addEventListener('click', closeClearErrorModal);
    dom.btnCloseClearError.addEventListener('click', closeClearErrorModal);
    dom.modalClearError.addEventListener('click', function(e) { if (e.target === this) closeClearErrorModal(); });

    // 删除确认弹窗
    dom.btnCancelDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
    dom.btnCloseDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
    dom.modalDeleteConfirm.addEventListener('click', function(e) { if (e.target === this) closeDeleteConfirmModal(); });
    dom.btnConfirmDeleteAction.addEventListener('click', executeDeleteAction);

    // 删除错误弹窗
    dom.btnForceCloseDeleteError.addEventListener('click', closeDeleteErrorModal);
    dom.btnCloseDeleteError.addEventListener('click', closeDeleteErrorModal);
    dom.modalDeleteError.addEventListener('click', function(e) { if (e.target === this) closeDeleteErrorModal(); });

    dom.deleteConfirmInput.addEventListener('input', function() {});

    // 导出弹窗
    dom.btnCancelExport.addEventListener('click', function() { closeModal(dom.modalExport); });
    dom.btnCloseExport.addEventListener('click', function() { closeModal(dom.modalExport); });
    dom.modalExport.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalExport); });
    dom.btnConfirmExport.addEventListener('click', doExport);
    dom.exportFileName.addEventListener('keydown', function(e) { if (e.key === 'Enter') doExport(); });

    // 高亮更新
    [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup].forEach(function(select) {
        select.addEventListener('change', updateHighlightedCell);
    });

    // 强制刷新
    dom.btnForceRefresh.addEventListener('click', function() {
        window.location.reload(true);
    });

    // 设置弹窗
    if (dom.btnOpenSettings) {
        dom.btnOpenSettings.addEventListener('click', function() {
            openModal(dom.modalSettingsOverlay);
        });
    }
    if (dom.btnCloseSettingsModal) {
        dom.btnCloseSettingsModal.addEventListener('click', function() { closeModal(dom.modalSettingsOverlay); });
    }
    if (dom.btnCloseSettingsModalBottom) {
        dom.btnCloseSettingsModalBottom.addEventListener('click', function() { closeModal(dom.modalSettingsOverlay); });
    }
    if (dom.modalSettingsOverlay) {
        dom.modalSettingsOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal(dom.modalSettingsOverlay);
        });
    }

    // 设置弹窗内的导航切换
    if (document.querySelector('.settings-nav-btn')) {
        initSettingsNav();
    }
    // 右侧面板折叠/展开
    if (dom.btnToggleRightPanel) {
        dom.btnToggleRightPanel.addEventListener('click', function() {
            state.rightPanelCollapsed = !state.rightPanelCollapsed;
            var layout = document.querySelector('.main-layout');
            var collapseIcon = document.getElementById('icon-panel-collapse');
            var expandIcon = document.getElementById('icon-panel-expand');
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
}