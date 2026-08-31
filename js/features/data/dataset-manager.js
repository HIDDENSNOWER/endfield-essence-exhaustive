/**
 * dataset-manager.js - 数据集管理（CRUD、切换、保护、锁 UI）
 * 挂载到 App.datasetManager
 *
 * 本模块负责数据集的全生命周期管理：
 * - updateDatasetSelect：更新数据集下拉框选项
 * - updateDatasetDisplay：更新当前数据集名称显示
 * - switchDataset：切换到指定数据集
 * - saveData：保存当前数据到 localStorage
 * - loadData：从 localStorage 加载当前数据集
 * - saveBaseline：保存默认数据集的基准数据（用于保护）
 * - isCellOperationAllowed：检查单元格操作是否被默认数据集保护允许
 * - updateLockedUI：更新受保护状态下的 UI
 * - createNewDataset / confirmNewDataset：新建数据集
 * - renameDataset / confirmRenameDataset：重命名数据集
 * - deleteDataset / confirmDeleteDataset：删除数据集
 * - resetDefaultDataset：重置默认数据集（重新获取初始数据）
 * - bindDatasetManagerEvents：绑定所有相关事件
 *
 * 注意：默认数据集和示例数据集受保护，不可删除或清空；
 * 默认数据集还受到"只增不减"的保护，防止用户破坏初始数据。
 */
