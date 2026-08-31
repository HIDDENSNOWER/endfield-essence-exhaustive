/**
 * stats.js - 统计面板渲染
 * 挂载到 App.stats
 *
 * 本模块负责统计面板的渲染与交互：
 * - renderStats：统计所有词条组的数据（总基质数、总实装基质、已获取、未获取），
 *   生成摘要表格、排序控件和每个词条组的统计卡片，并支持排序功能。
 *
 * 统计口径：
 * - totalMatrix（总基质数）：有数值的单元格算1个；实装基质按已获取数计算
 * - totalT（总实装基质数）：所有单元格的 t 值之和
 * - totalA（总获取实装基质数）：所有单元格的 a 值之和
 * - unacquired（未获取实装基质数）：totalT - totalA
 *
 * 排序依据和排序方向保存在 App.state.statsSortBy 和 App.state.statsSortOrder 中，
 * 用户可通过下拉框修改，修改后自动重新渲染。
 */
(function (App) {
    'use strict';

    App.stats = {
        /**
         * 渲染统计面板
         *
         * 统计所有词条组的数据，生成摘要、排序控件和统计卡片，
         * 并绑定排序控件的 change 事件。
         */
        renderStats() {
            const C = App.constants;

            // ==================== 初始化统计数据 ====================
            // 为每个词条组创建一个统计对象，初始值均为0
            const stats = C.ALL_GROUPS.map(group => ({
                name: group.name,       // 词条组名称
                totalMatrix: 0,         // 总基质数
                totalT: 0,              // 总实装基质数
                totalA: 0               // 已获取实装基质数
            }));

            // ==================== 遍历所有数据并统计 ====================
            App.state.rows.forEach(row => {
                row.data.forEach((cell, colIndex) => {
                    const c = App.utils.normalizeCell(cell);

                    // 确定当前列属于哪个词条组
                    let groupIdx = 0;
                    let remaining = colIndex;
                    for (let i = 0; i < C.ALL_GROUPS.length; i++) {
                        const subLen = C.ALL_GROUPS[i].sub.length;
                        if (remaining < subLen) {
                            groupIdx = i;
                            break;
                        }
                        remaining -= subLen;
                    }

                    // 统计总基质数
                    if (c.v !== '' && c.v !== null && c.v !== undefined) {
                        // 有数值的单元格算1个基质
                        stats[groupIdx].totalMatrix += 1;
                    } else if (c.t > 0) {
                        // 实装基质按已获取数计算
                        stats[groupIdx].totalMatrix += (c.a || 0);
                    }

                    // 累计总实装基质数和已获取数
                    stats[groupIdx].totalT += c.t || 0;
                    stats[groupIdx].totalA += c.a || 0;
                });
            });

            // 计算每个词条组的未获取数
            stats.forEach(s => s.unacquired = s.totalT - s.totalA);

            // ==================== 计算总计 ====================
            const totals = {
                totalMatrix: stats.reduce((sum, s) => sum + s.totalMatrix, 0),
                totalT: stats.reduce((sum, s) => sum + s.totalT, 0),
                totalA: stats.reduce((sum, s) => sum + s.totalA, 0),
                unacquired: stats.reduce((sum, s) => sum + s.unacquired, 0)
            };

            // ==================== 排序 ====================
            const sortBy = App.state.statsSortBy;      // 排序依据
            const sortOrder = App.state.statsSortOrder; // 排序方向

            stats.sort((a, b) => {
                let valA, valB;
                switch (sortBy) {
                    case 'totalT': valA = a.totalT; valB = b.totalT; break;
                    case 'totalA': valA = a.totalA; valB = b.totalA; break;
                    case 'unacquired': valA = a.unacquired; valB = b.unacquired; break;
                    default: valA = a.totalMatrix; valB = b.totalMatrix;
                }
                // 升序或降序
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });

            // ==================== 构建 HTML ====================
            let html = '';

            // ---- 摘要表格 ----
            html += `
            <div class="stats-summary">
                <table class="summary-table">
                    <tr><td>总基质数</td><td>${totals.totalMatrix}</td></tr>
                    <tr><td>总实装基质数</td><td>${totals.totalT}</td></tr>
                    <tr><td>总获取实装基质数</td><td>${totals.totalA}</td></tr>
                    <tr><td>未获取实装基质数</td><td>${totals.unacquired}</td></tr>
                </table>
            </div>`;

            // ---- 排序控件 ----
            html += `
            <div class="stats-sort-controls">
                <div>
                    <label>排序依据</label>
                    <select id="statsSortBy">
                        <option value="totalMatrix" ${sortBy === 'totalMatrix' ? 'selected' : ''}>总基质数</option>
                        <option value="totalT" ${sortBy === 'totalT' ? 'selected' : ''}>总实装基质</option>
                        <option value="totalA" ${sortBy === 'totalA' ? 'selected' : ''}>已获取实装</option>
                        <option value="unacquired" ${sortBy === 'unacquired' ? 'selected' : ''}>未获取实装</option>
                    </select>
                </div>
                <div>
                    <label>排序方式</label>
                    <select id="statsSortOrder">
                        <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>降序</option>
                        <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>升序</option>
                    </select>
                </div>
            </div>`;

            // ---- 每个词条组的统计卡片 ----
            stats.forEach(s => {
                html += `
                <div class="stat-card">
                    <table>
                        <tr><th colspan="4">${s.name}</th></tr>
                        <tr>
                            <td class="data-label">未获取实装</td>
                            <td class="data-value${sortBy === 'unacquired' ? ' highlight-value' : ''}">${s.unacquired}</td>
                            <td class="data-label">总实装基质</td>
                            <td class="data-value${sortBy === 'totalT' ? ' highlight-value' : ''}">${s.totalT}</td>
                        </tr>
                        <tr>
                            <td class="data-label">已获取实装</td>
                            <td class="data-value${sortBy === 'totalA' ? ' highlight-value' : ''}">${s.totalA}</td>
                            <td class="data-label">总基质数</td>
                            <td class="data-value${sortBy === 'totalMatrix' ? ' highlight-value' : ''}">${s.totalMatrix}</td>
                        </tr>
                    </table>
                </div>`;
            });

            // 将生成的 HTML 写入统计面板容器
            App.dom.statsContent.innerHTML = html;

            // ==================== 绑定排序控件 ====================
            const sortBySelect = document.getElementById('statsSortBy');
            const sortOrderSelect = document.getElementById('statsSortOrder');

            if (sortBySelect && sortOrderSelect) {
                // 排序依据变化
                sortBySelect.addEventListener('change', function () {
                    App.state.statsSortBy = this.value;
                    App.stats.renderStats(); // 重新渲染
                });
                // 排序方向变化
                sortOrderSelect.addEventListener('change', function () {
                    App.state.statsSortOrder = this.value;
                    App.stats.renderStats(); // 重新渲染
                });

                // 启用滚轮切换选项
                App.utils.enableWheelSelect(sortBySelect);
                App.utils.enableWheelSelect(sortOrderSelect);
            }
        }
    };

})(window.App = window.App || {});