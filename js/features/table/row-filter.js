/**
 * row-filter.js - 行筛选功能
 * 挂载到 App.rowFilter
 *
 * 本模块负责表格行筛选的交互逻辑：
 * - renderRowFilterCheckboxes：在筛选弹窗中生成每一行的复选框列表
 * - updateSelectedRowsFromCheckboxes：根据复选框状态更新 state.selectedRows
 * - updateRowFilterButtonLabel：更新导航栏中筛选按钮的文本显示
 * - bindRowFilterEvents：绑定行筛选弹窗的所有相关事件
 *
 * 筛选结果通过 state.selectedRows 保存，表格渲染时根据该列表决定显示哪些行。
 */
(function (App) {
    'use strict';

    App.rowFilter = {
        /**
         * 渲染行筛选复选框列表
         *
         * 遍历所有行名，为每个行名创建一个带复选框的标签项，
         * 并根据 state.selectedRows 设置初始选中状态。
         * 将所有项目添加到筛选弹窗的容器中。
         */
        renderRowFilterCheckboxes() {
            const container = App.dom.rowFilterCheckboxes;
            container.innerHTML = ''; // 清空现有内容

            App.constants.ROW_NAMES.forEach(name => {
                // 创建标签容器
                const label = document.createElement('label');
                label.className = 'row-filter-item';

                // 创建复选框
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = name;
                // 根据当前选中行列表设置选中状态
                cb.checked = App.state.selectedRows.includes(name);

                // 将复选框和文本添加到标签中
                label.appendChild(cb);
                label.appendChild(document.createTextNode(name));

                // 添加到容器
                container.appendChild(label);
            });
        },

        /**
         * 从复选框状态更新 state.selectedRows
         *
         * 遍历筛选弹窗中所有选中的复选框，将它们的值收集为数组，
         * 更新到全局状态 state.selectedRows。
         */
        updateSelectedRowsFromCheckboxes() {
            const checked = [];
            document.querySelectorAll('#rowFilterCheckboxes input[type="checkbox"]').forEach(cb => {
                if (cb.checked) checked.push(cb.value);
            });
            App.state.selectedRows = checked;
        },

        /**
         * 更新行筛选按钮文本
         *
         * 根据当前选中的行数和总行数，更新导航栏中按钮的文本：
         * - 全部选中：显示"全部行"
         * - 未选中任何行：显示"未选行"
         * - 部分选中：显示"已选 X/Y 行"
         */
        updateRowFilterButtonLabel() {
            const total = App.constants.ROW_NAMES.length;
            const selected = App.state.selectedRows.length;
            const label = App.dom.rowFilterLabel;

            if (selected === total) {
                label.textContent = '全部行';
            } else if (selected === 0) {
                label.textContent = '未选行';
            } else {
                label.textContent = `已选 ${selected}/${total} 行`;
            }
        },

        /**
         * 绑定行筛选事件
         * 由 events.js 统一调用
         *
         * 绑定以下事件：
         * - 打开筛选弹窗按钮
         * - 全选 / 全不选按钮
         * - 复选框变化时更新选中状态
         * - 应用筛选按钮（关闭弹窗并重新渲染表格）
         * - 取消 / 关闭按钮
         * - 点击遮罩关闭弹窗
         */
        bindRowFilterEvents() {
            const dom = App.dom;

            // 打开行筛选弹窗
            if (dom.btnRowFilter) {
                dom.btnRowFilter.addEventListener('click', () => {
                    this.renderRowFilterCheckboxes();
                    App.modal.openModal(dom.modalRowFilter);
                });
            }

            // 全选按钮：仅修改复选框勾选状态（不立即写入 state，应用时才生效）
            if (dom.btnSelectAllRows) {
                dom.btnSelectAllRows.addEventListener('click', () => {
                    document.querySelectorAll('#rowFilterCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
                });
            }

            // 全不选按钮
            if (dom.btnSelectNoneRows) {
                dom.btnSelectNoneRows.addEventListener('click', () => {
                    document.querySelectorAll('#rowFilterCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
                });
            }

            // 复选框变化：仅维护本地勾选状态，不立即写入 state（修复"取消失效"问题）

            // 应用筛选：一次性写入选中状态，关闭弹窗、重新渲染表格、更新按钮文本
            if (dom.btnApplyRowFilter) {
                dom.btnApplyRowFilter.addEventListener('click', () => {
                    this.updateSelectedRowsFromCheckboxes();
                    App.modal.closeModal(dom.modalRowFilter);
                    App.tableRenderer.renderAllTables();
                    this.updateRowFilterButtonLabel();
                });
            }

            // 取消按钮：关闭弹窗，不应用更改
            if (dom.btnCancelRowFilter) {
                dom.btnCancelRowFilter.addEventListener('click', () => App.modal.closeModal(dom.modalRowFilter));
            }

            // 右上角关闭按钮
            if (dom.btnCloseRowFilter) {
                dom.btnCloseRowFilter.addEventListener('click', () => App.modal.closeModal(dom.modalRowFilter));
            }

            // 点击遮罩关闭弹窗
            if (dom.modalRowFilter) {
                dom.modalRowFilter.addEventListener('click', function (e) {
                    if (e.target === this) App.modal.closeModal(dom.modalRowFilter);
                });
            }
        }
    };

})(window.App = window.App || {});