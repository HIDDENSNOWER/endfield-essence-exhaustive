/**
 * cell-value.js - 数值应用与对比弹窗
 * 挂载到 App.cellValue
 *
 * 本模块负责数据输入面板的数值应用逻辑：
 * - applyValue：应用输入的数值到当前单元格
 * - getSuggestion：比较新旧值，给出保留旧值或替换为新值的建议
 * - showCompareModal：显示数值对比弹窗
 * - closeCompareModal：关闭对比弹窗
 * - applyNewValue：直接应用新值（无对比）
 * - showConfirmModal / closeConfirmModal / executeConfirmedAction：二次确认弹窗管理
 * - executeKeepOld：用户选择保留旧值
 * - executeReplaceNew：用户选择替换为新值
 * - bindCellValueEvents：绑定所有相关按钮和弹窗的事件
 *
 * 数值规则：
 * - 输入框最多三位数字，每位代表不同维度（副属性、行、词条组）。
 * - 若当前单元格已有实装基质（t>0），则输入新数值时只增加获取数。
 * - 否则，若旧值和新值都是三位数字，则弹出对比弹窗，给出建议。
 * - 所有操作均受默认数据集保护机制约束。
 */
(function (App) {
    'use strict';

    App.cellValue = {
        /**
         * 应用数据输入面板中的数值
         *
         * 功能：将数据输入面板中的三个数字输入框的值组合为三位数值，
         * 应用到当前选中的单元格。根据单元格状态执行不同操作：
         * - 全部为空：提示未做更改
         * - 输入不合法：弹出非法输入提示
         * - 单元格已有实装基质：增加获取数
         * - 单元格已有普通数值且新旧值均为三位数字：弹出对比弹窗
         * - 其他情况：直接应用新值
         */
        applyValue() {
            const dom = App.dom;
            // 获取三个输入框的值，并去除首尾空格
            const v1 = dom.inputVal1.value.trim();
            const v2 = dom.inputVal2.value.trim();
            const v3 = dom.inputVal3.value.trim();

            // 如果三个输入框都为空，不做任何操作
            if (v1 === '' && v2 === '' && v3 === '') {
                dom.inputHint.textContent = '输入为空，未做更改。';
                return;
            }

            // 组合为三位字符串
            const combined = v1 + v2 + v3;
            // 校验是否为三位数字
            if (!/^\d{3}$/.test(combined)) {
                App.modal.showIllegalModal('非法输入：每个输入框必须填入一位数字（0‑9），不能有空或其它字符。');
                return;
            }

            // 获取下拉框索引
            const subIdx = parseInt(dom.inputSubCol.value);
            const rowIdx = parseInt(dom.inputRow.value);
            const groupIdx = parseInt(dom.inputGroup.value);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

            // 计算全局列索引
            const colIndex = App.utils.getColumnIndex(groupIdx, subIdx);
            // 获取并标准化当前单元格
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);
            const oldVal = cell.v;             // 旧数值
            const newVal = combined;           // 新数值
            // 获取相关名称，用于提示信息
            const groupName = App.constants.ALL_GROUPS[groupIdx].name;
            const rowName = App.constants.ROW_NAMES[rowIdx];
            const subName = App.constants.ALL_GROUPS[groupIdx].sub[subIdx];

            // 情况1：已有实装基质（t>0），此时输入数值应视为“获取”操作
            if (cell.t > 0) {
                // 如果已全部获取，阻止继续录入
                if (cell.a >= cell.t) {
                    App.modal.showFullAcquireModal(`当前重复词条组合（${rowName} - ${groupName} - ${subName}）已全部获取，请停止录入。`);
                    return;
                }
                // 构造新单元格：v不变，t不变，a+1
                const newCell = { v: cell.v, t: cell.t, a: cell.a + 1 };
                // 检查默认数据集保护
                if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, newCell)) {
                    App.modal.showAlert('默认数据集保护：该操作会导致获取数低于基准。', '操作限制');
                    return;
                }
                // 应用更改
                cell.a += 1;
                App.state.rows[rowIdx].data[colIndex] = cell;
                App.tableRenderer.renderAllTables();
                App.datasetManager.saveData();
                dom.inputHint.textContent = `已获取: ${rowName} > ${groupName} > ${subName} (拥有${cell.a}/${cell.t})`;
                App.utils.resetTripleInputs();
                return;
            }

            // 情况2：普通数值处理（t=0）
            // 如果旧值存在且新旧值都是有效的三位数字，则弹出对比弹窗
            if (oldVal !== '' && App.utils.parseTriple(oldVal) && App.utils.parseTriple(newVal)) {
                const tempNewCell = { v: String(newVal), t: cell.t, a: cell.a };
                if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, tempNewCell)) {
                    App.modal.showAlert('默认数据集保护：不能将原有数值更改为低于基准的值。', '操作限制');
                    return;
                }
                // 显示对比弹窗，让用户选择保留或替换
                this.showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName);
            } else {
                // 情况3：旧值无效或为空，直接应用新值
                const newCell = { v: String(newVal), t: cell.t, a: cell.a };
                if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, newCell)) {
                    App.modal.showAlert('默认数据集保护：不能覆盖或清除已有数值。', '操作限制');
                    return;
                }
                // 直接设置新值
                cell.v = String(newVal);
                App.state.rows[rowIdx].data[colIndex] = cell;
                App.tableRenderer.renderAllTables();
                App.datasetManager.saveData();
                dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
                App.utils.resetTripleInputs();
            }
        },

        /**
         * 比较新旧值，给出建议
         * @param {number[]} oldT - 旧值数字数组
         * @param {number[]} newT - 新值数字数组
         * @returns {{keepOld: boolean, reason: string}}
         *
         * 比较规则（优先级从高到低）：
         * 1. 总和不同：总和大的保留
         * 2. 第三位不同：第三位大的保留
         * 3. 前两位最大值不同：最大值大的保留
         * 4. 完全相同：建议保留原值
         */
        getSuggestion(oldT, newT) {
            const oldSum = App.utils.calcSum(oldT);
            const newSum = App.utils.calcSum(newT);

            // 总和不同
            if (oldSum !== newSum) {
                return {
                    keepOld: oldSum > newSum,
                    reason: `总和 ${oldSum > newSum ? '旧值更大' : '新值更大'}（旧${oldSum} vs 新${newSum}）`
                };
            }

            // 总和相同，比较第三位
            if (oldT[2] !== newT[2]) {
                return {
                    keepOld: oldT[2] > newT[2],
                    reason: `总和相同，第三位 ${oldT[2] > newT[2] ? '旧值更大' : '新值更大'}（旧${oldT[2]} vs 新${newT[2]}）`
                };
            }

            // 总和和第三位相同，比较前两位最大值
            const oldMax = Math.max(oldT[0], oldT[1]);
            const newMax = Math.max(newT[0], newT[1]);
            if (oldMax !== newMax) {
                return {
                    keepOld: oldMax > newMax,
                    reason: `总和及第三位相同，前两位最大值 ${oldMax > newMax ? '旧值更大' : '新值更大'}（旧${oldMax} vs 新${newMax}）`
                };
            }

            // 完全相同
            return { keepOld: true, reason: '各项完全相同，建议保留原值' };
        },

        /**
         * 显示数值对比弹窗
         *
         * 将旧值、新值、建议展示在弹窗中，
         * 并根据建议高亮推荐按钮。
         */
        showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName) {
            const oldT = App.utils.parseTriple(oldVal);
            const newT = App.utils.parseTriple(newVal);

            // 如果新旧值有任何无效，直接应用新值
            if (!oldT || !newT) {
                this.applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName);
                return;
            }

            // 获取建议
            const sug = this.getSuggestion(oldT, newT);
            const dom = App.dom;

            // 重置按钮样式
            dom.btnKeepOld.className = 'btn';
            dom.btnReplaceNew.className = 'btn';

            // 根据建议高亮推荐按钮
            if (sug.keepOld) {
                dom.btnKeepOld.classList.add('btn-success');           // 推荐保留，绿色
                dom.btnReplaceNew.classList.add('btn-outline-gray');   // 非推荐，灰色轮廓
            } else {
                dom.btnReplaceNew.classList.add('btn-success');        // 推荐替换，绿色
                dom.btnKeepOld.classList.add('btn-outline-gray');      // 非推荐，灰色轮廓
            }

            // 构建对比弹窗内容
            dom.compareBody.innerHTML = `
                <div style="display:flex; justify-content:space-around; margin-bottom:12px;">
                    <div style="text-align:center">
                        <div style="font-weight:600; color:var(--text-secondary)">旧值</div>
                        <div style="font-size:1.4rem; font-weight:700">${oldVal}</div>
                        <div style="font-size:0.8rem">${subName}${oldT[0]} | ${rowName}${oldT[1]} | ${groupName}${oldT[2]}</div>
                        <div style="font-size:0.8rem; color:var(--text-tertiary)">总和 ${App.utils.calcSum(oldT)}</div>
                    </div>
                    <div style="text-align:center">
                        <div style="font-weight:600; color:var(--text-secondary)">新值</div>
                        <div style="font-size:1.4rem; font-weight:700">${newVal}</div>
                        <div style="font-size:0.8rem">${subName}${newT[0]} | ${rowName}${newT[1]} | ${groupName}${newT[2]}</div>
                        <div style="font-size:0.8rem; color:var(--text-tertiary)">总和 ${App.utils.calcSum(newT)}</div>
                    </div>
                </div>
                <div style="background:var(--bg-tertiary); padding:8px; border-radius:6px; text-align:center; font-size:0.85rem; color:var(--accent-primary)">
                    💡 建议：${sug.reason} → ${sug.keepOld ? '保留旧值' : '替换为新值'}
                </div>`;

            // 存储待处理操作信息，供后续按钮使用
            App.state.pendingApply = {
                rowIdx,
                colIndex,
                newVal,
                groupName,
                rowName,
                subName,
                suggestion: sug
            };
            // 打开对比弹窗
            App.modal.openModal(dom.modalCompare);
        },

        /**
         * 关闭数值对比弹窗
         */
        closeCompareModal() {
            App.modal.closeModal(App.dom.modalCompare);
            App.state.pendingApply = null; // 清空待处理信息
        },

        /**
         * 直接应用新值（无需对比）
         */
        applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName) {
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);
            const newCell = { v: String(newVal), t: cell.t, a: cell.a };
            // 检查保护
            if (!App.datasetManager.isCellOperationAllowed(rowIdx, colIndex, newCell)) {
                App.modal.showAlert('默认数据集保护：不能替换为低于基准的数据。', '操作限制');
                return;
            }
            // 应用新值
            cell.v = String(newVal);
            App.state.rows[rowIdx].data[colIndex] = cell;
            App.tableRenderer.renderAllTables();
            App.datasetManager.saveData();
            App.dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
            App.utils.resetTripleInputs();
        },

        /**
         * 显示二次确认弹窗
         *
         * 当用户选择了与系统建议相反的操作时，弹出二次确认。
         * @param {string} message - 提示消息
         * @param {string} reason - 原因
         * @param {Function} onConfirm - 确认后的回调函数
         */
        showConfirmModal(message, reason, onConfirm) {
            App.dom.confirmBody.innerHTML = `
                <p style="font-size:0.9rem; color:var(--text-primary); margin-bottom:8px;">${message}</p>
                <div style="background:var(--bg-tertiary); padding:8px; border-radius:6px; font-size:0.8rem; color:var(--text-secondary);">${reason}</div>
                <p style="font-size:0.8rem; color:var(--text-tertiary); margin-top:10px;">是否仍要执行此操作？</p>
            `;
            App.state.confirmCallback = onConfirm; // 存储回调
            App.modal.closeModal(App.dom.modalCompare); // 关闭对比弹窗
            App.modal.openModal(App.dom.modalConfirm); // 打开确认弹窗
        },

        /**
         * 关闭二次确认弹窗
         */
        closeConfirmModal() {
            App.modal.closeModal(App.dom.modalConfirm);
            App.state.confirmCallback = null;
        },

        /**
         * 执行二次确认的回调
         */
        executeConfirmedAction() {
            if (App.state.confirmCallback) {
                App.state.confirmCallback(); // 调用存储的回调
            }
            this.closeConfirmModal();
        },

        /**
         * 用户选择保留旧值
         *
         * 如果系统建议替换为新值，但用户选择保留，则弹出二次确认。
         * 否则直接关闭弹窗并提示已保留。
         */
        executeKeepOld() {
            if (!App.state.pendingApply) return;
            const sug = App.state.pendingApply.suggestion;
            if (sug && !sug.keepOld) {
                // 系统建议替换，但用户选择保留，需要二次确认
                this.showConfirmModal('系统建议“替换为新值”，您选择了保留旧值。', `原因：${sug.reason}`, () => {
                    this.closeCompareModal();
                    App.dom.inputHint.textContent = '已保留旧值';
                });
            } else {
                // 用户选择与建议一致
                this.closeCompareModal();
                App.dom.inputHint.textContent = '已保留旧值';
            }
        },

        /**
         * 用户选择替换为新值
         *
         * 如果系统建议保留旧值，但用户选择替换，则弹出二次确认。
         * 否则直接应用新值。
         */
        executeReplaceNew() {
            if (!App.state.pendingApply) return;
            const sug = App.state.pendingApply.suggestion;
            if (sug && sug.keepOld) {
                // 系统建议保留，但用户选择替换，需要二次确认
                this.showConfirmModal('系统建议“保留旧值”，您选择了替换为新值。', `原因：${sug.reason}`, () => {
                    if (App.state.pendingApply) {
                        this.applyNewValue(
                            App.state.pendingApply.rowIdx,
                            App.state.pendingApply.colIndex,
                            App.state.pendingApply.newVal,
                            App.state.pendingApply.groupName,
                            App.state.pendingApply.rowName,
                            App.state.pendingApply.subName
                        );
                    }
                    this.closeCompareModal();
                });
            } else {
                // 用户选择与建议一致，直接应用
                if (App.state.pendingApply) {
                    this.applyNewValue(
                        App.state.pendingApply.rowIdx,
                        App.state.pendingApply.colIndex,
                        App.state.pendingApply.newVal,
                        App.state.pendingApply.groupName,
                        App.state.pendingApply.rowName,
                        App.state.pendingApply.subName
                    );
                }
                this.closeCompareModal();
            }
        },

        /**
         * 绑定数值应用相关事件
         * 由 events.js 统一调用
         */
        bindCellValueEvents() {
            const dom = App.dom;
            // 数据输入面板应用按钮
            if (dom.btnApplyValue) dom.btnApplyValue.addEventListener('click', () => this.applyValue());

            // 数值对比弹窗按钮
            if (dom.btnKeepOld) dom.btnKeepOld.addEventListener('click', () => this.executeKeepOld());
            if (dom.btnReplaceNew) dom.btnReplaceNew.addEventListener('click', () => this.executeReplaceNew());
            if (dom.btnCloseCompare) {
                dom.btnCloseCompare.addEventListener('click', () => {
                    this.closeCompareModal();
                    dom.inputHint.textContent = '已取消';
                });
            }
            if (dom.modalCompare) {
                dom.modalCompare.addEventListener('click', function (e) {
                    if (e.target === this) App.cellValue.closeCompareModal();
                });
            }

            // 二次确认弹窗按钮
            if (dom.btnCancelConfirm) {
                dom.btnCancelConfirm.addEventListener('click', () => {
                    this.closeConfirmModal();
                    App.modal.openModal(dom.modalCompare); // 返回对比弹窗
                });
            }
            if (dom.btnConfirmAction) dom.btnConfirmAction.addEventListener('click', () => this.executeConfirmedAction());
            if (dom.btnCloseConfirm) {
                dom.btnCloseConfirm.addEventListener('click', () => {
                    this.closeConfirmModal();
                    App.modal.openModal(dom.modalCompare); // 返回对比弹窗
                });
            }
            if (dom.modalConfirm) {
                dom.modalConfirm.addEventListener('click', function (e) {
                    if (e.target === this) {
                        App.cellValue.closeConfirmModal();
                        App.modal.openModal(dom.modalCompare); // 返回对比弹窗
                    }
                });
            }
        }
    };

})(window.App = window.App || {});