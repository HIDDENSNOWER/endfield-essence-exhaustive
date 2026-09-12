/**
 * stats.js - 统计面板
 * 挂载到 App.stats
 */
/* global cancelAnimationFrame */
(function (App) {
    'use strict';

    // ==================== 模块状态 ====================
    let _datasetKey = null;
    let _dimension = 'sub';
    const _filters = { sub: new Set(), row: new Set(), group: new Set() };
    const _listLimit = 150;
    let _bound = false;

    const STATUS_TEXT = { has: '已拥有', none: '未获取', partial: '部分获取', full: '全部获取' };
    const STATUS_ORDER = { has: 0, partial: 1, full: 2, none: 3 };

    // ==================== 右列宽度（可拖动） ====================
    const RIGHT_WIDTH_KEY = 'smarttable_stats_right_width';
    const DEFAULT_RIGHT = 400;
    const MIN_RIGHT = 280;
    const MAX_RIGHT = 720;

    const LOCKED_KEY = 'smarttable_stats_right_locked';

    function loadLocked() {
        try {
            return localStorage.getItem(LOCKED_KEY) === '1';
        } catch (_e) {
            return false;
        }
    }

    function saveLocked(v) {
        try {
            localStorage.setItem(LOCKED_KEY, v ? '1' : '0');
        } catch (_e) {
            /* 静默 */
        }
    }

    function loadRightWidth() {
        try {
            const v = parseInt(localStorage.getItem(RIGHT_WIDTH_KEY) || '', 10);
            if (!isNaN(v) && v >= MIN_RIGHT && v <= MAX_RIGHT) return v;
        } catch (_e) {
            /* 静默 */
        }
        return DEFAULT_RIGHT;
    }

    function applyRightWidth(px) {
        const clamped = Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, px));
        document.documentElement.style.setProperty('--stats-right-width', clamped + 'px');
        return clamped;
    }

    function saveRightWidth(px) {
        try {
            localStorage.setItem(RIGHT_WIDTH_KEY, String(px));
        } catch (_e) {
            /* 静默 */
        }
    }

    // ==================== 辅助 ====================
    function getRowsForStat() {
        const key = _datasetKey || App.storage.loadCurrentDatasetKey();
        const raw = App.storage.getJSON(key, null);
        if (!Array.isArray(raw) || raw.length === 0) return [];
        return raw.map((r) => ({
            name: r.name,
            data: (r.data || []).map((c) => App.utils.normalizeCell(c))
        }));
    }

    function getStatus(cell) {
        const t = cell.t || 0;
        const a = cell.a || 0;
        if (t > 0) {
            if (a === 0) return 'none';
            if (a < t) return 'partial';
            return 'full';
        }
        return cell.v ? 'has' : 'none';
    }

    function newBucket(name) {
        return { name, total: 0, has: 0, none: 0, partial: 0, full: 0 };
    }

    function getRegionsForCell(rowName, groupName) {
        const regions = App.storage.getRegions();
        const out = [];
        regions.forEach((r) => {
            const hasRow = r.rows.includes(rowName);
            const hasGroup = r.groups.includes(groupName);
            if (!hasRow || !hasGroup) return;
            out.push({
                regionName: r.name,
                methods: [{ label: `选「${rowName}」属性` }, { label: `选「${groupName}」系列技能` }]
            });
        });
        return out;
    }

    function shortRowName(name) {
        const s = String(name);
        return s.endsWith('提升') ? s.slice(0, -2) : s;
    }

    function calcOverviewStats(rows) {
        let totalCells = 0;
        let emptyCells = 0;
        let filledCells = 0;
        let fullCells = 0;
        let partialCells = 0;
        let totalEssence = 0;
        let ownedEssence = 0;

        rows.forEach((row) => {
            row.data.forEach((cell) => {
                totalCells++;
                const t = cell.t || 0;
                const a = cell.a || 0;
                const hasV = !!cell.v;

                if (t === 0 && !hasV) {
                    emptyCells++;
                } else if (t === 0 && hasV) {
                    filledCells += 1;
                    fullCells++;
                } else if (t > 0 && a === 0) {
                    emptyCells++;
                } else if (t > 0 && a >= t) {
                    filledCells += 1;
                    fullCells++;
                } else {
                    filledCells += a / t;
                    partialCells++;
                }

                totalEssence += Math.max(1, t);
                if (t > 0) ownedEssence += a;
                else if (hasV) ownedEssence += 1;
            });
        });

        return {
            totalCells,
            emptyCells,
            filledCells,
            fullCells,
            partialCells,
            totalEssence,
            ownedEssence,
            missingEssence: totalEssence - ownedEssence
        };
    }

    function calcGroupStats(rows) {
        const groups = App.constants.ALL_GROUPS;
        const result = groups.map((g) => ({
            name: g.name,
            totalCells: 0,
            emptyCells: 0,
            filledCells: 0,
            fullCells: 0,
            partialCells: 0,
            totalEssence: 0,
            ownedEssence: 0
        }));

        rows.forEach((row, rowIdx) => {
            row.data.forEach((cell, colIndex) => {
                const names = App.utils.getCellNames(rowIdx, colIndex);
                if (!names || names.groupName === '?') return;
                const gi = groups.findIndex((g) => g.name === names.groupName);
                if (gi < 0) return;

                const g = result[gi];
                const t = cell.t || 0;
                const a = cell.a || 0;
                const hasV = !!cell.v;

                g.totalCells++;

                if (t === 0 && !hasV) {
                    g.emptyCells++;
                } else if (t === 0 && hasV) {
                    g.filledCells += 1;
                    g.fullCells++;
                } else if (t > 0 && a === 0) {
                    g.emptyCells++;
                } else if (t > 0 && a >= t) {
                    g.filledCells += 1;
                    g.fullCells++;
                } else {
                    g.filledCells += a / t;
                    g.partialCells++;
                }

                g.totalEssence += Math.max(1, t);
                if (t > 0) g.ownedEssence += a;
                else if (hasV) g.ownedEssence += 1;
            });
        });

        const total = {
            name: '合计',
            totalCells: 0,
            emptyCells: 0,
            filledCells: 0,
            fullCells: 0,
            partialCells: 0,
            totalEssence: 0,
            ownedEssence: 0
        };
        result.forEach((g) => {
            total.totalCells += g.totalCells;
            total.emptyCells += g.emptyCells;
            total.filledCells += g.filledCells;
            total.fullCells += g.fullCells;
            total.partialCells += g.partialCells;
            total.totalEssence += g.totalEssence;
            total.ownedEssence += g.ownedEssence;
        });

        return { list: result, total };
    }

    function fmtNum(n) {
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }

    // ==================== 主模块 ====================
    App.stats = {
        renderStats() {
            const container = App.dom.statsContent;
            if (!container) return;
            this._ensureUI(container);
            this._renderAll();
        },

        // ---------- 骨架（幂等） ----------
        _ensureUI(container) {
            if (container.dataset.statsBuilt === '1') return;
            container.dataset.statsBuilt = '1';

            container.innerHTML = `
                <div class="stats-layout" id="statsLayout">

                    <div class="stats-col stats-col-left">

                        <div class="stats-row-top">
                            <section class="stats-block stats-block-dataset">
                                <div class="stats-block-header">
                                    <span class="stats-block-title">📁 数据集</span>
                                </div>
                                <div class="stats-toolbar stats-toolbar-block">
                                    <select id="statsDatasetSelect" class="stats-toolbar-select"></select>
                                    <button class="btn btn-sm" id="statsRefreshBtn">刷新</button>
                                </div>
                                <div class="stats-dataset-remark-wrap" id="statsDatasetRemark"></div>
                            </section>

                            <section class="stats-block stats-block-overview">
                                <div class="stats-block-header">
                                    <span class="stats-block-title">📊 统计信息</span>
                                    <button class="btn btn-sm" id="statsOverviewDetailBtn"
                                            title="查看统计信息详情">查看详情</button>
                                </div>
                                <div id="statsOverviewBlock"></div>
                            </section>
                        </div>

                        <section class="stats-block">
                            <div class="stats-block-header">
                                <span class="stats-block-title">📊 进度</span>
                            </div>
                            <div id="statsProgressBlock"></div>
                        </section>

                        <section class="stats-block">
                            <div class="stats-block-header">
                                <span class="stats-block-title">📊 维度明细</span>
                                <span class="stats-placeholder-note">按未获取降序</span>
                            </div>
                            <div class="stats-dim-tabs" id="statsDimTabs">
                                <button class="stats-dim-tab active" data-dim="sub">能力值</button>
                                <button class="stats-dim-tab" data-dim="row">属性</button>
                                <button class="stats-dim-tab" data-dim="group">系列技能</button>
                            </div>
                            <div id="statsDimBlock"></div>
                        </section>

                        <section class="stats-block">
                            <div class="stats-block-header">
                                <span class="stats-block-title">🔥 缺口分析</span>
                                <span class="stats-placeholder-note">属性 × 系列技能 / 属性 × 能力值 / 系列技能 × 能力值</span>
                            </div>
                            <div id="statsHeatmapBlock"></div>
                        </section>
                    </div>

                    <div class="stats-resizer" id="statsResizer"
                         title="拖动调整宽度 · 双击恢复默认">
                        <button type="button" class="stats-resizer-lock"
                                id="statsResizerLock"
                                title="锁定宽度">
                            <svg class="stats-lock-icon stats-lock-open" width="12" height="12"
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                            </svg>
                            <svg class="stats-lock-icon stats-lock-closed" width="12" height="12"
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="stats-col stats-col-right">

                        <section class="stats-block">
                            <div class="stats-block-header">
                                <span class="stats-block-title">🔎 筛选</span>
                                <div class="stats-filter-actions">
                                    <button class="btn btn-sm" id="statsFilterSelectAll">全选</button>
                                    <button class="btn btn-sm" id="statsFilterClear">清空</button>
                                </div>
                            </div>

                            <div class="stats-filter-group">
                                <div class="stats-filter-group-title">能力值</div>
                                <div class="stats-filter-options" id="statsFilterSub"></div>
                            </div>
                            <div class="stats-filter-group">
                                <div class="stats-filter-group-title">属性</div>
                                <div class="stats-filter-options" id="statsFilterRow"></div>
                            </div>
                            <div class="stats-filter-group">
                                <div class="stats-filter-group-title">系列技能</div>
                                <div class="stats-filter-options" id="statsFilterGroup"></div>
                            </div>

                            <div class="stats-filter-hint" id="statsFilterHint">未选任何条件，暂不显示结果</div>
                        </section>

                        <section class="stats-block">
                            <div class="stats-list-block" id="statsListBlock"></div>
                        </section>
                    </div>

                </div>

                <div class="stats-detail-modal" id="statsOverviewDetailModal" style="display:none;">
                    <div class="stats-detail-modal-panel">
                        <div class="stats-detail-modal-header">
                            <span>📊 统计信息 · 详情</span>
                            <button class="btn-icon btn-sm"
                                    id="statsOverviewDetailClose"
                                    style="border:none;"
                                    title="关闭">✕</button>
                        </div>
                        <div class="stats-detail-modal-body" id="statsOverviewDetailBody">
                            <p class="input-hint" style="text-align:center;padding:40px 0;">
                                （详情内容待填充）
                            </p>
                        </div>
                    </div>
                </div>
            `;

            this._bindEvents(container);
        },

        _bindEvents(container) {
            if (_bound) return;
            _bound = true;

            container.addEventListener('change', (e) => {
                if (e.target.id === 'statsDatasetSelect') {
                    _datasetKey = e.target.value || null;
                    this._renderAll();
                }
            });

            const datasetSel = document.getElementById('statsDatasetSelect');
            if (datasetSel) {
                App.utils.enableWheelSelect(datasetSel);
            }

            container.addEventListener('click', (e) => {
                const t = e.target;

                if (t.id === 'statsRefreshBtn') {
                    this._renderAll();
                    return;
                }

                if (t.id === 'statsOverviewDetailBtn') {
                    const modal = document.getElementById('statsOverviewDetailModal');
                    if (modal) modal.style.display = 'flex';
                    return;
                }

                if (t.id === 'statsOverviewDetailClose') {
                    const modal = document.getElementById('statsOverviewDetailModal');
                    if (modal) modal.style.display = 'none';
                    return;
                }

                if (t.id === 'statsOverviewDetailModal') {
                    t.style.display = 'none';
                    return;
                }

                if (t.id === 'statsFilterSelectAll') {
                    // 因 _filters 是 const，整体重新赋值改用 clear + add
                    _filters.sub.clear();
                    App.constants.SUB_ATTRS.forEach((v) => _filters.sub.add(v));
                    _filters.row.clear();
                    App.constants.ROW_NAMES.forEach((v) => _filters.row.add(v));
                    _filters.group.clear();
                    App.constants.ALL_GROUPS.forEach((g) => _filters.group.add(g.name));
                    this._renderFilterOptions();
                    this._renderList();
                    return;
                }

                if (t.id === 'statsFilterClear') {
                    _filters.sub.clear();
                    _filters.row.clear();
                    _filters.group.clear();
                    this._renderFilterOptions();
                    this._renderList();
                    return;
                }

                const dimTab = t.closest('.stats-dim-tab');
                if (dimTab) {
                    _dimension = dimTab.dataset.dim;
                    this._renderDimTabs();
                    this._renderSummary();
                    return;
                }

                const chip = t.closest('.stats-filter-chip');
                if (chip) {
                    const type = chip.dataset.filterType;
                    const value = chip.dataset.value;
                    const set = _filters[type];
                    if (set.has(value)) set.delete(value);
                    else set.add(value);
                    chip.classList.toggle('active', set.has(value));
                    this._updateFilterHint();
                    this._renderList();
                    return;
                }

                const toggle = t.closest('.stats-cell-region-toggle');
                if (toggle) {
                    const wrap = toggle.closest('.stats-cell-regions');
                    if (wrap) wrap.classList.toggle('expanded');
                }
            });

            // ---------- 右列宽度拖动 ----------
            const resizer = document.getElementById('statsResizer');
            const layout = document.getElementById('statsLayout');
            const lockBtn = document.getElementById('statsResizerLock');

            const applyLocked = (locked) => {
                document.body.classList.toggle('stats-resizer-locked', locked);
                if (lockBtn) {
                    lockBtn.title = locked ? '解锁宽度' : '锁定宽度';
                }
            };
            applyLocked(loadLocked());

            if (lockBtn) {
                lockBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const next = !loadLocked();
                    saveLocked(next);
                    applyLocked(next);
                });
            }

            if (resizer && layout) {
                let rafId = 0;
                let pendingPx = null;

                const onMove = (ev) => {
                    pendingPx = layout.getBoundingClientRect().right - ev.clientX;
                    if (!rafId) {
                        rafId = requestAnimationFrame(() => {
                            rafId = 0;
                            if (pendingPx !== null) {
                                applyRightWidth(pendingPx);
                                pendingPx = null;
                            }
                        });
                    }
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.classList.remove('stats-resizing');
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = 0;
                    }

                    const cur = parseInt(
                        getComputedStyle(document.documentElement).getPropertyValue('--stats-right-width')
                    );
                    if (!isNaN(cur)) saveRightWidth(cur);
                };

                resizer.addEventListener('mousedown', (e) => {
                    if (loadLocked()) return;
                    if (e.button !== 0) return;
                    e.preventDefault();
                    document.body.classList.add('stats-resizing');
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });

                resizer.addEventListener('dblclick', (e) => {
                    if (e.target.closest('.stats-resizer-lock')) return;
                    if (loadLocked()) return;
                    applyRightWidth(DEFAULT_RIGHT);
                    saveRightWidth(DEFAULT_RIGHT);
                });
            }
        },

        // ---------- 子渲染 ----------
        _renderAll() {
            applyRightWidth(loadRightWidth());
            this._renderDatasetSelect();
            this._renderDatasetRemark();
            this._renderDimTabs();
            this._renderFilterOptions();
            this._renderSummary();
            this._renderList();
        },

        _renderDatasetSelect() {
            const sel = document.getElementById('statsDatasetSelect');
            if (!sel) return;
            const list = App.storage.getDatasetList();
            const current = App.storage.loadCurrentDatasetKey();
            const display = _datasetKey || current;
            sel.innerHTML = list
                .map((k) => {
                    const label = App.constants.PROTECTED_DATASETS.includes(k) ? k + ' 🔒' : k;
                    return `<option value="${App.utils.escapeHtml(k)}" ${k === display ? 'selected' : ''}>${App.utils.escapeHtml(label)}</option>`;
                })
                .join('');
        },

        _renderDatasetRemark() {
            const el = document.getElementById('statsDatasetRemark');
            if (!el) return;

            const current = App.storage.loadCurrentDatasetKey();
            const key = _datasetKey || current;

            let remark = '';
            if (key === App.constants.DEFAULT_STORAGE_KEY) {
                remark = App.constants.DEFAULT_REMARK || '';
            } else if (key === App.constants.SAMPLE_DATASET_KEY) {
                remark = App.constants.SAMPLE_REMARK || '';
            } else {
                const all = App.storage.getDatasetRemarks() || {};
                remark = all[key] || '';
            }

            const shown = String(remark).trim();

            if (!shown) {
                el.innerHTML =
                    '<span class="remark-display" style="color:var(--text-tertiary);font-style:italic;cursor:default;">（无备注）</span>';
                return;
            }
            el.innerHTML = `<span class="remark-display" style="cursor:default;">${App.utils.escapeHtml(shown)}</span>`;
        },

        _renderDimTabs() {
            document.querySelectorAll('#statsDimTabs .stats-dim-tab').forEach((t) => {
                t.classList.toggle('active', t.dataset.dim === _dimension);
            });
        },

        _renderFilterOptions() {
            const draw = (id, items, type) => {
                const el = document.getElementById(id);
                if (!el) return;
                const set = _filters[type];
                el.innerHTML = items
                    .map((item) => {
                        const active = set.has(item) ? 'active' : '';
                        return `<button class="stats-filter-chip ${active}" data-filter-type="${type}" data-value="${App.utils.escapeHtml(item)}">${App.utils.escapeHtml(item)}</button>`;
                    })
                    .join('');
            };
            draw('statsFilterSub', App.constants.SUB_ATTRS, 'sub');
            draw('statsFilterRow', App.constants.ROW_NAMES, 'row');
            draw(
                'statsFilterGroup',
                App.constants.ALL_GROUPS.map((g) => g.name),
                'group'
            );
            this._updateFilterHint();
        },

        _updateFilterHint() {
            const el = document.getElementById('statsFilterHint');
            if (!el) return;
            const n = _filters.sub.size + _filters.row.size + _filters.group.size;
            if (n === 0) {
                el.textContent = '未选任何条件，暂不显示结果';
            } else {
                const parts = [];
                parts.push(`能力值 ${_filters.sub.size}`);
                parts.push(`属性 ${_filters.row.size}`);
                parts.push(`系列技能 ${_filters.group.size}`);
                el.textContent = `已选：${parts.join(' / ')}`;
            }
        },

        // ---------- 汇总 ----------
        _renderSummary() {
            const overviewEl = document.getElementById('statsOverviewBlock');
            const dimEl = document.getElementById('statsDimBlock');
            if (!overviewEl || !dimEl) return;
            const rows = getRowsForStat();

            const buckets = {};
            if (_dimension === 'sub') {
                App.constants.SUB_ATTRS.forEach((n) => (buckets[n] = newBucket(n)));
            } else if (_dimension === 'row') {
                App.constants.ROW_NAMES.forEach((n) => (buckets[n] = newBucket(n)));
            } else {
                App.constants.ALL_GROUPS.forEach((g) => (buckets[g.name] = newBucket(g.name)));
            }

            rows.forEach((row, rowIdx) => {
                row.data.forEach((cell, colIndex) => {
                    const names = App.utils.getCellNames(rowIdx, colIndex);
                    if (!names || names.groupName === '?') return;
                    const status = getStatus(cell);

                    let key = null;
                    if (_dimension === 'sub') key = names.subName;
                    else if (_dimension === 'row') key = row.name;
                    else key = names.groupName;

                    const b = buckets[key];
                    if (b) {
                        b.total++;
                        if (status === 'has') b.has++;
                        else if (status === 'none') b.none++;
                        else if (status === 'partial') b.partial++;
                        else if (status === 'full') b.full++;
                    }
                });
            });

            const ov = calcOverviewStats(rows);

            overviewEl.innerHTML = `
                <div class="stats-ov-group">
                    <div class="stats-ov-group-title">单元格</div>
                    <div class="stats-overview-grid">
                        <div class="stats-ov-item">
                            <span class="stats-ov-label">总单元格</span>
                            <span class="stats-ov-value">${ov.totalCells}</span>
                        </div>
                        <div class="stats-ov-item status-none">
                            <span class="stats-ov-label">未填充单元格</span>
                            <span class="stats-ov-value">${ov.emptyCells}</span>
                        </div>
                        <div class="stats-ov-item has-value">
                            <span class="stats-ov-label">已填充单元格</span>
                            <span class="stats-ov-value stats-ov-value-split"
                                title="完整 ${ov.fullCells} + 不完整 ${ov.partialCells} = 加权 ${fmtNum(ov.filledCells)}">
                                <b class="ov-full">${ov.fullCells}</b><i>+</i><b class="ov-partial">${ov.partialCells}</b>
                            </span>
                        </div>
                    </div>
                </div>
                <div class="stats-ov-group">
                    <div class="stats-ov-group-title">基质</div>
                    <div class="stats-overview-grid">
                        <div class="stats-ov-item">
                            <span class="stats-ov-label">总基质数</span>
                            <span class="stats-ov-value">${ov.totalEssence}</span>
                        </div>
                        <div class="stats-ov-item status-full">
                            <span class="stats-ov-label">已获得基质数</span>
                            <span class="stats-ov-value">${ov.ownedEssence}</span>
                        </div>
                        <div class="stats-ov-item status-partial">
                            <span class="stats-ov-label">未获得基质数</span>
                            <span class="stats-ov-value">${ov.missingEssence}</span>
                        </div>
                    </div>
                </div>
            `;

            const list = Object.values(buckets).sort((a, b) => {
                if (b.none !== a.none) return b.none - a.none;
                return b.total - a.total;
            });

            let dimHtml = '';
            list.forEach((b) => {
                const pct = b.total > 0 ? Math.round(((b.has + b.full) / b.total) * 100) : 0;
                const pctClass = this._progressClass(pct);
                dimHtml += `
                    <div class="stats-dim-row">
                        <span class="stats-dim-row-name" title="${App.utils.escapeHtml(b.name)}">${App.utils.escapeHtml(b.name)}</span>
                        <span class="stats-dim-row-gap">未获取 <b>${b.none}</b></span>
                        <div class="stats-dim-row-bar">
                            <div class="stats-dim-row-fill ${pctClass}" style="width:${pct}%"></div>
                        </div>
                        <span class="stats-dim-row-pct">${pct}%</span>
                    </div>
                `;
            });
            dimEl.innerHTML = dimHtml;

            this._renderProgressBars(ov);
            this._renderMergedTables(rows);
            this._renderOverviewDetail(rows);
        },

        // ---------- 缺口分析：单表单区块 ----------
        _renderMergedTables(rows) {
            const el = document.getElementById('statsHeatmapBlock');
            if (!el) return;

            const C = App.constants;
            const groups = C.ALL_GROUPS;
            const rowNames = C.ROW_NAMES;
            const subs = C.SUB_ATTRS;

            const ROW_ABBR = {
                攻击提升: '攻',
                生命提升: '生',
                暴击率提升: '暴',
                物理伤害提升: '物',
                灼热伤害提升: '灼',
                法术伤害提升: '法',
                自然伤害提升: '自',
                电磁伤害提升: '电',
                寒冷伤害提升: '寒',
                源石技艺提升: '源',
                治疗效率提升: '治',
                终结技充能效率提升: '终'
            };

            // ============ 三个矩阵 ============
            const hmMatrix = rowNames.map(() => groups.map(() => 0));
            for (let r = 0; r < rowNames.length; r++) {
                for (let g = 0; g < groups.length; g++) {
                    const baseCol = App.utils.getColumnIndex(g, 0);
                    const subLen = groups[g].sub.length;
                    let score = 0;
                    for (let s = 0; s < subLen; s++) {
                        const cell = rows[r] && rows[r].data[baseCol + s];
                        if (!cell) continue;
                        const t = cell.t || 0;
                        const a = cell.a || 0;
                        if (t > 0) score += Math.max(0, t - a);
                        else if (!cell.v) score += 1;
                    }
                    hmMatrix[r][g] = score;
                }
            }

            const rowSubMatrix = rowNames.map(() => subs.map(() => 0));
            const groupSubMatrix = groups.map(() => subs.map(() => 0));

            rows.forEach((row, rowIdx) => {
                row.data.forEach((cell, colIndex) => {
                    const t = cell.t || 0;
                    const a = cell.a || 0;
                    let gap = 0;
                    if (t > 0) gap = Math.max(0, t - a);
                    else if (!cell.v) gap = 1;
                    if (gap === 0) return;

                    let offset = 0,
                        gi = -1,
                        si = -1;
                    for (let g = 0; g < groups.length; g++) {
                        const len = groups[g].sub.length;
                        if (colIndex < offset + len) {
                            gi = g;
                            si = colIndex - offset;
                            break;
                        }
                        offset += len;
                    }
                    if (gi < 0 || si < 0) return;

                    rowSubMatrix[rowIdx][si] += gap;
                    groupSubMatrix[gi][si] += gap;
                });
            });

            // ============ 连续色 ============
            const maxHM = Math.max(1, ...hmMatrix.flat());
            const maxRowSub = Math.max(1, ...rowSubMatrix.flat());
            const maxGroupSub = Math.max(1, ...groupSubMatrix.flat());

            const cellStyle = (v, max) => {
                const ratio = max > 0 ? Math.min(1, Math.max(0, v / max)) : 0;
                const hue = 120 * (1 - ratio);
                const bg = `hsl(${hue.toFixed(1)}, 65%, 45%)`;
                return `background:${bg};color:#fff;`;
            };
            const mkCell = (v, max, tip) =>
                `<td class="nx-cell" style="${cellStyle(v, max)}" title="${App.utils.escapeHtml(tip)}">${v > 0 ? v : ''}</td>`;

            const seriesNames = groups.map((g) => g.name);
            const attrShort = rowNames.map((r) => ROW_ABBR[r] || r);

            let html = '<table class="nx-unified">';
            html += '<colgroup>';
            html += '<col style="width:34px;">';
            for (let i = 0; i < 14; i++) html += '<col style="width:18px;">';
            html += '<col style="width:12px;">';
            html += '<col style="width:44px;">';
            for (let i = 0; i < 14; i++) html += '<col style="width:18px;">';
            html += '</colgroup>';
            html += '<tbody>';

            // ---- 行 1：表头 ----
            html += '<tr>';
            html += '<th class="nx-corner"></th>';
            for (let g = 0; g < 14; g++) {
                html += `<th class="nx-col-head" title="${App.utils.escapeHtml(seriesNames[g])}">${App.utils.escapeHtml(seriesNames[g])}</th>`;
            }
            html += '<td class="nx-gap"></td>';
            html += '<th class="nx-corner"></th>';
            for (let a = 0; a < 12; a++) {
                html += `<th class="nx-col-head" title="${App.utils.escapeHtml(rowNames[a])}">${App.utils.escapeHtml(attrShort[a])}</th>`;
            }
            html += '<td class="nx-filler"></td><td class="nx-filler"></td>';
            html += '</tr>';

            // ---- 行 2–6 ----
            for (let r = 0; r < 5; r++) {
                html += '<tr>';
                html += `<th class="nx-row-head" title="${App.utils.escapeHtml(rowNames[r])}">${App.utils.escapeHtml(attrShort[r])}</th>`;
                for (let g = 0; g < 14; g++) {
                    html += mkCell(
                        hmMatrix[r][g],
                        maxHM,
                        `${rowNames[r]} · ${seriesNames[g]}\n缺口：${hmMatrix[r][g]}`
                    );
                }
                html += '<td class="nx-gap"></td>';
                html += `<th class="nx-row-head nx-row-head-sub" title="${App.utils.escapeHtml(subs[r])}">${App.utils.escapeHtml(subs[r])}</th>`;
                for (let a = 0; a < 12; a++) {
                    html += mkCell(
                        rowSubMatrix[a][r],
                        maxRowSub,
                        `${rowNames[a]} · ${subs[r]}\n缺口：${rowSubMatrix[a][r]}`
                    );
                }
                html += '<td class="nx-filler"></td><td class="nx-filler"></td>';
                html += '</tr>';
            }

            // ---- 行 7 ----
            html += '<tr>';
            html += `<th class="nx-row-head" title="${App.utils.escapeHtml(rowNames[5])}">${App.utils.escapeHtml(attrShort[5])}</th>`;
            for (let g = 0; g < 14; g++) {
                html += mkCell(hmMatrix[5][g], maxHM, `${rowNames[5]} · ${seriesNames[g]}\n缺口：${hmMatrix[5][g]}`);
            }
            html += '<td class="nx-gap"></td>';
            html += '<td class="nx-filler"></td>';
            for (let i = 0; i < 13; i++) html += '<td class="nx-filler"></td>';
            html += '</tr>';

            // ---- 行 8 ----
            html += '<tr>';
            html += `<th class="nx-row-head" title="${App.utils.escapeHtml(rowNames[6])}">${App.utils.escapeHtml(attrShort[6])}</th>`;
            for (let g = 0; g < 14; g++) {
                html += mkCell(hmMatrix[6][g], maxHM, `${rowNames[6]} · ${seriesNames[g]}\n缺口：${hmMatrix[6][g]}`);
            }
            html += '<td class="nx-gap"></td>';
            html += '<th class="nx-corner"></th>';
            for (let g = 0; g < 14; g++) {
                html += `<th class="nx-col-head" title="${App.utils.escapeHtml(seriesNames[g])}">${App.utils.escapeHtml(seriesNames[g])}</th>`;
            }
            html += '</tr>';

            // ---- 行 9–13 ----
            for (let r = 0; r < 5; r++) {
                const leftIdx = 7 + r;
                html += '<tr>';
                html += `<th class="nx-row-head" title="${App.utils.escapeHtml(rowNames[leftIdx])}">${App.utils.escapeHtml(attrShort[leftIdx])}</th>`;
                for (let g = 0; g < 14; g++) {
                    html += mkCell(
                        hmMatrix[leftIdx][g],
                        maxHM,
                        `${rowNames[leftIdx]} · ${seriesNames[g]}\n缺口：${hmMatrix[leftIdx][g]}`
                    );
                }
                html += '<td class="nx-gap"></td>';
                html += `<th class="nx-row-head nx-row-head-sub" title="${App.utils.escapeHtml(subs[r])}">${App.utils.escapeHtml(subs[r])}</th>`;
                for (let g = 0; g < 14; g++) {
                    html += mkCell(
                        groupSubMatrix[g][r],
                        maxGroupSub,
                        `${seriesNames[g]} · ${subs[r]}\n缺口：${groupSubMatrix[g][r]}`
                    );
                }
                html += '</tr>';
            }

            html += '</tbody></table>';

            html += `
                <div class="nx-colorbar-wrap">
                    <span class="nx-colorbar-tick">0</span>
                    <div class="nx-colorbar-gradient"></div>
                    <span class="nx-colorbar-tick">最大</span>
                </div>
            `;

            el.innerHTML = html;
        },

        // ---------- 详情悬浮窗 ----------
        _renderOverviewDetail(rows) {
            const el = document.getElementById('statsOverviewDetailBody');
            if (!el) return;

            const { list, total } = calcGroupStats(rows);

            const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

            let html = `
                <div class="stats-detail-hint">
                    每系列技能统计 6 项数据（已填充单元格按获得比例加权）
                </div>
                <table class="stats-detail-table">
                    <thead>
                        <tr>
                            <th class="col-name">系列技能</th>
                            <th>总单元格</th>
                            <th>未填充</th>
                            <th>已填充</th>
                            <th>总基质</th>
                            <th>已获得</th>
                            <th>未获得</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            list.forEach((g) => {
                const missing = g.totalEssence - g.ownedEssence;
                html += `
                    <tr>
                        <td class="col-name">${App.utils.escapeHtml(g.name)}</td>
                        <td>${g.totalCells}</td>
                        <td class="cell-empty">${g.emptyCells}</td>
                        <td class="cell-filled">
                            <span class="fill-split" title="完整 ${g.fullCells} + 不完整 ${g.partialCells} = 加权 ${fmt(g.filledCells)}">
                                <b class="ov-full">${g.fullCells}</b><i>+</i><b class="ov-partial">${g.partialCells}</b>
                            </span>
                        </td>
                        <td>${g.totalEssence}</td>
                        <td class="cell-owned">${g.ownedEssence}</td>
                        <td class="cell-missing">${missing}</td>
                    </tr>
                `;
            });

            const totalMissing = total.totalEssence - total.ownedEssence;
            html += `
                    <tr class="row-total">
                        <td class="col-name">合计</td>
                        <td>${total.totalCells}</td>
                        <td class="cell-empty">${total.emptyCells}</td>
                        <td class="cell-filled">
                            <span class="fill-split" title="完整 ${total.fullCells} + 不完整 ${total.partialCells} = 加权 ${fmt(total.filledCells)}">
                                <b class="ov-full">${total.fullCells}</b><i>+</i><b class="ov-partial">${total.partialCells}</b>
                            </span>
                        </td>
                        <td>${total.totalEssence}</td>
                        <td class="cell-owned">${total.ownedEssence}</td>
                        <td class="cell-missing">${totalMissing}</td>
                    </tr>
                </tbody>
                </table>
            `;

            el.innerHTML = html;
        },

        // ---------- 进度条 ----------
        _renderProgressBars(ov) {
            const el = document.getElementById('statsProgressBlock');
            if (!el) return;

            const fillPct = ov.totalCells > 0 ? Math.round((ov.filledCells / ov.totalCells) * 100) : 0;

            const essencePct = ov.totalEssence > 0 ? Math.round((ov.ownedEssence / ov.totalEssence) * 100) : 0;

            el.innerHTML = `
                <div class="stats-progress-row">
                    <span class="stats-progress-label">单元格填充率</span>
                    <div class="stats-progress-bar">
                        <div class="stats-progress-fill ${this._progressClass(fillPct)}"
                             style="width:${fillPct}%"></div>
                    </div>
                    <span class="stats-progress-text">${fmtNum(ov.filledCells)} / ${ov.totalCells}</span>
                    <span class="stats-progress-pct">${fillPct}%</span>
                </div>
                <div class="stats-progress-row">
                    <span class="stats-progress-label">基质获取率</span>
                    <div class="stats-progress-bar">
                        <div class="stats-progress-fill ${this._progressClass(essencePct)}"
                             style="width:${essencePct}%"></div>
                    </div>
                    <span class="stats-progress-text">${ov.ownedEssence} / ${ov.totalEssence}</span>
                    <span class="stats-progress-pct">${essencePct}%</span>
                </div>
            `;
        },

        _progressClass(pct) {
            if (pct >= 70) return 'progress-high';
            if (pct >= 30) return 'progress-mid';
            return 'progress-low';
        },

        // ---------- 基质列表 ----------
        _renderList() {
            const el = document.getElementById('statsListBlock');
            if (!el) return;

            const anyFilter = _filters.sub.size > 0 || _filters.row.size > 0 || _filters.group.size > 0;

            if (!anyFilter) {
                el.innerHTML = `
                    <div class="stats-list-header">
                        <span>请至少选择一项筛选条件</span>
                    </div>
                    <p class="input-hint" style="text-align:center;padding:24px 0;line-height:1.6;">
                        在右侧「筛选」面板中，<br>
                        至少勾选一项能力值 / 属性 / 系列技能。
                    </p>
                `;
                return;
            }

            const rows = getRowsForStat();
            const items = [];

            rows.forEach((row, rowIdx) => {
                row.data.forEach((cell, colIndex) => {
                    const names = App.utils.getCellNames(rowIdx, colIndex);
                    if (!names || names.groupName === '?') return;

                    if (_filters.sub.size > 0 && !_filters.sub.has(names.subName)) return;
                    if (_filters.row.size > 0 && !_filters.row.has(row.name)) return;
                    if (_filters.group.size > 0 && !_filters.group.has(names.groupName)) return;

                    items.push({
                        rowName: row.name,
                        groupName: names.groupName,
                        subName: names.subName,
                        status: getStatus(cell),
                        v: cell.v,
                        t: cell.t || 0,
                        a: cell.a || 0
                    });
                });
            });

            items.sort((x, y) => {
                const o = STATUS_ORDER[x.status] - STATUS_ORDER[y.status];
                if (o !== 0) return o;
                if (x.rowName !== y.rowName) return x.rowName.localeCompare(y.rowName);
                if (x.groupName !== y.groupName) return x.groupName.localeCompare(y.groupName);
                return x.subName.localeCompare(y.subName);
            });

            const shown = items.slice(0, _listLimit);

            let html = `
                <div class="stats-list-header">
                    <span>符合条件的基质：<b>${items.length}</b> 项</span>
                    ${items.length > _listLimit ? `<span class="stats-list-limit">（仅显示前 ${_listLimit} 项）</span>` : ''}
                </div>
            `;

            if (items.length === 0) {
                html += `
                    <p class="input-hint" style="text-align:center;padding:24px 0;line-height:1.6;">
                        没有符合条件的基质。<br>
                        请调整右侧筛选条件。
                    </p>
                `;
                el.innerHTML = html;
                return;
            }

            html += `
                <table class="stats-matrix-table">
                    <thead>
                        <tr>
                            <th>属性</th>
                            <th>系列技能</th>
                            <th>能力值</th>
                            <th>状态</th>
                            <th>数值</th>
                            <th>可获取地区 / 刷取方式</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            shown.forEach((it) => {
                const regions = getRegionsForCell(it.rowName, it.groupName);

                let regionHtml;
                if (regions.length === 0) {
                    regionHtml = '<span class="stats-no-region">未配置可获取地区</span>';
                } else {
                    regionHtml = `
                        <div class="stats-cell-regions">
                            <button class="stats-cell-region-toggle" type="button">${regions.length} 个地区 ▾</button>
                            <div class="stats-cell-region-list">
                                ${regions
                                    .map(
                                        (r) => `
                                    <div class="stats-cell-region-item">
                                        <div class="stats-cell-region-name">${App.utils.escapeHtml(r.regionName)}</div>
                                        <div class="stats-cell-region-methods">
                                            ${r.methods.map((m) => `<span class="stats-method-tag">${App.utils.escapeHtml(m.label)}</span>`).join('')}
                                        </div>
                                    </div>
                                `
                                    )
                                    .join('')}
                            </div>
                        </div>
                    `;
                }

                let valueHtml;
                if (it.status === 'has') {
                    valueHtml = App.utils.escapeHtml(it.v || '-');
                } else if (it.t > 0) {
                    valueHtml = `<span class="stats-t-count">${it.a}/${it.t}</span>`;
                } else {
                    valueHtml = '-';
                }

                html += `
                    <tr>
                        <td>${App.utils.escapeHtml(shortRowName(it.rowName))}</td>
                        <td>${App.utils.escapeHtml(it.groupName)}</td>
                        <td>${App.utils.escapeHtml(it.subName)}</td>
                        <td><span class="stats-status-tag stats-status-${it.status}">${STATUS_TEXT[it.status]}</span></td>
                        <td>${valueHtml}</td>
                        <td>${regionHtml}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            el.innerHTML = html;
        }
    };
})((window.App = window.App || {}));