(function (App) {
    'use strict';

    App.datasetManager = {
        /**
         * 更新数据集选择下拉框
         *
         * 根据当前数据集列表和当前选中项，重新生成下拉框选项。
         * - 确保当前数据集在列表中
         * - 受保护数据集显示 🔒 标记
         * - 删除按钮在选中受保护数据集时禁用
         */
        updateDatasetSelect() {
            const list = App.storage.getDatasetList();
            const currentKey = App.storage.loadCurrentDatasetKey();
            // 如果当前数据集不在列表中，先添加
            if (!list.includes(currentKey)) App.storage.addDatasetKey(currentKey);

            // 生成选项 HTML，受保护数据集加锁标记
            App.dom.datasetSelect.innerHTML = list.map(k => {
                const label = App.constants.PROTECTED_DATASETS.includes(k) ? k + ' 🔒' : k;
                return `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${label}</option>`;
            }).join('');

            // 删除按钮状态：当前数据集受保护时禁用
            if (App.dom.btnDeleteDataset) {
                App.dom.btnDeleteDataset.disabled = App.constants.PROTECTED_DATASETS.includes(currentKey);
            }
        },

        /**
         * 更新数据集名称显示
         * 将当前数据集名称显示在面板的 datasetName 元素中
         */
        updateDatasetDisplay() {
            App.dom.datasetName.textContent = App.storage.loadCurrentDatasetKey();
        },

        /**
         * 切换到指定数据集
         * @param {string} key - 目标数据集名称
         *
         * 功能：
         * - 保存当前数据集键
         * - 如果目标数据集不存在，则创建（示例数据集用随机数据，其他用空数据）
         * - 加载目标数据到 state.rows
         * - 更新界面、下拉框、备注、锁定状态
         */
        switchDataset(key) {
            const currentKey = App.storage.loadCurrentDatasetKey();
            // 如果目标与当前相同，无操作
            if (key === currentKey) return;

            // 保存新数据集键
            App.storage.saveCurrentDatasetKey(key);

            // 确保数据集存在：不存在则创建
            const list = App.storage.getDatasetList();
            if (!list.includes(key)) {
                if (key === App.constants.SAMPLE_DATASET_KEY) {
                    // 示例数据集使用随机填充数据
                    App.storage.setJSON(key, App.dataModel.createSampleRows());
                } else {
                    // 普通新数据集使用空数据
                    App.storage.setJSON(key, App.dataModel.createInitialRows());
                }
                App.storage.addDatasetKey(key);
            }

            // 加载数据，失败则使用空数据
            if (!this.loadData()) {
                App.state.rows = App.dataModel.createInitialRows();
                this.saveData();
            }

            // 示例数据集特殊处理：重新生成随机数据并立即渲染
            if (key === App.constants.SAMPLE_DATASET_KEY) {
                App.state.rows = App.dataModel.createSampleRows();
                App.tableRenderer.renderAllTables();
            }

            // 如果是默认数据集且基准尚未保存，保存基准
            if (key === App.constants.DEFAULT_STORAGE_KEY && !App.state.baselineRows) {
                this.saveBaseline();
            }

            // 更新界面
            this.updateDatasetDisplay();
            this.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.dom.inputHint.textContent = '已切换到数据集: ' + key;
            App.storage.saveCurrentDatasetKey(key);

            // 更新备注显示（如果模块存在）
            if (typeof App.datasetRemark.updateDatasetRemark === 'function') App.datasetRemark.updateDatasetRemark();
            // 更新锁定 UI
            this.updateLockedUI();
        },

        /**
         * 保存当前数据到 localStorage
         *
         * 将 state.rows 序列化后存储到当前数据集键下，
         * 并确保数据集在列表中。
         */
        saveData() {
            const currentKey = App.storage.loadCurrentDatasetKey();
            App.storage.setJSON(currentKey, App.state.rows);
            App.storage.addDatasetKey(currentKey);
            this.updateDatasetSelect(); // 刷新下拉框
        },

        /**
         * 从 localStorage 加载当前数据集
         * @returns {boolean} 是否成功
         *
         * 读取当前数据集键对应的数据，验证格式后赋给 state.rows。
         * 格式要求：数组，且第一个元素有 name 和 data 属性。
         */
        loadData() {
            const currentKey = App.storage.loadCurrentDatasetKey();
            const saved = App.storage.getJSON(currentKey, null);
            if (saved && Array.isArray(saved) && saved.length > 0 && saved[0].name && Array.isArray(saved[0].data)) {
                // 逐行标准化数据
                App.state.rows = saved.map(row => ({
                    name: row.name,
                    data: row.data.map(App.utils.normalizeCell)
                }));
                App.storage.addDatasetKey(currentKey);
                return true;
            }
            return false;
        },

        /**
         * 保存默认数据集基准
         *
         * 仅在当前数据集为默认数据集时执行。
         * 将 DEFAULT_ROWS（外部加载的初始数据）保存到 baselineRows，
         * 作为保护机制的参照基准。
         */
        saveBaseline() {
            if (App.storage.loadCurrentDatasetKey() !== App.constants.DEFAULT_STORAGE_KEY) return;
            if (typeof DEFAULT_ROWS !== 'undefined' && Array.isArray(DEFAULT_ROWS)) {
                // 使用外部加载的默认数据
                App.state.baselineRows = DEFAULT_ROWS.map(row => ({
                    name: row.name,
                    data: row.data.map(App.utils.normalizeCell)
                }));
            } else {
                // 极端情况：使用当前状态作为基准
                App.state.baselineRows = JSON.parse(JSON.stringify(App.state.rows));
            }
        },

        /**
         * 检查单元格操作是否被默认数据集保护允许
         * @param {number} rowIdx - 行索引
         * @param {number} colIndex - 全局列索引
         * @param {Object} newCell - 操作后的新单元格数据
         * @returns {boolean} 是否允许
         *
         * 规则（仅对默认数据集生效）：
         * - 若基准数据该单元格有数值 v，则新值必须与基准相同（不允许修改或清除）
         * - 若基准数据该单元格有重复数 t，则新重复数不能小于基准
         * - 若基准数据该单元格有获取数 a，则新获取数不能小于基准
         * - 非默认数据集一律允许
         */
        isCellOperationAllowed(rowIdx, colIndex, newCell) {
            if (App.storage.loadCurrentDatasetKey() !== App.constants.DEFAULT_STORAGE_KEY) return true;
            if (!App.state.baselineRows) return true;
            const baseCell = App.state.baselineRows[rowIdx].data[colIndex];

            // 数值 v 不允许变为空或不同值
            if (baseCell.v !== '' && newCell.v !== baseCell.v) return false;
            // 重复数 t 不允许减少
            if (baseCell.t > 0 && newCell.t < baseCell.t) return false;
            // 获取数 a 不允许减少
            if (baseCell.a > 0 && newCell.a < baseCell.a) return false;

            return true;
        },

        /**
         * 更新默认数据集保护状态下的 UI
         *
         * - 禁用清除、清空相关按钮
         * - 显示/隐藏重置同步按钮
         * - 更新提示文字
         */
        updateLockedUI() {
            const locked = (App.storage.loadCurrentDatasetKey() === App.constants.DEFAULT_STORAGE_KEY);
            const dom = App.dom;

            // 禁用相关按钮（受保护时不可清除或清空）
            dom.btnClearCell.disabled = locked;
            dom.btnClearAll.disabled = locked;
            dom.btnRecordClear.disabled = locked;

            // 重置同步按钮只在默认数据集时显示
            if (dom.btnResetSync) {
                dom.btnResetSync.style.display = locked ? '' : 'none';
            }

            // 更新提示文字
            if (locked) {
                dom.inputHint.textContent = '🔒 默认数据集已保护：可增加，不可减少或清除已有数据';
                dom.recordHint.textContent = '🔒 可添加新条目或增加已有实装';
            } else {
                dom.inputHint.textContent = '准备就绪';
                dom.recordHint.textContent = '';
            }
        },

        /**
         * 新建数据集
         *
         * 打开新建数据集弹窗，清空输入框并聚焦。
         */
        createNewDataset() {
            App.dom.newDatasetName.value = '';
            App.modal.openModal(App.dom.modalNewDataset);
            setTimeout(() => App.dom.newDatasetName.focus(), 100);
        },

        /**
         * 确认新建数据集
         *
         * 校验名称非空且不重复，创建空数据集并切换过去。
         */
        confirmNewDataset() {
            const name = App.dom.newDatasetName.value.trim();
            if (!name) { App.modal.showAlert('数据集名称不能为空。'); return; }
            if (App.storage.getDatasetList().includes(name)) { App.modal.showAlert('该数据集名称已存在，请使用其他名称。'); return; }

            // 创建空数据
            const empty = App.dataModel.createInitialRows();
            App.storage.setJSON(name, empty);
            App.storage.addDatasetKey(name);
            App.storage.saveCurrentDatasetKey(name);
            App.state.rows = JSON.parse(JSON.stringify(empty));

            // 更新界面
            this.updateDatasetDisplay();
            this.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.modal.closeModal(App.dom.modalNewDataset);
            App.dom.inputHint.textContent = `已创建新数据集: ${name}`;
        },

        /**
         * 重命名数据集
         *
         * 打开重命名弹窗，显示当前名称并聚焦输入框。
         */
        renameDataset() {
            App.dom.renameOldName.textContent = App.storage.loadCurrentDatasetKey();
            App.dom.renameDatasetName.value = '';
            App.modal.openModal(App.dom.modalRenameDataset);
            setTimeout(() => App.dom.renameDatasetName.focus(), 100);
        },

        /**
         * 确认重命名数据集
         *
         * 校验新名称非空、与旧名不同、不与其他数据集重复。
         * 迁移数据到新键，更新列表和显示。
         */
        confirmRenameDataset() {
            const newName = App.dom.renameDatasetName.value.trim();
            const oldKey = App.storage.loadCurrentDatasetKey();
            if (!newName) { App.modal.showAlert('新名称不能为空。'); return; }
            if (newName === oldKey) { App.modal.closeModal(App.dom.modalRenameDataset); return; }
            if (App.storage.getDatasetList().includes(newName)) { App.modal.showAlert('该名称已存在，请使用其他名称。'); return; }

            // 迁移数据
            const data = App.storage.get(oldKey);
            App.storage.set(newName, data || '[]');
            App.storage.removeDatasetKey(oldKey);
            App.storage.addDatasetKey(newName);
            App.storage.saveCurrentDatasetKey(newName);
            this.saveData();

            this.updateDatasetDisplay();
            this.updateDatasetSelect();
            App.modal.closeModal(App.dom.modalRenameDataset);
            App.dom.inputHint.textContent = `已重命名为: ${newName}`;
        },

        /**
         * 删除数据集（入口）
         *
         * 检查是否受保护、是否至少保留一个数据集，
         * 然后打开删除确认弹窗（带倒计时和文字确认）。
         */
        deleteDataset() {
            const currentKey = App.storage.loadCurrentDatasetKey();
            if (App.constants.PROTECTED_DATASETS.includes(currentKey)) {
                App.modal.showAlert('系统数据集不可删除。', '操作阻止');
                return;
            }
            const list = App.storage.getDatasetList();
            if (list.length <= 1) { App.modal.showAlert('至少需要保留一个数据集。', '无法删除'); return; }
            // 调用 cell-record 中的删除确认弹窗
            App.cellRecord.openDeleteConfirmModal();
        },

        /**
         * 确认删除数据集
         *
         * 执行实际删除：移除数据、从列表移除、切换到剩余数据集。
         */
        confirmDeleteDataset() {
            const currentKey = App.storage.loadCurrentDatasetKey();
            if (App.constants.PROTECTED_DATASETS.includes(currentKey)) {
                App.modal.showAlert('系统数据集不可删除。', '操作阻止');
                App.modal.closeModal(App.dom.modalDeleteDataset);
                return;
            }

            // 删除数据
            App.storage.remove(currentKey);
            App.storage.removeDatasetKey(currentKey);

            // 切换到剩余的第一个数据集
            const remaining = App.storage.getDatasetList();
            const newKey = remaining[0] || App.constants.DEFAULT_STORAGE_KEY;
            App.storage.saveCurrentDatasetKey(newKey);
            if (!this.loadData()) {
                App.state.rows = App.dataModel.createInitialRows();
                this.saveData();
            }

            this.updateDatasetDisplay();
            this.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.modal.closeModal(App.dom.modalDeleteDataset);
            App.dom.inputHint.textContent = '已删除，切换至: ' + newKey;
        },

        /**
         * 重置默认数据集（由 events.js 绑定按钮）
         *
         * 重新从外部 data.json 获取默认数据，覆盖用户对默认数据集的修改。
         * 只在当前数据集为默认数据集时可用。
         */
        resetDefaultDataset() {
            if (App.storage.loadCurrentDatasetKey() !== App.constants.DEFAULT_STORAGE_KEY) {
                App.modal.showAlert('当前不是默认数据集，无需重置。', '提示');
                return;
            }

            // 弹出确认对话框
            App.modal.showConfirmDialog(
                '将默认数据集重置为初始数据，所有用户添加或修改的数据都将丢失，确定继续吗？',
                () => {
                    // 用户确认后开始加载
                    App.defaultLoader.showDefaultDatasetLoading('正在重新获取默认数据集...');
                    App.defaultLoader.loadDefaultDataset((percent, message) => {
                        App.defaultLoader.updateDefaultDatasetProgress(percent, message);
                    }).then(defaultRows => {
                        if (!Array.isArray(defaultRows) || defaultRows.length === 0) {
                            App.defaultLoader.hideDefaultDatasetLoading();
                            App.modal.showAlert('默认数据为空，无法重置。', '错误');
                            return;
                        }
                        // 应用新数据
                        App.state.rows = defaultRows.map(row => ({
                            name: row.name,
                            data: row.data.map(App.utils.normalizeCell)
                        }));
                        this.saveData();
                        App.tableRenderer.renderAllTables();
                        DEFAULT_ROWS = defaultRows;
                        this.saveBaseline();
                        this.updateLockedUI();
                        App.defaultLoader.hideDefaultDatasetLoading();
                        App.modal.showTemporaryHint('默认数据集已重置', 'success');
                        App.dom.inputHint.textContent = '默认数据集已重置为初始数据。';
                    }).catch(e => {
                        App.defaultLoader.hideDefaultDatasetLoading();
                        console.warn('默认数据加载失败，无法重置', e);
                        App.modal.showAlert('默认数据加载失败，请刷新页面后重试。', '错误');
                    });
                },
                () => { App.dom.inputHint.textContent = '已取消重置。'; },
                '重置默认数据集'
            );
        },

        /**
         * 绑定数据集管理相关事件
         * 由 events.js 统一调用
         */
        bindDatasetManagerEvents() {
            const dom = App.dom;

            // 切换数据集
            if (dom.datasetSelect) {
                dom.datasetSelect.addEventListener('change', () => this.switchDataset(dom.datasetSelect.value));
            }

            // 重置同步按钮
            if (dom.btnResetSync) dom.btnResetSync.addEventListener('click', () => this.resetDefaultDataset());

            // 新建数据集弹窗相关
            if (dom.btnNewDataset) dom.btnNewDataset.addEventListener('click', () => this.createNewDataset());
            if (dom.btnConfirmNewDataset) dom.btnConfirmNewDataset.addEventListener('click', () => this.confirmNewDataset());
            if (dom.btnCancelNewDataset) dom.btnCancelNewDataset.addEventListener('click', () => App.modal.closeModal(dom.modalNewDataset));
            if (dom.btnCloseNewDataset) dom.btnCloseNewDataset.addEventListener('click', () => App.modal.closeModal(dom.modalNewDataset));
            if (dom.modalNewDataset) dom.modalNewDataset.addEventListener('click', function (e) { if (e.target === this) App.modal.closeModal(dom.modalNewDataset); });
            if (dom.newDatasetName) dom.newDatasetName.addEventListener('keydown', e => { if (e.key === 'Enter') this.confirmNewDataset(); });

            // 重命名数据集弹窗相关
            if (dom.btnRename) dom.btnRename.addEventListener('click', () => this.renameDataset());
            if (dom.btnConfirmRenameDataset) dom.btnConfirmRenameDataset.addEventListener('click', () => this.confirmRenameDataset());
            if (dom.btnCancelRenameDataset) dom.btnCancelRenameDataset.addEventListener('click', () => App.modal.closeModal(dom.modalRenameDataset));
            if (dom.btnCloseRenameDataset) dom.btnCloseRenameDataset.addEventListener('click', () => App.modal.closeModal(dom.modalRenameDataset));
            if (dom.modalRenameDataset) dom.modalRenameDataset.addEventListener('click', function (e) { if (e.target === this) App.modal.closeModal(dom.modalRenameDataset); });
            if (dom.renameDatasetName) dom.renameDatasetName.addEventListener('keydown', e => { if (e.key === 'Enter') this.confirmRenameDataset(); });

            // 删除数据集按钮
            if (dom.btnDeleteDataset) dom.btnDeleteDataset.addEventListener('click', () => this.deleteDataset());
            // 删除确认弹窗事件在 cell-record.js 中绑定
        }
    };

})(window.App = window.App || {});