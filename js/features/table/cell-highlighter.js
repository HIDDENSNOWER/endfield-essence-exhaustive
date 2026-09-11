/**
 * cell-highlighter.js - 单元格高亮统一控制
 * 挂载到 App.cellHighlighter
 *
 * v0.9.2 新增：为 unacquired.js 与 region-manager.js 提供统一的高亮控制器，
 * 消除两模块各自维护高亮状态导致的 class 残留与面板切换不清除问题。
 *
 * v0.9.6 优化：构建 td 索引缓存（Map<"r_c", td>），
 * 将 320 次 querySelector 降为 O(1) 查表。
 */
(function (App) {
    'use strict';

    App.cellHighlighter = {
        _highlightedCells: [],
        /** td 索引缓存：key = `${rowIdx}_${colIndex}`, value = td 元素 */
        _index: null,

        /**
         * 构建索引缓存（在 renderAllTables 后调用）
         * 遍历两个 tableBody，缓存所有带 data-rowindex 的 td
         */
        buildIndex() {
            const map = new Map();
            ['tableBody1', 'tableBody2'].forEach(id => {
                const body = document.getElementById(id);
                if (!body) return;
                body.querySelectorAll('td[data-rowindex]').forEach(td => {
                    const key = `${td.dataset.rowindex}_${td.dataset.colindex}`;
                    map.set(key, td);
                });
            });
            this._index = map;
        },

        /**
         * 失效索引（表格重新渲染后由 table-renderer 调用）
         */
        invalidateIndex() {
            this._index = null;
        },

        /**
         * 获取单元格元素（优先查缓存，未命中则回退 querySelector）
         * 缓存为空时自动构建，兼顾首次调用与索引失效两种情况
         */
        _getCell(rowIdx, colIndex) {
            if (!this._index) this.buildIndex();
            const cached = this._index.get(`${rowIdx}_${colIndex}`);
            if (cached) return cached;
            // 兜底：缓存未命中（理论上不应发生，除非表格结构异常）
            return document.querySelector(
                `td[data-rowindex="${rowIdx}"][data-colindex="${colIndex}"]`
            );
        },

        /**
         * 高亮一组单元格
         * @param {Array<{rowIdx, colIndex, isUnacquired}>} cellList
         * @param {Object} [options] { scroll: boolean }  默认滚动到第一个未获取格
         */
        highlight(cellList, options) {
            this.clear();

            const opts = options || {};
            const scroll = opts.scroll !== false;
            let firstUnacquiredTd = null;

            cellList.forEach(({ rowIdx, colIndex, isUnacquired }) => {
                const td = this._getCell(rowIdx, colIndex);
                if (!td) return;

                if (isUnacquired) {
                    td.classList.add('unacquired-cell-highlight');
                    if (!firstUnacquiredTd) firstUnacquiredTd = td;
                } else {
                    td.classList.add('acquired-cell-highlight');
                }
                this._highlightedCells.push(td);
            });

            this._applyDimming();

            if (scroll) {
                const target = firstUnacquiredTd ||
                    (this._highlightedCells.length > 0 ? this._highlightedCells[0] : null);
                if (target) {
                    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }
        },

        /**
         * 清除所有高亮与蒙版
         * 先按记录清除，再全表兜底（防多模块交错导致 class 残留）
         */
        clear() {
            if (this._highlightedCells.length > 0) {
                this._highlightedCells.forEach(td => {
                    td.classList.remove('unacquired-cell-highlight');
                    td.classList.remove('acquired-cell-highlight');
                });
                this._highlightedCells = [];
            }
            document.querySelectorAll('.unacquired-cell-highlight, .acquired-cell-highlight')
                .forEach(td => {
                    td.classList.remove('unacquired-cell-highlight');
                    td.classList.remove('acquired-cell-highlight');
                });
            this._removeDimming();
        },

        isActive() {
            return this._highlightedCells.length > 0;
        },

        _applyDimming() {
            const hasAny = this._highlightedCells.length > 0;
            ['tableBody1', 'tableBody2'].forEach(id => {
                const body = document.getElementById(id);
                if (!body) return;
                const table = body.closest('table');
                if (!table) return;
                table.classList.toggle('unacquired-dimming', hasAny);
            });
        },

        _removeDimming() {
            document.querySelectorAll('table.unacquired-dimming')
                .forEach(t => t.classList.remove('unacquired-dimming'));
        }
    };

})(window.App = window.App || {});