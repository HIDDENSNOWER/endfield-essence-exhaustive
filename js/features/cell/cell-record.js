/**
 * cell-record.js - 录入、撤减、清除单元格、清空确认等
 * 挂载到 App.cellRecord
 *
 * 本模块负责数据录入面板的相关操作：
 * - applyRecord：录入实装基质（增加重复数）
 * - decrementRecord：撤减实装基质（减少重复数）
 * - clearCellRecord：清除录入面板当前单元格的实装基质属性
 * - clearCurrentCell：清除数据输入面板当前单元格的数值
 * - openClearAllModal / executeClearAll / clearAllData：清空当前数据集（带倒计时和文字确认）
 * - openClearErrorModal：清空操作输入错误提示
 * - openDeleteConfirmModal / executeDeleteAction：删除数据集（带倒计时和文字确认，由 dataset-manager 调用）
 * - openDeleteErrorModal：删除操作输入错误提示
 * - bindCellRecordEvents：绑定所有相关按钮和弹窗的事件
 *
 * 所有操作都受到默认数据集保护机制的约束，
 * 并通过 App.history 记录操作历史以支持撤回/重做。
 */
(function (App) {
    'use strict';

    App.cellRecord = {
        /**
         * 录入实装基质
         *
         * 功能：在当前选中的单元格上增加一个实装基质记录。
         * - 如果该单元格还没有实装基质（t=0），则创建第一条记录，并根据是否有数值决定 a 的初始值。
         * - 如果已有实装基质（t>0），则只增加重复数 t。
         * - 检查默认数据集保护，防止录入后低于基准。
         * - 更新界面、保存数据、记录历史，并更新撤回/重做按钮状态。
         */
        applyRecord() {
            const dom = App.dom;
            // 获取录入面板选中的副属性、行、词条组索引
            const subIdx = parseInt(dom.recordSubCol.value);
            const rowIdx = parseInt(dom.recordRow.value);
            const groupIdx = parseInt(dom.recordGroup.value);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

            // 计算全局列索引
            const colIndex = App.utils.getColumnIndex(groupIdx, subIdx);
            // 获取并标准化当前单元格
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);
            // 深拷贝旧单元格用于历史记录
            const oldCell = JSON.parse(JSON.stringify(cell));

            let newCell; // 用于检查保护的新单元格结构

            // 根据当前单元格状态决定新单元格结构
            if (cell.t === 0) {
                // 情况1：尚无实装基质
                if (cell.v !== '') {
                    // 原本有普通数值，录入后转为实装基质，已获取数初始为1
                    newCell = { v: '', t: 1, a: 1 };
                } else {
                    // 原本为空，录入后 t=1，a=0（未获取）
                    newCell = { v: '', t: 1, a: 0 };
                }
            } else {
                // 情况2：已有实装基质，重复数加1
                newCell = { v: cell.v, t: cell.t + 1, a: cell.a };
            }

            // 检查默认数据集保护
            if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, newCell)) {
                App.modal.showAlert('默认数据集保护：该录入会导致数据低于基准状态。', '操作限制');
                return;
            }

            // 应用更改到单元格
            if (cell.t === 0) {
                if (cell.v !== '') {
                    // 原本有数值，清空数值并设置 t=1, a=1
                    cell.t = 1;
                    cell.a = 1;
                    cell.v = '';
                } else {
                    cell.t = 1;
                    cell.a = 0;
                }
            } else {
                cell.t += 1;
            }

            // 更新状态、渲染表格、保存数据、记录历史
            App.state.rows[rowIdx].data[colIndex] = cell;
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            App.history.pushHistory(rowIdx, colIndex, oldCell, JSON.parse(JSON.stringify(cell)));

            // 构建提示信息
            const groupName = App.constants.ALL_GROUPS[groupIdx].name;
            const rowName = App.constants.ROW_NAMES[rowIdx];
            const subName = App.constants.ALL_GROUPS[groupIdx].sub[subIdx];
            dom.recordHint.textContent = `已录入：${rowName} > ${groupName} > ${subName} (重复${cell.t}, 拥有${cell.a})`;
            // 更新撤回/重做按钮状态
            App.history.updateUndoRedoButtons();
        },

        /**
         * 撤减一个实装基质
         *
         * 功能：在当前选中的单元格上减少一个实装基质记录。
         * - 如果 t 变为 0，则清空数值 v，并将 a 设为 0。
         * - 如果 t 仍大于 0，则调整 a 不超过 t。
         * - 检查默认数据集保护，防止撤减后低于基准。
         */
        decrementRecord() {
            const dom = App.dom;
            const subIdx = parseInt(dom.recordSubCol.value);
            const rowIdx = parseInt(dom.recordRow.value);
            const groupIdx = parseInt(dom.recordGroup.value);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

            const colIndex = App.utils.getColumnIndex(groupIdx, subIdx);
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);

            // 如果没有实装基质记录，无法撤减
            if (cell.t === 0) {
                App.modal.showAlert('当前单元格无实装基质记录，无法撤减。', '提示');
                return;
            }

            const oldCell = JSON.parse(JSON.stringify(cell));
            const newT = cell.t - 1;                       // 新的重复数
            const newA = Math.min(cell.a, newT);           // 已获取数不超过新的重复数
            const newV = (newT === 0) ? '' : cell.v;       // 如果重复数归零，数值也清空
            const newCell = { v: newV, t: newT, a: newA };

            if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, newCell)) {
                App.modal.showAlert('默认数据集保护：撤减后将低于基准数据，操作被阻止。', '操作限制');
                return;
            }

            // 应用更改
            cell.t = newT;
            cell.a = newA;
            cell.v = newV;
            App.state.rows[rowIdx].data[colIndex] = cell;
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            App.history.pushHistory(rowIdx, colIndex, oldCell, JSON.parse(JSON.stringify(cell)));

            const groupName = App.constants.ALL_GROUPS[groupIdx].name;
            const rowName = App.constants.ROW_NAMES[rowIdx];
            const subName = App.constants.ALL_GROUPS[groupIdx].sub[subIdx];
            dom.recordHint.textContent = `已撤减：${rowName} > ${groupName} > ${subName} (重复${oldCell.t} → ${cell.t}, 拥有${oldCell.a} → ${cell.a})`;
            App.history.updateUndoRedoButtons();
        },

        /**
         * 清除录入面板当前单元格的实装基质属性
         *
         * 功能：将当前单元格重置为完全空的状态（v='', t=0, a=0），
         * 并检查默认数据集保护。
         */
        clearCellRecord() {
            const dom = App.dom;
            const subIdx = parseInt(dom.recordSubCol.value);
            const rowIdx = parseInt(dom.recordRow.value);
            const groupIdx = parseInt(dom.recordGroup.value);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

            const colIndex = App.utils.getColumnIndex(groupIdx, subIdx);
            const emptyCell = App.dataModel.defaultCellMeta(); // 完全空的单元格
            if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, emptyCell)) {
                App.modal.showAlert('默认数据集保护：不能清除已有数据。', '操作限制');
                return;
            }

            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);
            const oldCell = JSON.parse(JSON.stringify(cell));
            App.state.rows[rowIdx].data[colIndex] = emptyCell;
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            App.history.pushHistory(rowIdx, colIndex, oldCell, JSON.parse(JSON.stringify(emptyCell)));

            const groupName = App.constants.ALL_GROUPS[groupIdx].name;
            const rowName = App.constants.ROW_NAMES[rowIdx];
            const subName = App.constants.ALL_GROUPS[groupIdx].sub[subIdx];
            App.modal.showAlert(`已清除：${rowName} > ${groupName} > ${subName} 的全部属性`, '清除成功');
            dom.recordHint.textContent = '已清除所选单元格属性';
            App.history.updateUndoRedoButtons();
        },

        /**
         * 清除数据输入面板当前单元格的数值
         *
         * 功能：
         * - 如果当前单元格是实装基质（t>0 且 v 为空），则调用 clearCellRecord 清除。
         * - 否则，清除数值 v、重复数 t、获取数 a，并检查保护。
         */
        clearCurrentCell() {
            const dom = App.dom;
            const subIdx = parseInt(dom.inputSubCol.value);
            const rowIdx = parseInt(dom.inputRow.value);
            const groupIdx = parseInt(dom.inputGroup.value);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

            const colIndex = App.utils.getColumnIndex(groupIdx, subIdx);
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);

            // 如果是实装基质且无数值，直接调用录入面板的清除
            if (cell.t > 0 && cell.v === '') {
                this.clearCellRecord();
                return;
            }

            const emptyCell = { v: '', t: 0, a: 0 };
            if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, emptyCell)) {
                App.modal.showAlert('默认数据集保护：不能清除已有数值。', '操作限制');
                return;
            }
            if (cell.v === '' && cell.t === 0) {
                App.modal.showAlert('当前单元格无数值，无需清除。', '提示');
                return;
            }

            cell.v = '';
            cell.t = 0;
            cell.a = 0;
            App.state.rows[rowIdx].data[colIndex] = cell;
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();

            const groupName = App.constants.ALL_GROUPS[groupIdx].name;
            const rowName = App.constants.ROW_NAMES[rowIdx];
            const subName = App.constants.ALL_GROUPS[groupIdx].sub[subIdx];
            App.modal.showAlert(`已清除单元格：${rowName} > ${groupName} > ${subName} 的数值。`, '清除成功');
            dom.inputHint.textContent = '当前单元格数值已清除';
        },

        /**
         * 打开清空确认弹窗并启动倒计时
         *
         * 倒计时15秒，期间确认按钮不可用，倒计时结束后必须输入指定文字才能确认。
         */
        openClearAllModal() {
            App.dom.clearAllInput.value = '';
            App.dom.clearAllCountdown.textContent = '15';
            App.dom.btnConfirmClearAll.disabled = true;
            App.modal.openModal(App.dom.modalClearAll);

            // 清除旧的定时器，启动新倒计时
            if (App.state.clearAllTimer) clearInterval(App.state.clearAllTimer);
            let seconds = 15;
            App.state.clearAllTimer = setInterval(() => {
                seconds--;
                App.dom.clearAllCountdown.textContent = seconds;
                this.checkClearAllButton();
                if (seconds <= 0) {
                    clearInterval(App.state.clearAllTimer);
                    App.state.clearAllTimer = null;
                    this.checkClearAllButton();
                }
            }, 1000);
        },

        /**
         * 检查清空确认按钮是否可点击
         * 只有当倒计时归零时才启用
         */
        checkClearAllButton() {
            const timeUp = parseInt(App.dom.clearAllCountdown.textContent) <= 0;
            App.dom.btnConfirmClearAll.disabled = !timeUp;
        },

        /**
         * 关闭清空确认弹窗并停止倒计时
         */
        closeClearAllModal() {
            if (App.state.clearAllTimer) {
                clearInterval(App.state.clearAllTimer);
                App.state.clearAllTimer = null;
            }
            App.modal.closeModal(App.dom.modalClearAll);
        },

        /**
         * 执行清空操作
         * 检查输入文字是否为“我确认清空”，不是则弹出错误弹窗，是则执行清空数据
         */
        executeClearAll() {
            if (App.dom.clearAllInput.value.trim() !== '我确认清空') {
                this.closeClearAllModal();
                this.openClearErrorModal();
                return;
            }
            this.closeClearAllModal();
            this.clearAllData();
        },

        /**
         * 清空当前数据集的所有数据
         * 若为默认数据集且有基准数据，则禁止清空（保护机制）
         */
        clearAllData() {
            // 检查默认数据集是否包含非空基准数据，如果是则阻止清空
            if (App.storage.loadCurrentDatasetKey() === App.constants.DEFAULT_STORAGE_KEY && App.state.baselineRows) {
                for (let r = 0; r < App.state.baselineRows.length; r++) {
                    for (let c = 0; c < App.state.baselineRows[r].data.length; c++) {
                        if (App.state.baselineRows[r].data[c].v !== '' || App.state.baselineRows[r].data[c].t > 0) {
                            App.modal.showAlert('默认数据集包含初始数据，不能清空。', '操作限制');
                            return;
                        }
                    }
                }
            }

            // 将所有行数据重置为空
            App.state.rows.forEach(row => row.data = App.dataModel.createEmptyRowData());
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            App.dom.inputHint.textContent = '当前数据集已清空';
        },

        /**
         * 打开清空操作输入错误提示弹窗（5秒后自动关闭）
         */
        openClearErrorModal() {
            App.dom.errorCountdown.textContent = '5';
            App.modal.openModal(App.dom.modalClearError);

            if (App.state.clearErrorTimer) clearInterval(App.state.clearErrorTimer);
            let seconds = 5;
            App.state.clearErrorTimer = setInterval(() => {
                seconds--;
                App.dom.errorCountdown.textContent = seconds;
                if (seconds <= 0) {
                    clearInterval(App.state.clearErrorTimer);
                    App.state.clearErrorTimer = null;
                    App.modal.closeModal(App.dom.modalClearError);
                }
            }, 1000);
        },

        /**
         * 关闭清空错误提示弹窗
         */
        closeClearErrorModal() {
            if (App.state.clearErrorTimer) {
                clearInterval(App.state.clearErrorTimer);
                App.state.clearErrorTimer = null;
            }
            App.modal.closeModal(App.dom.modalClearError);
        },

        /**
         * 打开删除数据集确认弹窗（由 dataset-manager 调用）
         * 同样具有15秒倒计时和文字确认机制
         */
        openDeleteConfirmModal() {
            App.dom.deleteConfirmDatasetName.textContent = App.storage.loadCurrentDatasetKey();
            App.dom.deleteConfirmInput.value = '';
            App.dom.deleteConfirmCountdown.textContent = '15';
            App.dom.btnConfirmDeleteAction.disabled = true;
            App.modal.openModal(App.dom.modalDeleteConfirm);

            if (App.state.deleteConfirmTimer) clearInterval(App.state.deleteConfirmTimer);
            let seconds = 15;
            App.state.deleteConfirmTimer = setInterval(() => {
                seconds--;
                App.dom.deleteConfirmCountdown.textContent = seconds;
                this.checkDeleteConfirmButton();
                if (seconds <= 0) {
                    clearInterval(App.state.deleteConfirmTimer);
                    App.state.deleteConfirmTimer = null;
                    this.checkDeleteConfirmButton();
                }
            }, 1000);
        },

        /**
         * 检查删除确认按钮是否可点击
         */
        checkDeleteConfirmButton() {
            const timeUp = parseInt(App.dom.deleteConfirmCountdown.textContent) <= 0;
            App.dom.btnConfirmDeleteAction.disabled = !timeUp;
        },

        /**
         * 关闭删除确认弹窗并停止倒计时
         */
        closeDeleteConfirmModal() {
            if (App.state.deleteConfirmTimer) {
                clearInterval(App.state.deleteConfirmTimer);
                App.state.deleteConfirmTimer = null;
            }
            App.modal.closeModal(App.dom.modalDeleteConfirm);
        },

        /**
         * 执行删除操作
         * 检查输入文字是否为“我确认删除”，不是则弹出错误弹窗，是则执行删除
         */
        executeDeleteAction() {
            if (App.dom.deleteConfirmInput.value.trim() !== '我确认删除') {
                this.closeDeleteConfirmModal();
                this.openDeleteErrorModal();
                return;
            }
            this.closeDeleteConfirmModal();
            App.datasetManager.confirmDeleteDataset(); // 调用数据集管理模块完成实际删除
        },

        /**
         * 打开删除操作输入错误提示弹窗（5秒后自动关闭）
         */
        openDeleteErrorModal() {
            App.dom.deleteErrorCountdown.textContent = '5';
            App.modal.openModal(App.dom.modalDeleteError);

            if (App.state.deleteErrorTimer) clearInterval(App.state.deleteErrorTimer);
            let seconds = 5;
            App.state.deleteErrorTimer = setInterval(() => {
                seconds--;
                App.dom.deleteErrorCountdown.textContent = seconds;
                if (seconds <= 0) {
                    clearInterval(App.state.deleteErrorTimer);
                    App.state.deleteErrorTimer = null;
                    App.modal.closeModal(App.dom.modalDeleteError);
                }
            }, 1000);
        },

        /**
         * 关闭删除错误提示弹窗
         */
        closeDeleteErrorModal() {
            if (App.state.deleteErrorTimer) {
                clearInterval(App.state.deleteErrorTimer);
                App.state.deleteErrorTimer = null;
            }
            App.modal.closeModal(App.dom.modalDeleteError);
        },

        /**
         * 绑定录入/撤减/清除/清空/删除确认相关事件
         * 由 events.js 统一调用
         */
        bindCellRecordEvents() {
            const dom = App.dom;
            // 录入面板操作按钮
            if (dom.btnRecordApply) dom.btnRecordApply.addEventListener('click', () => this.applyRecord());
            if (dom.btnRecordDecrement) dom.btnRecordDecrement.addEventListener('click', () => this.decrementRecord());
            if (dom.btnRecordClear) dom.btnRecordClear.addEventListener('click', () => this.clearCellRecord());
            if (dom.btnClearCell) dom.btnClearCell.addEventListener('click', () => this.clearCurrentCell());
            if (dom.btnClearAll) dom.btnClearAll.addEventListener('click', () => this.openClearAllModal());

            // 清空确认弹窗相关
            if (dom.btnCancelClearAll) dom.btnCancelClearAll.addEventListener('click', () => this.closeClearAllModal());
            if (dom.btnCloseClearAll) dom.btnCloseClearAll.addEventListener('click', () => this.closeClearAllModal());
            if (dom.modalClearAll) dom.modalClearAll.addEventListener('click', function (e) { if (e.target === this) App.cellRecord.closeClearAllModal(); });
            if (dom.btnConfirmClearAll) dom.btnConfirmClearAll.addEventListener('click', () => this.executeClearAll());
            if (dom.clearAllInput) dom.clearAllInput.addEventListener('input', () => this.checkClearAllButton());

            // 清空错误弹窗相关
            if (dom.btnForceCloseError) dom.btnForceCloseError.addEventListener('click', () => this.closeClearErrorModal());
            if (dom.btnCloseClearError) dom.btnCloseClearError.addEventListener('click', () => this.closeClearErrorModal());
            if (dom.modalClearError) dom.modalClearError.addEventListener('click', function (e) { if (e.target === this) App.cellRecord.closeClearErrorModal(); });

            // 删除确认弹窗相关
            if (dom.btnCancelDeleteConfirm) dom.btnCancelDeleteConfirm.addEventListener('click', () => this.closeDeleteConfirmModal());
            if (dom.btnCloseDeleteConfirm) dom.btnCloseDeleteConfirm.addEventListener('click', () => this.closeDeleteConfirmModal());
            if (dom.modalDeleteConfirm) dom.modalDeleteConfirm.addEventListener('click', function (e) { if (e.target === this) App.cellRecord.closeDeleteConfirmModal(); });
            if (dom.btnConfirmDeleteAction) dom.btnConfirmDeleteAction.addEventListener('click', () => this.executeDeleteAction());

            // 删除错误弹窗相关
            if (dom.btnForceCloseDeleteError) dom.btnForceCloseDeleteError.addEventListener('click', () => this.closeDeleteErrorModal());
            if (dom.btnCloseDeleteError) dom.btnCloseDeleteError.addEventListener('click', () => this.closeDeleteErrorModal());
            if (dom.modalDeleteError) dom.modalDeleteError.addEventListener('click', function (e) { if (e.target === this) App.cellRecord.closeDeleteErrorModal(); });
        }
    };

})(window.App = window.App || {});