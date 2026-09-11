/**
 * region-manager.js - 地区管理（列表 / 编辑 / 悬停高亮 / 收集进度）
 * 挂载到 App.regionManager
 *
 * v0.9.2 重构：
 *   - 高亮逻辑改为调用 App.cellHighlighter
 *   - getUnacquiredScore 抽取至 App.utils
 *
 * v0.9.11 新增：
 *   - 地区卡片显示"基质收集进度条"
 *   - 进度 = 已完成格数 / 320（8 能力值 × 8 系列技能 × 5 能力值）
 *   - 分档着色（<30% 红 / 30~70% 橙 / ≥70% 绿）
 */
(function (App) {
    'use strict';

    let editingIndex = -1;

    // ==================== 模块级缓存 ====================
    /** 单元格缓存：_cellCache[rowIdx][colIdx] = normalizeCell 结果 */
    let _cellCache = null;

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

    App.regionManager = {
        _hoveredCard: null,

        // ==================== 进度计算 ====================

        /**
         * 计算某地区的基质收集进度
         * 遍历 region.rows × region.groups × SUB_ATTRS 得到至多 320 格
         * @param {Object} region - { name, rows, groups }
         * @returns {{ completed: number, total: number, percent: number }}
         */
        _calcRegionProgress(region) {
            const C = App.constants;
            const subAttrs = C.SUB_ATTRS;

            const total = region.rows.length * region.groups.length * subAttrs.length;
            if (total === 0) return { completed: 0, total: 0, percent: 0 };

            let completed = 0;

            region.rows.forEach(rowName => {
                const rowIdx = C.ROW_NAMES.indexOf(rowName);
                if (rowIdx < 0) return;
                region.groups.forEach(groupName => {
                    const gi = C.ALL_GROUPS.findIndex(g => g.name === groupName);
                    if (gi < 0) return;
                    subAttrs.forEach(mainAttr => {
                        const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                        if (si < 0) return;
                        const colIndex = App.utils.getColumnIndex(gi, si);
                        const cell = getCachedCell(rowIdx, colIndex);
                        if (!cell) return;
                        if (cell.t > 0 && cell.a === cell.t) completed++;
                        else if (cell.t === 0 && cell.v !== '') completed++;
                    });
                });
            });

            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { completed, total, percent };
        },

        /** 百分比 → 档位 class */
        _progressClass(percent) {
            if (percent >= 70) return 'progress-high';
            if (percent >= 30) return 'progress-mid';
            return 'progress-low';
        },

        // ==================== 渲染 ====================

        renderList() {
            const container = App.dom.regionList;
            if (!container) return;

            const regions = App.storage.getRegions();
            if (regions.length === 0) {
                container.innerHTML = '<p class="input-hint" style="text-align:center;">暂无地区</p>';
                return;
            }

            // 构建单元格缓存（整个 renderList 期间复用）
            buildCellCache();

            container.innerHTML = regions.map((region, index) => {
                const progress = this._calcRegionProgress(region);
                const progressClass = this._progressClass(progress.percent);
                const safeName = App.utils.escapeHtml(region.name);

                return `
                <div class="region-card" data-region="${safeName}" data-index="${index}">
                    <div class="region-card-header">
                        <span class="region-card-name">${safeName}</span>
                        <div class="region-card-actions">
                            <button class="btn btn-sm btn-outline-gray" data-action="edit" data-index="${index}">编辑</button>
                            <button class="btn btn-sm btn-danger" data-action="delete" data-index="${index}">删除</button>
                        </div>
                    </div>
                    <div class="region-card-body">
                        <div class="region-attr-row">
                            <span class="region-label">能力值</span>
                            ${region.rows.map(r => `<span class="region-tag">${App.utils.escapeHtml(r)}</span>`).join('')}
                        </div>
                        <div class="region-attr-row">
                            <span class="region-label">系列技能</span>
                            ${region.groups.map(g => `<span class="region-tag">${App.utils.escapeHtml(g)}</span>`).join('')}
                        </div>
                        <div class="region-progress-row">
                            <span class="region-progress-label">收集进度</span>
                            <div class="region-progress-bar">
                                <div class="region-progress-fill ${progressClass}" style="width:${progress.percent}%"></div>
                            </div>
                            <span class="region-progress-text">${progress.completed}/${progress.total} (${progress.percent}%)</span>
                        </div>
                    </div>
                </div>`;
            }).join('');

            releaseCellCache();
        },

        // ==================== 悬停高亮 ====================

        /**
         * 高亮某地区的全部可刷取单元格（8 能力值 × 8 系列技能 × 5 能力值 = 320 格）
         */
        _highlightRegion(regionName) {
            const regions = App.storage.getRegions();
            const region = regions.find(r => r.name === regionName);
            if (!region) return;

            const C = App.constants;
            const mainAttrs = C.SUB_ATTRS;

            const cellList = [];

            region.rows.forEach(rowName => {
                const rowIdx = C.ROW_NAMES.indexOf(rowName);
                if (rowIdx < 0) return;
                const row = App.state.rows[rowIdx];
                if (!row) return;

                region.groups.forEach(groupName => {
                    const gi = C.ALL_GROUPS.findIndex(g => g.name === groupName);
                    if (gi < 0) return;

                    mainAttrs.forEach(mainAttr => {
                        const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                        if (si < 0) return;
                        const colIndex = App.utils.getColumnIndex(gi, si);

                        const cell = App.utils.normalizeCell(row.data[colIndex]);
                        cellList.push({
                            rowIdx,
                            colIndex,
                            isUnacquired: App.utils.getUnacquiredScore(cell) > 0
                        });
                    });
                });
            });

            App.cellHighlighter.highlight(cellList);
        },

        /** 清除高亮（转发到 cellHighlighter） */
        _clearHighlight() {
            App.cellHighlighter.clear();
        },

        // ==================== 编辑 / 删除 ====================

        openEdit(index) {
            editingIndex = index;
            const regions = App.storage.getRegions();
            const region = index >= 0
                ? regions[index]
                : { name: '', rows: [], groups: [] };

            document.getElementById('regionEditTitle').textContent = index >= 0 ? '编辑地区' : '新增地区';
            document.getElementById('regionEditName').value = region.name || '';

            document.getElementById('regionEditRows').innerHTML = App.constants.ROW_NAMES
                .map(r => `<label class="region-checkbox-item"><input type="checkbox" value="${App.utils.escapeHtml(r)}" ${region.rows.includes(r) ? 'checked' : ''}> ${App.utils.escapeHtml(r)}</label>`)
                .join('');

            document.getElementById('regionEditGroups').innerHTML = App.constants.ALL_GROUPS
                .map(g => `<label class="region-checkbox-item"><input type="checkbox" value="${App.utils.escapeHtml(g.name)}" ${region.groups.includes(g.name) ? 'checked' : ''}> ${App.utils.escapeHtml(g.name)}</label>`)
                .join('');

            App.modal.openModal(App.dom.modalRegionEdit);
        },

        confirmEdit() {
            const name = document.getElementById('regionEditName').value.trim();
            if (!name) { App.modal.showAlert('地区名称不能为空', '提示'); return; }

            const rows = Array.from(document.querySelectorAll('#regionEditRows input:checked')).map(i => i.value);
            const groups = Array.from(document.querySelectorAll('#regionEditGroups input:checked')).map(i => i.value);

            if (rows.length === 0 || groups.length === 0) {
                App.modal.showAlert('能力值和系列技能至少各选一个', '提示');
                return;
            }

            const regions = App.storage.getRegions();
            if (editingIndex >= 0) {
                if (regions.some((r, i) => i !== editingIndex && r.name === name)) {
                    App.modal.showAlert('地区名称已存在', '提示'); return;
                }
                regions[editingIndex] = { name, rows, groups };
            } else {
                if (regions.some(r => r.name === name)) {
                    App.modal.showAlert('地区名称已存在', '提示'); return;
                }
                regions.push({ name, rows, groups });
            }

            App.storage.saveRegions(regions);
            App.modal.closeModal(App.dom.modalRegionEdit);
            this.renderList();
            if (App.state.activePanel === 'unacquired' && App.unacquired) {
                App.unacquired.renderRegionFilter();
                App.unacquired.renderList();
            }
            App.modal.showTemporaryHint('地区已保存', 'success');
        },

        deleteRegion(index) {
            const regions = App.storage.getRegions();
            const region = regions[index];
            if (!region) return;
            App.modal.showConfirmDialog(
                `确定删除地区 "<b>${App.utils.escapeHtml(region.name)}</b>" 吗？`,
                () => {
                    regions.splice(index, 1);
                    App.storage.saveRegions(regions);
                    this.renderList();
                    if (App.state.activePanel === 'unacquired' && App.unacquired) {
                        App.unacquired.renderRegionFilter();
                        App.unacquired.renderList();
                    }
                    App.modal.showTemporaryHint('已删除', 'success');
                },
                () => {},
                '删除地区'
            );
        },

        resetToDefault() {
            App.modal.showConfirmDialog(
                '将恢复为内置的默认地区数据，所有自定义修改将丢失。确定继续吗？',
                () => {
                    App.storage.resetRegions();
                    this.renderList();
                    if (App.state.activePanel === 'unacquired' && App.unacquired) {
                        App.unacquired.renderRegionFilter();
                        App.unacquired.renderList();
                    }
                    App.modal.showTemporaryHint('已恢复默认地区', 'success');
                },
                () => {},
                '恢复默认地区'
            );
        },

        // ==================== 事件绑定 ====================

        bindRegionManagerEvents() {
            const dom = App.dom;
            if (dom.btnAddRegion) dom.btnAddRegion.addEventListener('click', () => this.openEdit(-1));
            if (dom.btnResetRegions) dom.btnResetRegions.addEventListener('click', () => this.resetToDefault());
            if (dom.btnConfirmRegionEdit) dom.btnConfirmRegionEdit.addEventListener('click', () => this.confirmEdit());
            if (dom.btnCancelRegionEdit) dom.btnCancelRegionEdit.addEventListener('click', () => App.modal.closeModal(dom.modalRegionEdit));
            if (dom.btnCloseRegionEdit) dom.btnCloseRegionEdit.addEventListener('click', () => App.modal.closeModal(dom.modalRegionEdit));
            if (dom.modalRegionEdit) {
                dom.modalRegionEdit.addEventListener('click', function (e) {
                    if (e.target === this) App.modal.closeModal(dom.modalRegionEdit);
                });
            }

            if (dom.regionList) {
                dom.regionList.addEventListener('click', (e) => {
                    const btn = e.target.closest('button[data-action]');
                    if (!btn) return;
                    const index = parseInt(btn.dataset.index, 10);
                    if (btn.dataset.action === 'edit') this.openEdit(index);
                    else if (btn.dataset.action === 'delete') this.deleteRegion(index);
                });

                dom.regionList.addEventListener('mouseover', (e) => {
                    const card = e.target.closest('.region-card');
                    if (!card) return;
                    if (this._hoveredCard === card) return;
                    this._hoveredCard = card;
                    this._highlightRegion(card.dataset.region);
                });

                dom.regionList.addEventListener('mouseout', (e) => {
                    const card = e.target.closest('.region-card');
                    if (!card) return;
                    if (e.relatedTarget && card.contains(e.relatedTarget)) return;
                    this._hoveredCard = null;
                    App.cellHighlighter.clear();
                });

                dom.regionList.addEventListener('mouseleave', () => {
                    this._hoveredCard = null;
                    App.cellHighlighter.clear();
                });
            }
        }
    };

})(window.App = window.App || {});