/**
 * table-style.js - 表格尺寸与底色管理
 * 挂载到 App.tableStyle
 *
 * 本模块负责表格的列宽、行高以及奇偶行底色的设置与管理：
 * - applyStyle：应用列宽和行高到 CSS 变量和实际单元格
 * - initTableStyle：从 localStorage 加载保存的尺寸和底色并应用
 * - getDefaultTableBgColors：获取当前主题下的默认奇偶行底色
 * - loadTableBgColors / saveTableBgColors：读取/保存表格底色
 * - applyTableBgColors：将底色应用到 CSS 变量和主表格单元格
 * - refreshTableBgColors：刷新主表格中的奇偶行背景色
 * - syncTableBgColors：同步底色（初始化或主题切换时）
 * - updateTableBgColorUI：更新设置弹窗中的颜色选择器显示
 * - resetTableBgColor：重置指定类型（奇/偶）的底色为默认值
 * - bindTableStyleEvents：绑定尺寸控件和底色选择器的事件
 *
 * 所有设置均持久化到 localStorage，主题切换时自动适配。
 */
(function (App) {
    'use strict';

    App.tableStyle = {
        /**
         * 应用列宽和行高
         * @param {number} colWidth - 列宽（像素）
         * @param {number} rowHeight - 行高（像素）
         *
         * 功能：
         * - 更新 CSS 变量 --col-width 和 --row-height（影响全局样式）
         * - 保存到 localStorage
         * - 设置所有数据列的 <col> 宽度
         * - 设置表头第二行和数据单元格的行高
         * - 设置数据单元格（除第一列外）的宽度、最小宽度和最大宽度
         */
        applyStyle(colWidth, rowHeight) {
            // 更新 CSS 变量，供样式表使用
            document.documentElement.style.setProperty('--col-width', colWidth + 'px');
            document.documentElement.style.setProperty('--row-height', rowHeight + 'px');

            // 保存到 localStorage
            App.storage.saveTableSize(colWidth, rowHeight);

            // 设置所有数据列的 col 元素宽度
            document.querySelectorAll('col.data-col').forEach(col => {
                col.style.width = colWidth + 'px';
            });

            // 设置单元格高度（表体所有单元格 + 表头第二行的单元格）
            document.querySelectorAll('table tbody td, table thead tr:nth-child(2) th').forEach(cell => {
                cell.style.height = rowHeight + 'px';
            });

            // 设置数据单元格宽度（表体除第一列外的所有单元格）
            document.querySelectorAll('table tbody td:not(:first-child)').forEach(cell => {
                cell.style.width = colWidth + 'px';
                cell.style.minWidth = colWidth + 'px';
                cell.style.maxWidth = colWidth + 'px';
            });
        },

        /**
         * 初始化表格尺寸（从存储加载）
         *
         * 从 localStorage 读取保存的列宽和行高（若无则使用默认值），
         * 更新设置弹窗中的输入框、滑块和数值显示，
         * 然后调用 applyStyle 应用，并同步表格底色。
         */
        initTableStyle() {
            // 读取保存的尺寸
            const { colWidth, rowHeight } = App.storage.loadTableSize();
            const dom = App.dom;

            // 更新输入框、滑块和数值显示
            if (dom.colWidthInput) dom.colWidthInput.value = colWidth;
            if (dom.colWidthSlider) dom.colWidthSlider.value = colWidth;
            if (dom.rowHeightInput) dom.rowHeightInput.value = rowHeight;
            if (dom.rowHeightSlider) dom.rowHeightSlider.value = rowHeight;
            if (dom.colWidthValue) dom.colWidthValue.textContent = colWidth;
            if (dom.rowHeightValue) dom.rowHeightValue.textContent = rowHeight;

            // 应用尺寸
            this.applyStyle(colWidth, rowHeight);

            // 同步表格底色
            this.syncTableBgColors();
        },

        /**
         * 获取默认表格底色
         * @returns {{odd: string, even: string}} 当前主题下的默认奇偶行背景色
         */
        getDefaultTableBgColors(theme) {
            const C = App.constants;
            return {
                odd: C.DEFAULT_INTERFACE_COLORS_LIGHT['--group-odd-bg'],
                even: C.DEFAULT_INTERFACE_COLORS_LIGHT['--group-even-bg']
            };
            // 实际需根据 theme 动态返回
        },

        /**
         * 加载当前主题下的表格底色
         * @returns {{odd: string, even: string}} 当前主题保存的奇偶行背景色
         */
        loadTableBgColors() {
            return App.storage.loadTableBgColors(App.state.isDarkTheme() ? 'dark' : 'light');
        },

        /**
         * 保存表格底色
         * @param {{odd: string, even: string}} colors - 要保存的奇偶行背景色
         */
        saveTableBgColors(colors) {
            App.storage.saveTableBgColors(App.state.isDarkTheme() ? 'dark' : 'light', colors);
        },

        /**
         * 应用表格底色到 CSS 变量和实际单元格
         * @param {{odd: string, even: string}} colors - 奇偶行背景色（可包含空值，自动使用默认值）
         *
         * 将颜色写入 CSS 变量 --group-odd-bg 和 --group-even-bg，
         * 然后刷新主表格中单元格的背景色。
         */
        applyTableBgColors(colors) {
            const defaults = this.getDefaultTableBgColors();
            const odd = colors.odd || defaults.odd;   // 空值回退到默认
            const even = colors.even || defaults.even;

            // 更新 CSS 变量
            document.documentElement.style.setProperty('--group-odd-bg', odd);
            document.documentElement.style.setProperty('--group-even-bg', even);

            // 刷新实际单元格背景
            this.refreshTableBgColors();
        },

        /**
         * 刷新主表格中奇偶行单元格背景色
         *
         * 读取当前主题下的底色，遍历主表格区域中具有 group-even/group-odd 类的单元格，
         * 直接设置其背景色，确保颜色立即生效。
         */
        refreshTableBgColors() {
            const colors = this.loadTableBgColors();
            const tableArea = App.dom.tableArea;
            if (!tableArea) return;

            // 更新偶数行
            tableArea.querySelectorAll('td.group-even').forEach(td => {
                td.style.backgroundColor = colors.even;
            });
            // 更新奇数行
            tableArea.querySelectorAll('td.group-odd').forEach(td => {
                td.style.backgroundColor = colors.odd;
            });
        },

        /**
         * 同步表格底色（初始化或主题切换时调用）
         *
         * 加载当前主题的底色，应用到 CSS 变量和主表格，
         * 并更新设置弹窗中的颜色选择器 UI。
         */
        syncTableBgColors() {
            const colors = this.loadTableBgColors();
            this.applyTableBgColors(colors);
            this.updateTableBgColorUI(colors);
        },

        /**
         * 更新设置弹窗中的颜色选择器 UI
         * @param {{odd: string, even: string}} colors - 当前主题的奇偶行背景色
         *
         * 将颜色值显示在颜色选择器和旁边的文本中。
         */
        updateTableBgColorUI(colors) {
            const dom = App.dom;
            if (dom.tableBgColorOdd) dom.tableBgColorOdd.value = colors.odd;
            if (dom.tableBgColorOddValue) dom.tableBgColorOddValue.textContent = colors.odd;
            if (dom.tableBgColorEven) dom.tableBgColorEven.value = colors.even;
            if (dom.tableBgColorEvenValue) dom.tableBgColorEvenValue.textContent = colors.even;
        },

        /**
         * 重置指定类型的表格底色为默认值
         * @param {'odd'|'even'} type - 要重置的类型
         *
         * 将奇行或偶行的底色恢复为当前主题的默认值，
         * 保存、应用并更新 UI。
         */
        resetTableBgColor(type) {
            const colors = this.loadTableBgColors();
            const defaults = this.getDefaultTableBgColors();

            if (type === 'odd') colors.odd = defaults.odd;
            else if (type === 'even') colors.even = defaults.even;

            this.saveTableBgColors(colors);
            this.applyTableBgColors(colors);
            this.updateTableBgColorUI(colors);
        },

        /**
         * 绑定表格尺寸与底色相关事件
         * 由 events.js 统一调用
         *
         * 绑定以下事件：
         * - 列宽/行高输入框的 input 和 wheel 事件
         * - 列宽/行高滑块的 input 事件
         * - 奇偶行颜色选择器的 input 事件（实时应用并保存）
         * - 重置底色按钮的点击事件
         */
        bindTableStyleEvents() {
            const dom = App.dom;
            const self = this;

            // ---------- 尺寸控件联动 ----------
            const colInput = dom.colWidthInput;
            const colSlider = dom.colWidthSlider;
            const rowInput = dom.rowHeightInput;
            const rowSlider = dom.rowHeightSlider;
            const colValue = dom.colWidthValue;
            const rowValue = dom.rowHeightValue;

            if (colInput && colSlider && rowInput && rowSlider) {
                /**
                 * 从输入框读取值，限制在合理范围内，
                 * 同步到滑块和数值显示，并应用样式。
                 */
                function applySizes() {
                    let col = parseInt(colInput.value) || App.constants.DEFAULT_COL_WIDTH;
                    let row = parseInt(rowInput.value) || App.constants.DEFAULT_ROW_HEIGHT;

                    // 限制范围
                    col = Math.max(App.constants.MIN_COL_WIDTH, Math.min(App.constants.MAX_COL_WIDTH, col));
                    row = Math.max(App.constants.MIN_ROW_HEIGHT, Math.min(App.constants.MAX_ROW_HEIGHT, row));

                    // 回写输入框和滑块
                    colInput.value = col;
                    rowInput.value = row;
                    colSlider.value = col;
                    rowSlider.value = row;

                    // 更新数值显示
                    if (colValue) colValue.textContent = col;
                    if (rowValue) rowValue.textContent = row;

                    // 应用样式
                    self.applyStyle(col, row);
                }

                // 输入框事件
                [colInput, rowInput].forEach(inp => {
                    inp.addEventListener('input', applySizes);
                    // 滚轮调整
                    inp.addEventListener('wheel', function (e) {
                        e.preventDefault();
                        let val = parseInt(this.value) || (this === colInput ? App.constants.DEFAULT_COL_WIDTH : App.constants.DEFAULT_ROW_HEIGHT);
                        const min = this === colInput ? App.constants.MIN_COL_WIDTH : App.constants.MIN_ROW_HEIGHT;
                        const max = this === colInput ? App.constants.MAX_COL_WIDTH : App.constants.MAX_ROW_HEIGHT;
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

            // 将原来的 input 事件改为 change 事件（非实时）
            if (dom.tableBgColorOdd) {
                dom.tableBgColorOdd.addEventListener('change', function () {
                    const colors = self.loadTableBgColors();
                    colors.odd = this.value;
                    self.applyTableBgColors(colors);
                    self.saveTableBgColors(colors);
                    if (dom.tableBgColorOddValue) dom.tableBgColorOddValue.textContent = colors.odd;
                });
            }
            if (dom.tableBgColorEven) {
                dom.tableBgColorEven.addEventListener('change', function () {
                    const colors = self.loadTableBgColors();
                    colors.even = this.value;
                    self.applyTableBgColors(colors);
                    self.saveTableBgColors(colors);
                    if (dom.tableBgColorEvenValue) dom.tableBgColorEvenValue.textContent = colors.even;
                });
            }

            // 重置底色按钮
            if (dom.btnResetTableBgOdd) dom.btnResetTableBgOdd.addEventListener('click', () => self.resetTableBgColor('odd'));
            if (dom.btnResetTableBgEven) dom.btnResetTableBgEven.addEventListener('click', () => self.resetTableBgColor('even'));
        }
    };

})(window.App = window.App || {});