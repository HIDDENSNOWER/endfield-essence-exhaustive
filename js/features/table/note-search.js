/**
 * note-search.js - 备注内容检索与定位
 * 挂载到 App.noteSearch
 *
 * 功能：
 * - 在导航栏的检索框中输入关键词，实时搜索当前数据集所有单元格的备注文本
 * - 高亮所有匹配单元格，并显示匹配数量
 * - 支持↑/↓按钮循环跳转，当前匹配项红色高亮
 * - 自动适配行筛选：仅搜索当前显示的行
 * - 表格重新渲染后自动重新应用搜索
 */
(function (App) {
    'use strict';

    let matches = [];          // 匹配结果数组：{ rowIdx, colIdx }
    let currentMatchIdx = -1;  // 当前高亮匹配项的索引

    App.noteSearch = {
        /**
         * 执行搜索
         */
        search() {
            const input = App.dom.noteSearchInput;
            const keyword = input ? input.value.trim().toLowerCase() : '';
            
            // 清除旧高亮
            this.clearHighlights();
            matches = [];
            currentMatchIdx = -1;

            if (!keyword) {
                if (App.dom.noteSearchCount) App.dom.noteSearchCount.textContent = '';
                return;
            }

            // 仅遍历当前显示的行
            const selected = new Set(App.state.selectedRows);
            App.state.rows.forEach((row, rowIdx) => {
                if (!selected.has(row.name)) return;
                row.data.forEach((cell, colIdx) => {
                    const note = cell && cell.note;
                    if (note && note.text && note.text.toLowerCase().includes(keyword)) {
                        matches.push({ rowIdx, colIdx });
                    }
                });
            });

            // 更新匹配数量显示
            if (App.dom.noteSearchCount) {
                App.dom.noteSearchCount.textContent = matches.length > 0 ? `${matches.length} 个匹配` : '无匹配';
            }

            // 高亮所有匹配项
            matches.forEach(match => {
                const td = this.getCellElement(match.rowIdx, match.colIdx);
                if (td) td.classList.add('note-search-highlight');
            });

            // 定位到第一个匹配项
            if (matches.length > 0) {
                this.goToMatch(0);
            }
        },

        /**
         * 清除所有高亮
         */
        clearHighlights() {
            document.querySelectorAll('.note-search-highlight, .note-search-current').forEach(el => {
                el.classList.remove('note-search-highlight', 'note-search-current');
            });
        },

        /**
         * 获取指定行列的表格单元格 DOM
         */
        getCellElement(rowIdx, colIdx) {
            return document.querySelector(
                `td[data-rowindex="${rowIdx}"][data-colindex="${colIdx}"]`
            );
        },

        /**
         * 跳转到指定匹配项并滚动到可视区域
         */
        goToMatch(idx) {
            if (idx < 0 || idx >= matches.length) return;

            // 移除上一个当前高亮
            document.querySelectorAll('.note-search-current').forEach(el => {
                el.classList.remove('note-search-current');
            });

            currentMatchIdx = idx;
            const match = matches[idx];
            const td = this.getCellElement(match.rowIdx, match.colIdx);
            if (td) {
                td.classList.add('note-search-current');
                td.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        },

        /**
         * 上一个匹配项
         */
        prev() {
            if (matches.length === 0) return;
            const idx = (currentMatchIdx - 1 + matches.length) % matches.length;
            this.goToMatch(idx);
        },

        /**
         * 下一个匹配项
         */
        next() {
            if (matches.length === 0) return;
            const idx = (currentMatchIdx + 1) % matches.length;
            this.goToMatch(idx);
        },

        /**
         * 绑定检索器事件
         */
        bindNoteSearchEvents() {
            if (App.dom.noteSearchInput) {
                App.dom.noteSearchInput.addEventListener('input', () => this.search());
                App.dom.noteSearchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.next();
                });
            }
            if (App.dom.btnNoteSearchPrev) {
                App.dom.btnNoteSearchPrev.addEventListener('click', () => this.prev());
            }
            if (App.dom.btnNoteSearchNext) {
                App.dom.btnNoteSearchNext.addEventListener('click', () => this.next());
            }
        }
    };
})(window.App = window.App || {});