/**
 * unacquired.js - 未获取基质统计（前 36 名 + 地区筛选 + 双色悬停高亮 + 变暗蒙版 + 进度条）
 * 挂载到 App.unacquired
 *
 * 统计逻辑（按地区独立）：
 *   - 每个条目 = (地区, 3主属性, 副属性或词条)
 *   - 未获取数 = 该地区该组合 24 个候选的缺口总数
 *   - 完成度 = (完全获取的格数) / 24
 *     完全获取 = t>0 && a=t  或  t=0 && v!=''
 *
 * 展示格式（三行）：
 *   第一行：主属性1-主属性2-主属性3/副属性或词条
 *   第二行：地区名
 *   第三行：进度条 + 百分比
 *   右侧：未获取：数量
 */
(function (App) {
    'use strict';

    const TOP_N = 36;

    /** 生成从 arr 中取 k 个元素的所有组合 */
    function combinations(arr, k) {
        const result = [];
        const combine = (start, current) => {
            if (current.length === k) { result.push(current.slice()); return; }
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                combine(i + 1, current);
                current.pop();
            }
        };
        combine(0, []);
        return result;
    }

    /** 计算单元格的"未获取缺口贡献" */
    function getUnacquiredScore(cell) {
        if (cell.t > 0) return Math.max(0, cell.t - (cell.a || 0));
        if (cell.v !== '') return 0;
        return 1;
    }

    /** 计算某地区、某组合下的未获取缺口总数（24 个候选） */
    function countUnacquired(region, main3, attr) {
        const C = App.constants;
        const isRowAttr = C.ROW_NAMES.includes(attr);
        const isGroupAttr = C.ALL_GROUPS.some(g => g.name === attr);
        if (!isRowAttr && !isGroupAttr) return 0;

        let total = 0;
        const rows = App.state.rows;

        if (isRowAttr) {
            const rowIdx = C.ROW_NAMES.indexOf(attr);
            const row = rows[rowIdx];
            if (!row) return 0;
            region.groups.forEach(groupName => {
                const gi = C.ALL_GROUPS.findIndex(g => g.name === groupName);
                if (gi < 0) return;
                main3.forEach(mainAttr => {
                    const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                    if (si < 0) return;
                    const colIndex = App.utils.getColumnIndex(gi, si);
                    const cell = App.utils.normalizeCell(row.data[colIndex]);
                    total += getUnacquiredScore(cell);
                });
            });
        } else {
            const gi = C.ALL_GROUPS.findIndex(g => g.name === attr);
            if (gi < 0) return 0;
            region.rows.forEach(rowName => {
                const rowIdx = C.ROW_NAMES.indexOf(rowName);
                if (rowIdx < 0) return;
                const row = rows[rowIdx];
                if (!row) return;
                main3.forEach(mainAttr => {
                    const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                    if (si < 0) return;
                    const colIndex = App.utils.getColumnIndex(gi, si);
                    const cell = App.utils.normalizeCell(row.data[colIndex]);
                    total += getUnacquiredScore(cell);
                });
            });
        }
        return total;
    }

    App.unacquired = {
        _highlightedCells: [],
        _hoveredLi: null,
        _eventsBound: false,

        getFilteredRegions() {
            const allRegions = App.storage.getRegions();
            const saved = App.storage.getUnacquiredRegionFilter();
            if (saved === null) return allRegions;
            const selectedSet = new Set(saved);
            return allRegions.filter(r => selectedSet.has(r.name));
        },

        renderRegionFilter() {
            const container = App.dom.regionFilterCheckboxes;
            if (!container) return;

            const allRegions = App.storage.getRegions();
            const saved = App.storage.getUnacquiredRegionFilter();
            const selectedSet = saved === null
                ? new Set(allRegions.map(r => r.name))
                : new Set(saved);

            container.innerHTML = allRegions.map(r => {
                const checked = selectedSet.has(r.name) ? 'checked' : '';
                return `<label class="region-filter-item">
                    <input type="checkbox" value="${App.utils.escapeHtml(r.name)}" ${checked}>
                    <span>${App.utils.escapeHtml(r.name)}</span>
                </label>`;
            }).join('');

            this._updateRegionFilterCount(selectedSet.size, allRegions.length);
        },

        _updateRegionFilterCount(selected, total) {
            const el = App.dom.regionFilterCount;
            if (!el) return;
            if (selected === total) el.textContent = `全部 (${total})`;
            else if (selected === 0) el.textContent = '未选';
            else el.textContent = `${selected}/${total}`;
        },

        _applyFilterChange() {
            const checkboxes = App.dom.regionFilterCheckboxes.querySelectorAll('input[type="checkbox"]');
            const selected = [];
            checkboxes.forEach(cb => { if (cb.checked) selected.push(cb.value); });
            const allRegions = App.storage.getRegions();

            if (selected.length === allRegions.length) {
                App.storage.saveUnacquiredRegionFilter(null);
            } else {
                App.storage.saveUnacquiredRegionFilter(selected);
            }

            this._updateRegionFilterCount(selected.length, allRegions.length);
            this.renderList();
        },

        _getComboCells(region, main3, attr) {
            const C = App.constants;
            const cells = [];
            const isRowAttr = C.ROW_NAMES.includes(attr);

            if (isRowAttr) {
                const rowIdx = C.ROW_NAMES.indexOf(attr);
                if (rowIdx < 0) return cells;
                region.groups.forEach(groupName => {
                    const gi = C.ALL_GROUPS.findIndex(g => g.name === groupName);
                    if (gi < 0) return;
                    main3.forEach(mainAttr => {
                        const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                        if (si < 0) return;
                        cells.push({
                            rowIdx,
                            colIndex: App.utils.getColumnIndex(gi, si)
                        });
                    });
                });
            } else {
                const gi = C.ALL_GROUPS.findIndex(g => g.name === attr);
                if (gi < 0) return cells;
                region.rows.forEach(rowName => {
                    const rowIdx = C.ROW_NAMES.indexOf(rowName);
                    if (rowIdx < 0) return;
                    main3.forEach(mainAttr => {
                        const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                        if (si < 0) return;
                        cells.push({
                            rowIdx,
                            colIndex: App.utils.getColumnIndex(gi, si)
                        });
                    });
                });
            }
            return cells;
        },

        /**
         * 计算组合的完成度
         * @param {Array} cells - 该组合的所有候选格坐标
         * @returns {{completed: number, total: number, percent: number}}
         */
        _calcProgress(cells) {
            let completed = 0;
            cells.forEach(({ rowIdx, colIndex }) => {
                const rowData = App.state.rows[rowIdx]?.data;
                if (!rowData) return;
                const cell = App.utils.normalizeCell(rowData[colIndex]);
                // 完全获取：实装已刷满，或仅有普通数值
                if (cell.t > 0 && cell.a === cell.t) completed++;
                else if (cell.t === 0 && cell.v !== '') completed++;
            });
            const total = cells.length || 1;
            return {
                completed,
                total,
                percent: Math.round((completed / total) * 100)
            };
        },

        /** 根据百分比返回档位类名 */
        _progressClass(percent) {
            if (percent >= 70) return 'progress-high';
            if (percent >= 30) return 'progress-mid';
            return 'progress-low';
        },

        _applyDimming() {
            const hasAnyHighlight = this._highlightedCells.length > 0;
            ['tableBody1', 'tableBody2'].forEach(id => {
                const body = document.getElementById(id);
                if (!body) return;
                const table = body.closest('table');
                if (!table) return;
                table.classList.toggle('unacquired-dimming', hasAnyHighlight);
            });
        },

        _removeDimming() {
            document.querySelectorAll('table.unacquired-dimming')
                .forEach(t => t.classList.remove('unacquired-dimming'));
        },

        _highlightComboCells(regionName, main3Str, attr) {
            this._clearHighlight();

            const regions = App.storage.getRegions();
            const region = regions.find(r => r.name === regionName);
            if (!region) return;

            const main3 = main3Str.split('-');
            const cells = this._getComboCells(region, main3, attr);

            this._highlightedCells = [];
            let firstUnacquiredTd = null;

            cells.forEach(({ rowIdx, colIndex }) => {
                const rowData = App.state.rows[rowIdx]?.data;
                if (!rowData) return;
                const cell = App.utils.normalizeCell(rowData[colIndex]);
                const score = getUnacquiredScore(cell);
                const td = document.querySelector(
                    `td[data-rowindex="${rowIdx}"][data-colindex="${colIndex}"]`
                );
                if (!td) return;

                if (score > 0) {
                    td.classList.add('unacquired-cell-highlight');
                    if (!firstUnacquiredTd) firstUnacquiredTd = td;
                } else {
                    td.classList.add('acquired-cell-highlight');
                }
                this._highlightedCells.push(td);
            });

            this._applyDimming();

            const scrollTarget = firstUnacquiredTd
                || (this._highlightedCells.length > 0 ? this._highlightedCells[0] : null);
            if (scrollTarget) {
                scrollTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        },

        _clearHighlight() {
            if (this._highlightedCells && this._highlightedCells.length > 0) {
                this._highlightedCells.forEach(td => {
                    td.classList.remove('unacquired-cell-highlight');
                    td.classList.remove('acquired-cell-highlight');
                });
            }
            this._highlightedCells = [];
            this._removeDimming();
        },

        /**
         * 渲染未获取统计（按地区独立 + 三行展示 + 进度条）
         */
        renderList() {
            const C = App.constants;
            const container = App.dom.unacquiredContent;
            if (!container) return;

            this._clearHighlight();
            this._hoveredLi = null;

            const regions = this.getFilteredRegions();
            if (regions.length === 0) {
                container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">请在筛选区勾选至少一个地区</p>';
                return;
            }

            const mainCombos = combinations(C.SUB_ATTRS, 3);

            // 按地区独立收集
            const items = [];
            regions.forEach(region => {
                region.rows.forEach(rowName => {
                    mainCombos.forEach(main3 => {
                        const count = countUnacquired(region, main3, rowName);
                        if (count > 0) {
                            const cells = this._getComboCells(region, main3, rowName);
                            const progress = this._calcProgress(cells);
                            items.push({
                                region: region.name,
                                main3: main3.join('-'),
                                attr: rowName,
                                count,
                                progress
                            });
                        }
                    });
                });
                region.groups.forEach(groupName => {
                    mainCombos.forEach(main3 => {
                        const count = countUnacquired(region, main3, groupName);
                        if (count > 0) {
                            const cells = this._getComboCells(region, main3, groupName);
                            const progress = this._calcProgress(cells);
                            items.push({
                                region: region.name,
                                main3: main3.join('-'),
                                attr: groupName,
                                count,
                                progress
                            });
                        }
                    });
                });
            });

            if (items.length === 0) {
                container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">🎉 所选地区已全部获取</p>';
                return;
            }

            items.sort((a, b) => b.count - a.count);
            const top = items.slice(0, TOP_N);

            let html = `<div class="unacquired-summary">前 <b>${top.length}</b> 名（共 <b>${items.length}</b> 项）</div>`;
            html += '<ul class="unacquired-top-list">';

            top.forEach((item, idx) => {
                const progressClass = this._progressClass(item.progress.percent);
                html += `<li class="unacquired-top-item"
                    data-region="${App.utils.escapeHtml(item.region)}"
                    data-mains="${App.utils.escapeHtml(item.main3)}"
                    data-attr="${App.utils.escapeHtml(item.attr)}">
                    <span class="unacquired-rank">${idx + 1}</span>
                    <div class="unacquired-top-content">
                        <div class="unacquired-top-desc">${App.utils.escapeHtml(item.main3)}/${App.utils.escapeHtml(item.attr)}</div>
                        <div class="unacquired-top-region">${App.utils.escapeHtml(item.region)}</div>
                        <div class="unacquired-progress-wrap">
                            <div class="unacquired-progress-bar">
                                <div class="unacquired-progress-fill ${progressClass}" style="width:${item.progress.percent}%"></div>
                            </div>
                            <span class="unacquired-progress-text">${item.progress.percent}%</span>
                        </div>
                    </div>
                    <span class="unacquired-top-count">未获取：${item.count}</span>
                </li>`;
            });

            html += '</ul>';
            container.innerHTML = html;
        },

        bindRegionFilterEvents() {
            const dom = App.dom;
            if (this._eventsBound) return;
            this._eventsBound = true;

            // ---------- 筛选区事件 ----------
            if (dom.regionFilterCheckboxes) {
                dom.regionFilterCheckboxes.addEventListener('change', (e) => {
                    if (e.target.matches('input[type="checkbox"]')) {
                        this._applyFilterChange();
                    }
                });
            }
            if (dom.btnRegionFilterAll) {
                dom.btnRegionFilterAll.addEventListener('click', () => {
                    if (!dom.regionFilterCheckboxes) return;
                    dom.regionFilterCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
                    this._applyFilterChange();
                });
            }
            if (dom.btnRegionFilterNone) {
                dom.btnRegionFilterNone.addEventListener('click', () => {
                    if (!dom.regionFilterCheckboxes) return;
                    dom.regionFilterCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    this._applyFilterChange();
                });
            }

            // ---------- 悬停高亮事件 ----------
            if (dom.unacquiredContent) {
                dom.unacquiredContent.addEventListener('mouseover', (e) => {
                    const li = e.target.closest('.unacquired-top-item');
                    if (!li) return;
                    if (this._hoveredLi === li) return;
                    this._hoveredLi = li;
                    this._highlightComboCells(
                        li.dataset.region,
                        li.dataset.mains,
                        li.dataset.attr
                    );
                });

                dom.unacquiredContent.addEventListener('mouseout', (e) => {
                    const li = e.target.closest('.unacquired-top-item');
                    if (!li) return;
                    if (e.relatedTarget && li.contains(e.relatedTarget)) return;
                    this._hoveredLi = null;
                    this._clearHighlight();
                });

                dom.unacquiredContent.addEventListener('mouseleave', () => {
                    this._hoveredLi = null;
                    this._clearHighlight();
                });
            }
        }
    };

})(window.App = window.App || {});