/**
 * unacquired.js - 未获取基质统计（前 36 名 + 地区筛选 + 双色悬停高亮 + 变暗蒙版 + 进度条）
 * 挂载到 App.unacquired
 *
 * v0.9.2 重构：
 *   - 高亮逻辑改为调用 App.cellHighlighter（统一控制器）
 *   - combinations / getUnacquiredScore 抽取至 App.utils
 *   - 移除本模块内的 _applyDimming / _removeDimming / _highlightedCells
 */
(function (App) {
    'use strict';

    const TOP_N = 36;

    App.unacquired = {
        _hoveredLi: null,
        _eventsBound: false,

        // ==================== 内部：计算 ====================

        /** 计算某地区、某组合下的未获取缺口总数 */
        _countUnacquired(region, main3, attr) {
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
                        total += App.utils.getUnacquiredScore(cell);
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
                        total += App.utils.getUnacquiredScore(cell);
                    });
                });
            }
            return total;
        },

        /** 获取指定组合对应的所有单元格坐标 */
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

        /** 计算组合的完成度 */
        _calcProgress(cells) {
            let completed = 0;
            cells.forEach(({ rowIdx, colIndex }) => {
                const rowData = App.state.rows[rowIdx]?.data;
                if (!rowData) return;
                const cell = App.utils.normalizeCell(rowData[colIndex]);
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

        /** 百分比 → 档位 class */
        _progressClass(percent) {
            if (percent >= 70) return 'progress-high';
            if (percent >= 30) return 'progress-mid';
            return 'progress-low';
        },

        // ==================== 公共 API ====================

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

        /** 清除高亮（转发到 cellHighlighter） */
        _clearHighlight() {
            App.cellHighlighter.clear();
        },

        /** 高亮指定地区、组合的未获取格 */
        _highlightComboCells(regionName, main3Str, attr) {
            const regions = App.storage.getRegions();
            const region = regions.find(r => r.name === regionName);
            if (!region) return;

            const main3 = main3Str.split('-');
            const cells = this._getComboCells(region, main3, attr);

            const cellList = [];
            cells.forEach(({ rowIdx, colIndex }) => {
                const rowData = App.state.rows[rowIdx]?.data;
                if (!rowData) return;
                const cell = App.utils.normalizeCell(rowData[colIndex]);
                cellList.push({
                    rowIdx,
                    colIndex,
                    isUnacquired: App.utils.getUnacquiredScore(cell) > 0
                });
            });

            App.cellHighlighter.highlight(cellList);
        },

        // ==================== 渲染 ====================

        renderList() {
            const C = App.constants;
            const container = App.dom.unacquiredContent;
            if (!container) return;

            App.cellHighlighter.clear();
            this._hoveredLi = null;

            const regions = this.getFilteredRegions();
            if (regions.length === 0) {
                container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">请在筛选区勾选至少一个地区</p>';
                return;
            }

            const mainCombos = App.utils.combinations(C.SUB_ATTRS, 3);

            const items = [];
            regions.forEach(region => {
                region.rows.forEach(rowName => {
                    mainCombos.forEach(main3 => {
                        const count = this._countUnacquired(region, main3, rowName);
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
                        const count = this._countUnacquired(region, main3, groupName);
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

        // ==================== 事件绑定 ====================

        bindRegionFilterEvents() {
            const dom = App.dom;
            if (this._eventsBound) return;
            this._eventsBound = true;

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
                    App.cellHighlighter.clear();
                });

                dom.unacquiredContent.addEventListener('mouseleave', () => {
                    this._hoveredLi = null;
                    App.cellHighlighter.clear();
                });
            }
        }
    };

})(window.App = window.App || {});