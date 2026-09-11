/**
 * unacquired.js - 未获取基质统计（排序列表 + 三模式切换 + 地区筛选 + 双色悬停高亮 + 变暗蒙版 + 进度条 + 检索系统 + 双击锁定）
 * 挂载到 App.unacquired
 *
 * v0.9.2：高亮委托给 App.cellHighlighter
 * v0.9.6：新增列索引 Map 与单元格缓存
 * v0.9.13：新增刷取组合检索系统；新增三种显示模式切换；新增双击锁定高亮
 */
(function (App) {
    'use strict';

    const TOP_N = 36;

    // ==================== 模块级缓存 ====================
    let _colIndexMap = null;
    let _cellCache = null;

    function ensureColIndexMap() {
        if (_colIndexMap) return _colIndexMap;
        const C = App.constants;
        _colIndexMap = {};
        let offset = 0;
        C.ALL_GROUPS.forEach(group => {
            _colIndexMap[group.name] = {};
            group.sub.forEach((sub, sIdx) => {
                _colIndexMap[group.name][sub] = offset + sIdx;
            });
            offset += group.sub.length;
        });
        return _colIndexMap;
    }

    function buildCellCache() {
        const rows = App.state.rows;
        _cellCache = rows.map(row => row.data.map(c => App.utils.normalizeCell(c)));
    }

    function releaseCellCache() {
        _cellCache = null;
    }

    function getCachedCell(rowIdx, colIdx) {
        const row = _cellCache && _cellCache[rowIdx];
        return row ? row[colIdx] : null;
    }

    App.unacquired = {
        _hoveredLi: null,
        _eventsBound: false,
        _searchEventsBound: false,
        _modeTabEventsBound: false,
        /** 当前显示模式：'top' | 'bottom' | 'full' */
        _mode: 'top',
        /** 双击锁定的 <li> 元素（持久高亮） */
        _lockedLi: null,
        /** 锁定卡片下方插入的取消按钮 <li> 元素 */
        _lockedBtnLi: null,

        invalidateCache() {
            _cellCache = null;
        },

        // ==================== 内部：计算 ====================

        _countUnacquired(region, main3, attr) {
            const C = App.constants;
            const colMap = ensureColIndexMap();
            const isRowAttr = C.ROW_NAMES.includes(attr);
            const isGroupAttr = C.ALL_GROUPS.some(g => g.name === attr);
            if (!isRowAttr && !isGroupAttr) return 0;

            let total = 0;

            if (isRowAttr) {
                const rowIdx = C.ROW_NAMES.indexOf(attr);
                if (rowIdx < 0) return 0;
                region.groups.forEach(groupName => {
                    const colBySub = colMap[groupName];
                    if (!colBySub) return;
                    main3.forEach(mainAttr => {
                        const colIndex = colBySub[mainAttr];
                        if (colIndex === undefined) return;
                        const cell = getCachedCell(rowIdx, colIndex);
                        if (cell) total += App.utils.getUnacquiredScore(cell);
                    });
                });
            } else {
                const colBySub = colMap[attr];
                if (!colBySub) return 0;
                region.rows.forEach(rowName => {
                    const rowIdx = C.ROW_NAMES.indexOf(rowName);
                    if (rowIdx < 0) return;
                    main3.forEach(mainAttr => {
                        const colIndex = colBySub[mainAttr];
                        if (colIndex === undefined) return;
                        const cell = getCachedCell(rowIdx, colIndex);
                        if (cell) total += App.utils.getUnacquiredScore(cell);
                    });
                });
            }
            return total;
        },

        _getComboCells(region, main3, attr) {
            const C = App.constants;
            const colMap = ensureColIndexMap();
            const cells = [];
            const isRowAttr = C.ROW_NAMES.includes(attr);

            if (isRowAttr) {
                const rowIdx = C.ROW_NAMES.indexOf(attr);
                if (rowIdx < 0) return cells;
                region.groups.forEach(groupName => {
                    const colBySub = colMap[groupName];
                    if (!colBySub) return;
                    main3.forEach(mainAttr => {
                        const colIndex = colBySub[mainAttr];
                        if (colIndex === undefined) return;
                        cells.push({ rowIdx, colIndex });
                    });
                });
            } else {
                const colBySub = colMap[attr];
                if (!colBySub) return cells;
                region.rows.forEach(rowName => {
                    const rowIdx = C.ROW_NAMES.indexOf(rowName);
                    if (rowIdx < 0) return;
                    main3.forEach(mainAttr => {
                        const colIndex = colBySub[mainAttr];
                        if (colIndex === undefined) return;
                        cells.push({ rowIdx, colIndex });
                    });
                });
            }
            return cells;
        },

        _calcProgress(cells) {
            let completed = 0;
            cells.forEach(({ rowIdx, colIndex }) => {
                const cell = getCachedCell(rowIdx, colIndex);
                if (!cell) return;
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

        _clearHighlight() {
            App.cellHighlighter.clear();
        },

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

        // ==================== 锁定高亮（v0.9.13） ====================

        /**
         * 锁定一个列表项：持续高亮 + 在其下方插入"取消高亮"按钮
         * @param {HTMLElement} li - 目标 <li>
         */
        _lockItem(li) {
            // 若点击的正是当前锁定项，忽略
            if (this._lockedLi === li) return;

            // 先解除旧锁定（不清理高亮，因为马上会重新高亮）
            this._unlockItem(false);

            this._lockedLi = li;

            // 高亮该条目
            this._highlightComboCells(li.dataset.region, li.dataset.mains, li.dataset.attr);

            // 插入取消按钮（作为 li 的下一个兄弟 <li>）
            const cancelLi = document.createElement('li');
            cancelLi.className = 'unacquired-cancel-wrap';
            cancelLi.innerHTML = '<button type="button" class="unacquired-cancel-btn">取消高亮</button>';
            li.insertAdjacentElement('afterend', cancelLi);
            this._lockedBtnLi = cancelLi;
        },

        /**
         * 解除锁定
         * @param {boolean} [clearHighlight=true] - 是否同时清除表格高亮
         */
        _unlockItem(clearHighlight = true) {
            if (this._lockedBtnLi && this._lockedBtnLi.parentNode) {
                this._lockedBtnLi.remove();
            }
            this._lockedBtnLi = null;
            this._lockedLi = null;

            if (clearHighlight) {
                App.cellHighlighter.clear();
            }
        },

        // ==================== 显示模式切换（v0.9.13） ====================

        setMode(mode) {
            if (mode !== 'top' && mode !== 'bottom' && mode !== 'full') return;
            if (this._mode === mode) return;
            this._mode = mode;

            const dom = App.dom;
            if (dom.unacquiredModeTabs) {
                dom.unacquiredModeTabs.querySelectorAll('.unacquired-mode-tab').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === mode);
                });
            }
            this.renderList();
        },

        bindModeTabEvents() {
            const dom = App.dom;
            if (!dom.unacquiredModeTabs) return;
            if (this._modeTabEventsBound) return;
            this._modeTabEventsBound = true;

            dom.unacquiredModeTabs.addEventListener('click', (e) => {
                const btn = e.target.closest('.unacquired-mode-tab');
                if (!btn) return;
                const mode = btn.dataset.mode;
                if (!mode) return;
                this.setMode(mode);
            });
        },

        // ==================== 检索系统（v0.9.13） ====================

        initSearch() {
            const dom = App.dom;
            if (!dom.searchRegion) return;

            const regions = App.storage.getRegions();
            dom.searchRegion.innerHTML = regions.map(r =>
                `<option value="${App.utils.escapeHtml(r.name)}">${App.utils.escapeHtml(r.name)}</option>`
            ).join('');

            this._updateSearchCombos();
            this._updateSearchItems();
        },

        _updateSearchItems() {
            const dom = App.dom;
            if (!dom.searchItem || !dom.searchRegion || !dom.searchType) return;

            const regionName = dom.searchRegion.value;
            const type = dom.searchType.value;
            const region = App.storage.getRegions().find(r => r.name === regionName);

            if (!region) {
                dom.searchItem.innerHTML = '';
                return;
            }

            const items = type === 'row' ? region.rows : region.groups;
            dom.searchItem.innerHTML = items.map(i =>
                `<option value="${App.utils.escapeHtml(i)}">${App.utils.escapeHtml(i)}</option>`
            ).join('');
        },

        _updateSearchCombos() {
            const dom = App.dom;
            if (!dom.searchCombo) return;

            const combos = App.utils.combinations(App.constants.SUB_ATTRS, 3);
            dom.searchCombo.innerHTML = combos.map(c =>
                `<option value="${c.join('-')}">${c.join('-')}</option>`
            ).join('');
        },

        doSearch() {
            const dom = App.dom;
            const regionName = dom.searchRegion.value;
            const item = dom.searchItem.value;
            const combo = dom.searchCombo.value;

            if (!regionName || !item || !combo) {
                App.modal.showAlert('请完整选择地区、类型、目标、能力值组合', '提示');
                return;
            }

            const region = App.storage.getRegions().find(r => r.name === regionName);
            if (!region) return;

            const main3 = combo.split('-');

            buildCellCache();
            const count = this._countUnacquired(region, main3, item);
            const cells = this._getComboCells(region, main3, item);
            const progress = this._calcProgress(cells);
            releaseCellCache();

            // 清除旧锁定（检索结果将替换 DOM）
            this._unlockItem(false);

            this._renderSearchResult({ regionName, item, combo, count, progress });

            const cellList = cells.map(({ rowIdx, colIndex }) => {
                const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIndex]);
                return {
                    rowIdx,
                    colIndex,
                    isUnacquired: App.utils.getUnacquiredScore(cell) > 0
                };
            });
            App.cellHighlighter.highlight(cellList);
        },

        _renderSearchResult(info) {
            const dom = App.dom;
            if (!dom.searchResult) return;

            const progressClass = this._progressClass(info.progress.percent);

            dom.searchResult.style.display = 'block';
            dom.searchResult.innerHTML = `
                <div class="search-result-header">
                    <span>🔍 检索结果</span>
                </div>
                <ul class="unacquired-top-list">
                    <li class="unacquired-top-item unacquired-search-item"
                        data-region="${App.utils.escapeHtml(info.regionName)}"
                        data-mains="${App.utils.escapeHtml(info.combo)}"
                        data-attr="${App.utils.escapeHtml(info.item)}">
                        <span class="unacquired-rank">🔍</span>
                        <div class="unacquired-top-content">
                            <div class="unacquired-top-desc">${App.utils.escapeHtml(info.combo)}/${App.utils.escapeHtml(info.item)}</div>
                            <div class="unacquired-top-region">${App.utils.escapeHtml(info.regionName)}</div>
                            <div class="unacquired-progress-wrap">
                                <div class="unacquired-progress-bar">
                                    <div class="unacquired-progress-fill ${progressClass}" style="width:${info.progress.percent}%"></div>
                                </div>
                                <span class="unacquired-progress-text">${info.progress.percent}%</span>
                            </div>
                        </div>
                        <span class="unacquired-top-count">未获取：${info.count}</span>
                    </li>
                </ul>`;
        },

        clearSearch() {
            const dom = App.dom;
            this._unlockItem(false);
            if (dom.searchResult) {
                dom.searchResult.style.display = 'none';
                dom.searchResult.innerHTML = '';
            }
            App.cellHighlighter.clear();
        },

        // ==================== 渲染（排序列表 + 三模式） ====================

        renderList() {
            const C = App.constants;
            const container = App.dom.unacquiredContent;
            if (!container) return;

            // 重渲染前清除锁定与高亮
            this._unlockItem(false);
            App.cellHighlighter.clear();
            this._hoveredLi = null;

            const regions = this.getFilteredRegions();
            if (regions.length === 0) {
                container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">请在筛选区勾选至少一个地区</p>';
                return;
            }

            buildCellCache();

            const mainCombos = App.utils.combinations(C.SUB_ATTRS, 3);

            const allItems = [];
            regions.forEach(region => {
                region.rows.forEach(rowName => {
                    mainCombos.forEach(main3 => {
                        const count = this._countUnacquired(region, main3, rowName);
                        const cells = this._getComboCells(region, main3, rowName);
                        const progress = this._calcProgress(cells);
                        allItems.push({
                            region: region.name,
                            main3: main3.join('-'),
                            attr: rowName,
                            count,
                            progress
                        });
                    });
                });
                region.groups.forEach(groupName => {
                    mainCombos.forEach(main3 => {
                        const count = this._countUnacquired(region, main3, groupName);
                        const cells = this._getComboCells(region, main3, groupName);
                        const progress = this._calcProgress(cells);
                        allItems.push({
                            region: region.name,
                            main3: main3.join('-'),
                            attr: groupName,
                            count,
                            progress
                        });
                    });
                });
            });

            releaseCellCache();

            const mode = this._mode || 'top';
            let displayItems;
            let summaryHtml;

            if (mode === 'top') {
                const withUnacquired = allItems.filter(it => it.count > 0);
                if (withUnacquired.length === 0) {
                    container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">🎉 所选地区已全部获取</p>';
                    return;
                }
                withUnacquired.sort((a, b) => b.count - a.count);
                displayItems = withUnacquired.slice(0, TOP_N);
                summaryHtml = `未获取前 <b>${displayItems.length}</b> 名（共 <b>${withUnacquired.length}</b> 项）`;
            } else if (mode === 'bottom') {
                const withUnacquired = allItems.filter(it => it.count > 0);
                if (withUnacquired.length === 0) {
                    container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">🎉 所选地区已全部获取</p>';
                    return;
                }
                withUnacquired.sort((a, b) => a.count - b.count);
                displayItems = withUnacquired.slice(0, TOP_N);
                summaryHtml = `未获取后 <b>${displayItems.length}</b> 名（共 <b>${withUnacquired.length}</b> 项）`;
            } else {
                const fullItems = allItems.filter(it => it.count === 0);
                if (fullItems.length === 0) {
                    container.innerHTML = '<p class="input-hint" style="text-align:center; padding:24px 0;">暂未完全收集任何组合</p>';
                    return;
                }
                displayItems = fullItems;
                summaryHtml = `全收集 <b>${displayItems.length}</b> 项`;
            }

            let html = `<div class="unacquired-summary">${summaryHtml}</div>`;
            html += '<ul class="unacquired-top-list">';

            displayItems.forEach((item, idx) => {
                const progressClass = this._progressClass(item.progress.percent);
                let rankHtml;

                if (mode === 'full') {
                    rankHtml = '<span class="unacquired-rank">✓</span>';
                } else {
                    rankHtml = `<span class="unacquired-rank">${idx + 1}</span>`;
                }

                html += `<li class="unacquired-top-item"
                    data-region="${App.utils.escapeHtml(item.region)}"
                    data-mains="${App.utils.escapeHtml(item.main3)}"
                    data-attr="${App.utils.escapeHtml(item.attr)}">
                    ${rankHtml}
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
                this._bindListInteractions(dom.unacquiredContent);
            }
        },

        /**
         * 绑定列表容器的全部交互（悬停 / 双击锁定 / 取消按钮）
         * 供排序列表与检索结果共用
         */
        _bindListInteractions(container) {
            // ---- 悬停高亮 ----
            container.addEventListener('mouseover', (e) => {
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

            container.addEventListener('mouseout', (e) => {
                const li = e.target.closest('.unacquired-top-item');
                if (!li) return;
                if (e.relatedTarget && li.contains(e.relatedTarget)) return;
                this._hoveredLi = null;

                // 优先恢复锁定高亮
                if (this._lockedLi) {
                    this._highlightComboCells(
                        this._lockedLi.dataset.region,
                        this._lockedLi.dataset.mains,
                        this._lockedLi.dataset.attr
                    );
                } else {
                    App.cellHighlighter.clear();
                }
            });

            container.addEventListener('mouseleave', () => {
                this._hoveredLi = null;

                if (this._lockedLi) {
                    this._highlightComboCells(
                        this._lockedLi.dataset.region,
                        this._lockedLi.dataset.mains,
                        this._lockedLi.dataset.attr
                    );
                } else {
                    App.cellHighlighter.clear();
                }
            });

            // ---- 双击锁定 ----
            container.addEventListener('dblclick', (e) => {
                // 点击取消按钮时不锁定
                if (e.target.closest('.unacquired-cancel-btn')) return;
                const li = e.target.closest('.unacquired-top-item');
                if (!li) return;
                this._lockItem(li);
            });

            // ---- 取消按钮点击（事件委托） ----
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('.unacquired-cancel-btn');
                if (!btn) return;
                e.stopPropagation();
                this._unlockItem(true);
            });
        },

        bindSearchEvents() {
            const dom = App.dom;
            if (this._searchEventsBound) return;
            this._searchEventsBound = true;

            if (dom.searchRegion) {
                dom.searchRegion.addEventListener('change', () => this._updateSearchItems());
            }
            if (dom.searchType) {
                dom.searchType.addEventListener('change', () => this._updateSearchItems());
            }
            if (dom.btnSearch) {
                dom.btnSearch.addEventListener('click', () => this.doSearch());
            }
            if (dom.btnClearSearch) {
                dom.btnClearSearch.addEventListener('click', () => this.clearSearch());
            }

            if (dom.searchResult) {
                this._bindListInteractions(dom.searchResult);
            }

            [dom.searchRegion, dom.searchType, dom.searchItem, dom.searchCombo].forEach(el => {
                if (el) App.utils.enableWheelSelect(el);
            });
        }
    };

})(window.App = window.App || {});