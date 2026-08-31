/**
 * table-renderer.js - 表格渲染、单元格高亮
 * 挂载到 App.tableRenderer
 *
 * 本模块负责主数据表格的渲染与单元格高亮：
 * - getFilteredRows：获取经过行筛选后的行数据
 * - applyStyleFromStorage：从 localStorage 读取并应用列宽行高样式
 * - renderTablePart：渲染表格的指定部分（第一部分或第二部分）
 * - renderAllTables：渲染全部两个表格
 * - updateHighlightedCell：更新当前选中单元格的高亮显示，并加载备注到输入面板
 *
 * 渲染规则：
 * - 表格分为两个部分（第一部分：强攻~残暴，第二部分：附术~效益）
 * - 第一列为行名（提升项），后续为数据列
 * - 单元格根据 t（重复数）和 a（获取数）显示不同状态和文本
 * - 奇偶行/列使用不同的背景色
 */
(function (App) {
    'use strict';

    App.tableRenderer = {
        /**
         * 获取当前筛选后的行数据
         * @returns {Array} 过滤后的行数据数组
         *
         * 根据 state.selectedRows 中的行名列表，
         * 从 state.rows 中筛选出需要显示的行。
         */
        getFilteredRows() {
            const selected = new Set(App.state.selectedRows);
            return App.state.rows.filter(row => selected.has(row.name));
        },

        /**
         * 从 localStorage 应用列宽行高样式
         *
         * 读取保存的列宽行高设置，调用 tableStyle.applyStyle 应用。
         */
        applyStyleFromStorage() {
            const { colWidth, rowHeight } = App.storage.loadTableSize();
            App.tableStyle.applyStyle(colWidth, rowHeight);
        },

        /**
         * 渲染表格的指定部分
         * @param {HTMLTableSectionElement} thead - 表头元素
         * @param {HTMLTableSectionElement} tbody - 表体元素
         * @param {Array} groups - 词条组数组
         * @param {number} colOffset - 列偏移量（第二部分需偏移第一部分的列数）
         * @param {number} totalCols - 本部分总列数
         *
         * 功能：构建指定部分的表头（两行）和表体（数据行），
         * 包括 colgroup 定义列宽、单元格状态类设置、背景色应用等。
         */
        renderTablePart(thead, tbody, groups, colOffset, totalCols) {
            const table = thead.closest('table');
            const bgColors = App.tableStyle.loadTableBgColors();

            // ==================== 创建或清空 colgroup ====================
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                table.insertBefore(colgroup, table.firstChild);
            }
            colgroup.innerHTML = '';

            // 第一列（行标题）的 col 元素
            const colName = document.createElement('col');
            colName.style.width = 'var(--name-col-width)';
            colgroup.appendChild(colName);

            // 数据列的 col 元素
            for (let i = 0; i < totalCols; i++) {
                const col = document.createElement('col');
                col.className = 'data-col';
                col.style.width = '36px'; // 初始值，之后 applyStyle 会覆盖
                colgroup.appendChild(col);
            }

            // ==================== 渲染表头 ====================
            thead.innerHTML = '';

            // 表头第一行：角标 + 词条组名称
            const row1 = document.createElement('tr');
            const thCorner = document.createElement('th');
            thCorner.textContent = '提升项';
            thCorner.rowSpan = 2; // 跨两行
            row1.appendChild(thCorner);

            groups.forEach((group, groupIdx) => {
                // 计算全局组索引（用于奇偶着色）
                const globalIdx = (groups === App.constants.GROUP1 ? groupIdx : App.constants.GROUP1.length + groupIdx);
                const th = document.createElement('th');
                th.textContent = group.name;
                th.colSpan = group.sub.length;
                th.className = 'group-header ' + (globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
                // 组之间添加加粗右边框（最后一组除外）
                if (groupIdx < groups.length - 1) th.classList.add('border-group-right');
                row1.appendChild(th);
            });
            thead.appendChild(row1);

            // 表头第二行：副属性名称
            const row2 = document.createElement('tr');
            groups.forEach((group, groupIdx) => {
                const globalIdx = (groups === App.constants.GROUP1 ? groupIdx : App.constants.GROUP1.length + groupIdx);
                group.sub.forEach((subName, subIdx) => {
                    const th = document.createElement('th');
                    th.textContent = subName;
                    th.classList.add(globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
                    // 组之间添加加粗右边框
                    if (subIdx === group.sub.length - 1 && groupIdx < groups.length - 1) {
                        th.classList.add('border-group-right');
                    }
                    row2.appendChild(th);
                });
            });
            thead.appendChild(row2);

            // ==================== 渲染表体 ====================
            tbody.innerHTML = '';
            const filteredRows = this.getFilteredRows();

            // 如果没有选中任何行，显示提示信息
            if (filteredRows.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = totalCols + 1;
                td.textContent = '没有选择行';
                td.style.textAlign = 'center';
                td.style.padding = '24px';
                td.style.color = 'var(--text-tertiary)';
                tr.appendChild(td);
                tbody.appendChild(tr);
                this.applyStyleFromStorage();
                return;
            }

            // 遍历每一行
            filteredRows.forEach(row => {
                // 获取该行在原始数据中的索引（用于 data-rowindex 属性）
                const originalIndex = App.state.rows.indexOf(row);
                const tr = document.createElement('tr');

                // 第一列：行名
                const tdName = document.createElement('td');
                tdName.textContent = row.name;
                tr.appendChild(tdName);

                // 遍历每个词条组的每个副属性
                groups.forEach((group, groupIdx) => {
                    const globalIdx = (groups === App.constants.GROUP1 ? groupIdx : App.constants.GROUP1.length + groupIdx);
                    group.sub.forEach((subName, subIdx) => {
                        const td = document.createElement('td');

                        // 计算全局列索引
                        const colIndex = groups.slice(0, groupIdx).reduce((s, g) => s + g.sub.length, 0) + subIdx + colOffset;
                        const cell = App.utils.normalizeCell(row.data[colIndex]);
                        const val = cell.v;        // 数值
                        const total = cell.t || 0; // 重复数
                        const acq = cell.a || 0;   // 获取数

                        // 设置 data 属性，供高亮和备注使用
                        td.dataset.rowindex = originalIndex;
                        td.dataset.colindex = colIndex;

                        // 确定状态类
                        let statusClass = '';
                        if (total === 0) {
                            statusClass = '';
                        } else if (acq === 0) {
                            statusClass = 'status-none';       // 未获取
                        } else if (acq < total) {
                            statusClass = 'status-partial';    // 部分获取
                        } else {
                            statusClass = 'status-full';       // 全部获取
                        }
                        td.className = '';
                        if (statusClass) td.classList.add(statusClass);
                        // 无实装基质但有数值，标记为 has-value
                        if (total === 0 && val !== '') td.classList.add('has-value');

                        // 确定显示文本
                        let text;
                        if (total === 0) {
                            text = val === '' ? '—' : val;
                        } else {
                            text = val === '' ? '' : val;
                            if (total === 1) text += ` (${acq}/1)`;
                            else if (total > 1) text += ` (${acq}/${total})`;
                        }
                        // 空单元格标记
                        if (val === '' && total === 0) td.classList.add('empty-value');

                        td.textContent = text;

                        // 添加奇偶行列背景类
                        td.classList.add(globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
                        // 直接设置内联背景色，确保立即可见
                        td.style.backgroundColor = (globalIdx % 2 === 0) ? bgColors.even : bgColors.odd;

                        // 组之间添加加粗右边框
                        if (subIdx === group.sub.length - 1 && groupIdx < groups.length - 1) {
                            td.classList.add('border-group-right');
                        }

                        tr.appendChild(td);
                    });
                });
                tbody.appendChild(tr);
            });

            // 应用列宽行高样式
            this.applyStyleFromStorage();
        },

        /**
         * 渲染全部表格
         *
         * 分别渲染第一部分（GROUP1）和第二部分（GROUP2），
         * 完成后更新当前选中单元格的高亮。
         */
        renderAllTables() {
            const C = App.constants;
            this.renderTablePart(App.dom.tableHead1, App.dom.tableBody1, C.GROUP1, 0, C.COLS1);
            this.renderTablePart(App.dom.tableHead2, App.dom.tableBody2, C.GROUP2, C.COLS1, C.COLS2);
            this.updateHighlightedCell();
        },

        /**
         * 更新当前选中单元格高亮，并加载备注到输入面板
         *
         * 根据当前激活面板（数据输入/录入）中下拉框的选中值，
         * 计算目标单元格，添加闪烁高亮类，并调用 note 模块加载备注。
         */
        updateHighlightedCell() {
            const state = App.state;

            // 移除之前的高亮
            if (state.highlightedCellElement) {
                state.highlightedCellElement.classList.remove('cell-highlight-blink');
                state.highlightedCellElement = null;
            }

            // 根据当前面板选择对应的下拉框
            let subSelect, rowSelect, groupSelect;
            const dom = App.dom;
            if (state.activePanel === 'input') {
                subSelect = dom.inputSubCol;
                rowSelect = dom.inputRow;
                groupSelect = dom.inputGroup;
            } else if (state.activePanel === 'record') {
                subSelect = dom.recordSubCol;
                rowSelect = dom.recordRow;
                groupSelect = dom.recordGroup;
            } else {
                return; // 统计面板无需高亮
            }

            const subIdx = parseInt(subSelect.value);
            const rowIdx = parseInt(rowSelect.value);
            const groupIdx = parseInt(groupSelect.value);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

            // 计算全局列索引，查找对应单元格
            const colIndex = App.utils.getColumnIndex(groupIdx, subIdx);
            const cell = document.querySelector(`td[data-rowindex="${rowIdx}"][data-colindex="${colIndex}"]`);
            if (cell) {
                cell.classList.add('cell-highlight-blink');
                state.highlightedCellElement = cell;
            }

            // 加载备注到输入面板
            if (typeof App.note.loadNoteIntoPanel === 'function') {
                App.note.loadNoteIntoPanel(rowIdx, colIndex);
            }
        }
    };

})(window.App = window.App || {});