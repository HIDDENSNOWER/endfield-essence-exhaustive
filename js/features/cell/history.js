/**
 * history.js - 撤回/重做功能
 * 挂载到 App.history
 *
 * 本模块负责管理操作历史记录，实现撤回（Undo）和重做（Redo）功能：
 * - pushHistory：将一次单元格修改操作（旧值→新值）记录到历史栈中
 * - undo：撤回上一步操作，恢复到旧值
 * - redo：重做下一步操作，重新应用新值
 * - updateUndoRedoButtons：根据当前历史位置更新按钮禁用状态
 * - bindHistoryEvents：绑定撤回/重做按钮事件
 *
 * 历史记录限制最多保存 20 步，超出后最早记录被移除。
 * 撤回/重做同样受默认数据集保护机制约束，防止恢复到低于基准的状态。
 */
(function (App) {
    'use strict';

    App.history = {
        /**
         * 将操作记录推入历史
         * @param {number} rowIdx - 行索引
         * @param {number} colIndex - 全局列索引
         * @param {Object} oldCell - 修改前的单元格数据
         * @param {Object} newCell - 修改后的单元格数据
         *
         * 功能：在历史栈中添加一条操作记录，包含位置信息和前后数据。
         * 同时清除当前位置之后的所有记录（因为新操作会使重做分支失效），
         * 并限制历史长度不超过 20 步。
         */
        pushHistory(rowIdx, colIndex, oldCell, newCell) {
            const state = App.state;
            // 截断当前位置之后的历史（如果之前执行过撤回，此时重做分支被清除）
            state.history = state.history.slice(0, state.historyIndex + 1);
            // 添加新记录，深度拷贝以避免引用问题
            state.history.push({
                rowIdx,
                colIndex,
                oldCell: JSON.parse(JSON.stringify(oldCell)), // 旧值深拷贝
                newCell: JSON.parse(JSON.stringify(newCell))  // 新值深拷贝
            });

            // 限制历史长度：最多保留20步
            if (state.history.length > 20) {
                // 超出限制，移除最早记录
                state.history.shift();
                // 注意：移除后 historyIndex 不变，仍指向当前最后一条
                // 无需额外调整，因为 shift 后所有索引自动前移
            } else {
                // 未超出限制，索引后移
                state.historyIndex++;
            }

            // 更新按钮状态
            this.updateUndoRedoButtons();
        },

        /**
         * 撤回上一步操作
         *
         * 功能：将当前位置的单元格数据恢复为操作前的旧值。
         * - 检查是否有可撤回的记录（historyIndex >= 0）
         * - 检查撤回后是否违反默认数据集保护
         * - 恢复旧值，更新表格和保存数据，更新按钮状态
         * - 弹出提示显示撤回详情
         */
        undo() {
            const state = App.state;
            // 如果没有历史记录，无法撤回
            if (state.historyIndex < 0) return;

            // 获取当前待撤回的记录
            const record = state.history[state.historyIndex];

            // 检查撤回是否会导致数据低于基准
            if (!App.datasetManager.isCellOperationAllowed(record.rowIdx, record.colIndex, record.oldCell)) {
                App.modal.showAlert('该撤回操作会导致数据低于基准状态，已阻止。', '撤回限制');
                return;
            }

            // 恢复为旧值（深拷贝）
            state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.oldCell));
            state.historyIndex--; // 索引前移

            // 刷新界面并保存
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            this.updateUndoRedoButtons();

            // 构建提示信息
            const names = App.utils.getCellNames(record.rowIdx, record.colIndex);
            const oldT = record.oldCell.t, oldA = record.oldCell.a; // 旧值状态
            const newT = record.newCell.t, newA = record.newCell.a; // 新值状态（撤回前的状态）
            App.modal.showAlert(
                `已撤回：${names.rowName} > ${names.groupName} > ${names.subName} (重复${newT} → ${oldT}, 拥有${newA} → ${oldA})`,
                '撤回成功'
            );
        },

        /**
         * 重做下一步操作
         *
         * 功能：将当前位置的单元格数据重新应用为操作后的新值。
         * - 检查是否有可重做的记录（historyIndex < history.length - 1）
         * - 检查重做后是否违反默认数据集保护
         * - 应用新值，更新表格和保存数据，更新按钮状态
         * - 弹出提示显示重做详情
         */
        redo() {
            const state = App.state;
            // 如果没有可重做的记录，直接返回
            if (state.historyIndex >= state.history.length - 1) return;

            state.historyIndex++; // 索引后移
            const record = state.history[state.historyIndex];

            // 检查重做是否会导致数据低于基准
            if (!App.datasetManager.isCellOperationAllowed(record.rowIdx, record.colIndex, record.newCell)) {
                App.modal.showAlert('该重做操作会导致数据低于基准状态，已阻止。', '重做限制');
                state.historyIndex--; // 回退索引
                return;
            }

            // 应用新值（深拷贝）
            state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.newCell));

            // 刷新界面并保存
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            this.updateUndoRedoButtons();

            // 构建提示信息
            const names = App.utils.getCellNames(record.rowIdx, record.colIndex);
            const oldT = record.oldCell.t, oldA = record.oldCell.a; // 旧值状态
            const newT = record.newCell.t, newA = record.newCell.a; // 新值状态
            App.modal.showAlert(
                `已重做：${names.rowName} > ${names.groupName} > ${names.subName} (重复${oldT} → ${newT}, 拥有${oldA} → ${newA})`,
                '重做成功'
            );
        },

        /**
         * 更新撤回/重做按钮禁用状态
         *
         * 根据当前历史位置判断：
         * - 撤回按钮：当 historyIndex < 0（无历史）时禁用
         * - 重做按钮：当 historyIndex >= history.length - 1（已在最新）时禁用
         */
        updateUndoRedoButtons() {
            App.dom.btnUndo.disabled = App.state.historyIndex < 0;
            App.dom.btnRedo.disabled = App.state.historyIndex >= App.state.history.length - 1;
        },

        /**
         * 绑定撤回/重做事件
         * 由 events.js 统一调用
         */
        bindHistoryEvents() {
            if (App.dom.btnUndo) App.dom.btnUndo.addEventListener('click', () => this.undo());
            if (App.dom.btnRedo) App.dom.btnRedo.addEventListener('click', () => this.redo());
        }
    };

})(window.App = window.App || {});