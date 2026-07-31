// events.js - 所有事件绑定（含新元素判空）

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

    // 列宽/行高滑块
    if (dom.colWidthSlider) {
        dom.colWidthSlider.addEventListener('input', function() {
            var val = parseInt(this.value);
            if (dom.colWidthValue) dom.colWidthValue.textContent = val;
            applyStyle(val, parseInt(dom.rowHeightSlider ? dom.rowHeightSlider.value : 24));
        });
    }
    if (dom.rowHeightSlider) {
        dom.rowHeightSlider.addEventListener('input', function() {
            var val = parseInt(this.value);
            if (dom.rowHeightValue) dom.rowHeightValue.textContent = val;
            applyStyle(parseInt(dom.colWidthSlider ? dom.colWidthSlider.value : 36), val);
        });
    }

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

    // 颜色设置事件
    var colorKeys = ['hasValue', 'statusNone', 'statusPartial', 'statusFull'];
    colorKeys.forEach(function(key) {
        var cfg = COLOR_MAP[key];
        if (dom[cfg.picker]) {
            dom[cfg.picker].addEventListener('input', function(e) {
                handleColorChange(key, e.target.value);
            });
        }
        if (dom[cfg.input]) {
            dom[cfg.input].addEventListener('change', function(e) {
                handleColorChange(key, e.target.value.trim());
            });
        }
        var modeBtns = document.querySelectorAll('.mode-toggle[data-target="' + key + '"]');
        modeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() { toggleColorMode(key); });
        });
    });

    if (dom.btnResetColors) {
        dom.btnResetColors.addEventListener('click', resetAllColors);
    }

    // 主题切换时同步颜色UI
    var originalToggleTheme = toggleTheme;
    toggleTheme = function() {
        originalToggleTheme();
        syncColorUI();
    };

    loadUserColors();
    syncColorUI();

    // 字体颜色事件
    ['textLight', 'textDark'].forEach(function(key) {
        var cfg = TEXT_COLOR_MAP[key];
        if (dom[cfg.picker]) {
            dom[cfg.picker].addEventListener('input', function(e) {
                handleTextColorChange(key, e.target.value);
            });
        }
        if (dom[cfg.input]) {
            dom[cfg.input].addEventListener('change', function(e) {
                handleTextColorChange(key, e.target.value.trim());
            });
        }
        var modeBtns = document.querySelectorAll('.mode-toggle[data-target="' + key + '"]');
        modeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
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
            });
        });
    });

    // 字号设置
    if (dom.fontSizeSlider) {
        dom.fontSizeSlider.addEventListener('input', applyFontStyle);
    }

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
    dom.inputSubCol.addEventListener('change', updateHighlightedCell);
    dom.inputRow.addEventListener('change', updateHighlightedCell);
    dom.inputGroup.addEventListener('change', updateHighlightedCell);
    [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup].forEach(function(select) {
        select.addEventListener('change', updateHighlightedCell);
    });

    // 强制刷新
    dom.btnForceRefresh.addEventListener('click', function() {
        window.location.reload(true);
    });

    // 设置弹窗（仅当元素存在时绑定）
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

    // 设置弹窗内的导航切换（仅当元素存在时调用）
    if (document.querySelector('.settings-nav-btn')) {
        initSettingsNav();
    }
}