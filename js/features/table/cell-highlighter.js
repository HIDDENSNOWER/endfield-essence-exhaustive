/**
 * cell-highlighter.js - 单元格高亮统一控制
 * 挂载到 App.cellHighlighter
 *
 * v0.9.2 新增：为 unacquired.js 与 region-manager.js 提供统一的高亮控制器，
 * 消除两模块各自维护高亮状态导致的 class 残留与面板切换不清除问题。
 */
(function (App) {
    'use strict';

    App.cellHighlighter = {
        _highlightedCells: [],

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
                const td = document.querySelector(
                    `td[data-rowindex="${rowIdx}"][data-colindex="${colIndex}"]`
                );
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