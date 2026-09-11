/**
 * cell-acquire-tooltip.js - 单元格"可获取地点"提示悬浮窗
 * 挂载到 App.cellAcquireTooltip
 *
 * 地区显示策略：
 *   - 优先显示"未获取统计面板"当前筛选的地区中，可获取此基质的地区
 *   - 若筛选下无任何地区可获取，则显示提示并回退到全部可获取地区
 *   - 无筛选时直接显示全部可获取地区
 *
 * 与备注悬浮框关系：
 *   - 不互斥：两个悬浮窗可同时显示
 *   - 不重叠：显示位置自动错开
 */
(function (App) {
    'use strict';

    /** 生成从 arr 中取 k 个元素的所有组合 */
    function combinations(arr, k) {
        const result = [];
        const combine = (start, current) => {
            if (current.length === k) {
                result.push(current.slice());
                return;
            }
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                combine(i + 1, current);
                current.pop();
            }
        };
        combine(0, []);
        return result;
    }

    /** 是否未完全获取 */
    function isUnacquired(cell) {
        if (cell.t > 0) return cell.a < cell.t;
        return cell.v === '';
    }

    let _showTimer = null;
    let _hideTimer = null;

    App.cellAcquireTooltip = {
        _tooltip: null,
        _body: null,
        _bound: false,
        _lastMouse: { x: 0, y: 0 },

        init() {
            this._tooltip = App.dom.acquireTooltip;
            this._body = App.dom.acquireTooltipBody;
            if (!this._tooltip || !this._body) return;
            if (this._bound) return;
            this._bound = true;

            const tableArea = App.dom.tableArea;
            if (!tableArea) return;

            // 悬停单元格
            tableArea.addEventListener('mouseover', (e) => {
                const td = e.target.closest('td');
                if (!td || td.dataset.rowindex === undefined || td.dataset.colindex === undefined) return;
                this._onCellHover(td, e);
            });

            // 鼠标移出单元格 → 延迟隐藏（允许移入提示窗）
            tableArea.addEventListener('mouseout', (e) => {
                const td = e.target.closest('td');
                if (!td) return;
                this._scheduleHide(500);
            });

            // 鼠标移入本提示窗 → 取消隐藏
            this._tooltip.addEventListener('mouseenter', () => {
                clearTimeout(_hideTimer);
            });
            this._tooltip.addEventListener('mouseleave', () => {
                this._scheduleHide(200);
            });

            if (App.dom.btnCloseAcquireTooltip) {
                App.dom.btnCloseAcquireTooltip.addEventListener('click', () => this._hideImmediate());
            }
        },

        _onCellHover(td, e) {
            clearTimeout(_showTimer);
            clearTimeout(_hideTimer);

            const rowIdx = parseInt(td.dataset.rowindex, 10);
            const colIndex = parseInt(td.dataset.colindex, 10);
            if (isNaN(rowIdx) || isNaN(colIndex)) return;

            const row = App.state.rows[rowIdx];
            if (!row) return;
            const cell = App.utils.normalizeCell(row.data[colIndex]);

            if (!isUnacquired(cell)) {
                this._hideImmediate();
                return;
            }

            this._lastMouse = { x: e.clientX, y: e.clientY };

            _showTimer = setTimeout(() => {
                this._show(rowIdx, colIndex, e.clientX, e.clientY);
            }, 300);
        },

        _show(rowIdx, colIndex, x, y) {
            const names = App.utils.getCellNames(rowIdx, colIndex);
            if (!names.groupName || names.groupName === '?') return;

            const allRegions = App.storage.getRegions();
            const savedFilter = App.storage.getUnacquiredRegionFilter();
            const filterActive = Array.isArray(savedFilter);
            const filterSet = filterActive ? new Set(savedFilter) : null;

            // 1) 先在筛选地区中查找
            const filteredRegions = filterActive ? allRegions.filter((r) => filterSet.has(r.name)) : allRegions;
            let results = this._findRegionsAndCombos(names, filteredRegions);
            let fallback = false;

            // 2) 筛选下无结果 → 回退到全部地区
            if (results.length === 0 && filterActive) {
                const allResults = this._findRegionsAndCombos(names, allRegions);
                if (allResults.length > 0) {
                    results = allResults;
                    fallback = true;
                }
            }

            // 3) 渲染
            if (results.length === 0) {
                this._body.innerHTML = '<div class="acquire-empty">当前无地区可获取此基质</div>';
            } else {
                this._body.innerHTML = this._buildHtml(names, results, fallback);
            }

            this._tooltip.style.display = 'flex';
            this._lastMouse = { x, y };
            this._position(x, y);
        },

        _findRegionsAndCombos(names, regions) {
            const C = App.constants;
            const rowName = names.rowName;
            const groupName = names.groupName;
            const mainAttr = names.subName;

            const others = C.SUB_ATTRS.filter((a) => a !== mainAttr);
            const mainCombos = combinations(others, 2).map((c) => {
                return [mainAttr, ...c].sort((a, b) => C.SUB_ATTRS.indexOf(a) - C.SUB_ATTRS.indexOf(b)).join('-');
            });

            const results = [];
            regions.forEach((region) => {
                const hasRow = region.rows.includes(rowName);
                const hasGroup = region.groups.includes(groupName);
                if (hasRow && hasGroup) {
                    results.push({ region: region.name, mainCombos });
                }
            });
            return results;
        },

        _buildHtml(names, results, fallback) {
            const rowName = App.utils.escapeHtml(names.rowName);
            const groupName = App.utils.escapeHtml(names.groupName);
            const mainAttr = App.utils.escapeHtml(names.subName);

            let html = '';

            // 回退提示（筛选下无可显示地区时）
            if (fallback) {
                html += `<div class="acquire-fallback-hint">
                    ⚠️ 当前筛选下无可获取此基质的地区，以下显示全部可获取地区：
                </div>`;
            }

            html += `<div class="acquire-header-info">
                <b>${mainAttr}</b> · <b>${rowName}</b> · <b>${groupName}</b>
            </div>`;
            html += '<div class="acquire-list">';

            results.forEach((item) => {
                const comboTags = item.mainCombos
                    .map((c) => `<span class="acquire-combo-tag">${App.utils.escapeHtml(c)}</span>`)
                    .join('');

                html += `<div class="acquire-region-block">
                    <div class="acquire-region-name">📍 ${App.utils.escapeHtml(item.region)}</div>
                    <div class="acquire-path">
                        <div class="acquire-path-label">选属性「${rowName}」 + 任一能力值组合：</div>
                        <div class="acquire-combo-list">${comboTags}</div>
                    </div>
                    <div class="acquire-path">
                        <div class="acquire-path-label">选系列技能「${groupName}」 + 任一能力值组合：</div>
                        <div class="acquire-combo-list">${comboTags}</div>
                    </div>
                </div>`;
            });

            html += '</div>';
            return html;
        },

        /**
         * 定位「可获取地点」悬浮窗（主窗）
         *
         * v0.9.14：改为围绕鼠标的 8 候选位择优。
         * 若 note 已显示（兼容乱序），则避让。
         */
        _position(x, y) {
            const tooltip = this._tooltip;
            tooltip.style.left = '-9999px';
            tooltip.style.top = '-9999px';
            const rect = tooltip.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;

            const candidates = App.utils.buildAroundCursor(x, y, w, h);

            // note 若已显示则避让（兼容极端乱序）
            // v0.9.14：改用 style.left/top + offsetWidth/Height 读取权威位置。
            const note = App.dom.noteTooltip;
            let noteRect = null;
            if (note && note.style.display === 'flex' && note.style.left && note.style.left !== '-9999px') {
                const nLeft = parseFloat(note.style.left);
                const nTop = parseFloat(note.style.top);
                const nW = note.offsetWidth;
                const nH = note.offsetHeight;
                if (!isNaN(nLeft) && !isNaN(nTop) && nW > 0 && nH > 0) {
                    noteRect = {
                        left: nLeft,
                        top: nTop,
                        right: nLeft + nW,
                        bottom: nTop + nH
                    };
                }
            }

            const pad = 10;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let chosen = null;
            for (const c of candidates) {
                if (c.left < pad || c.top < pad || c.left + w > vw - pad || c.top + h > vh - pad) continue;
                if (noteRect) {
                    const r = { left: c.left, top: c.top, right: c.left + w, bottom: c.top + h };
                    if (App.utils.rectsOverlap(r, noteRect)) continue;
                }
                chosen = c;
                break;
            }
            if (!chosen) chosen = { left: x + 15, top: y + 15 };

            chosen.left = Math.max(pad, Math.min(vw - w - pad, chosen.left));
            chosen.top = Math.max(pad, Math.min(vh - h - pad, chosen.top));

            tooltip.style.left = chosen.left + 'px';
            tooltip.style.top = chosen.top + 'px';
            // v0.9.14：强制同步回流，确保 style.left/top 立即生效，
            // 便于 note 在 50ms 后能读到准确的权威位置。
            void tooltip.offsetWidth;
        },

        _scheduleHide(delay) {
            clearTimeout(_showTimer);
            clearTimeout(_hideTimer);
            _hideTimer = setTimeout(() => {
                if (this._tooltip) this._tooltip.style.display = 'none';
            }, delay || 500);
        },

        _hideImmediate() {
            clearTimeout(_showTimer);
            clearTimeout(_hideTimer);
            if (this._tooltip) this._tooltip.style.display = 'none';
        }
    };
})((window.App = window.App || {}));
