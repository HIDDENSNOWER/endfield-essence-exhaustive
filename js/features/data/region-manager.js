/**
 * region-manager.js - 地区管理（列表 / 编辑 / 悬停高亮）
 * 挂载到 App.regionManager
 *
 * 功能：
 * - 列出所有地区，支持新增 / 编辑 / 删除 / 恢复默认
 * - 悬停地区卡片时，在数据表中高亮该地区可刷取的全部基质单元格
 *   - 未完全获取 → 红色闪烁边框
 *   - 已完全获取 → 绿色闪烁边框
 *   - 其余数据格 → 变暗蒙版
 */
(function (App) {
    'use strict';

    let editingIndex = -1; // -1 表示新增

    /** 计算单元格的"未获取缺口贡献"（与 unacquired.js 保持一致） */
    function getUnacquiredScore(cell) {
        if (cell.t > 0) return Math.max(0, cell.t - (cell.a || 0));
        if (cell.v !== '') return 0;
        return 1;
    }

    App.regionManager = {
        _highlightedCells: [],
        _hoveredCard: null,

        renderList() {
            const container = App.dom.regionList;
            if (!container) return;
            const regions = App.storage.getRegions();
            if (regions.length === 0) {
                container.innerHTML = '<p class="input-hint" style="text-align:center;">暂无地区</p>';
                return;
            }
            container.innerHTML = regions.map((region, index) => `
                <div class="region-card" data-region="${App.utils.escapeHtml(region.name)}" data-index="${index}">
                    <div class="region-card-header">
                        <span class="region-card-name">${App.utils.escapeHtml(region.name)}</span>
                        <div class="region-card-actions">
                            <button class="btn btn-sm btn-outline-gray" data-action="edit" data-index="${index}">编辑</button>
                            <button class="btn btn-sm btn-danger" data-action="delete" data-index="${index}">删除</button>
                        </div>
                    </div>
                    <div class="region-card-body">
                        <div class="region-attr-row">
                            <span class="region-label">副属性</span>
                            ${region.rows.map(r => `<span class="region-tag">${App.utils.escapeHtml(r)}</span>`).join('')}
                        </div>
                        <div class="region-attr-row">
                            <span class="region-label">词条</span>
                            ${region.groups.map(g => `<span class="region-tag">${App.utils.escapeHtml(g)}</span>`).join('')}
                        </div>
                    </div>
                </div>`).join('');
        },

        // ==================== 悬停高亮 ====================

        /**
         * 高亮某地区的全部可刷取单元格（8副属性 × 8词条 × 5主属性）
         * @param {string} regionName
         */
        _highlightRegion(regionName) {
            this._clearHighlight();

            const regions = App.storage.getRegions();
            const region = regions.find(r => r.name === regionName);
            if (!region) return;

            const C = App.constants;
            const mainAttrs = C.SUB_ATTRS;

            this._highlightedCells = [];
            let firstUnacquiredTd = null;

            // 遍历该地区的 8 个副属性（行）
            region.rows.forEach(rowName => {
                const rowIdx = C.ROW_NAMES.indexOf(rowName);
                if (rowIdx < 0) return;
                const row = App.state.rows[rowIdx];
                if (!row) return;

                // 遍历该地区的 8 个词条（列组）
                region.groups.forEach(groupName => {
                    const gi = C.ALL_GROUPS.findIndex(g => g.name === groupName);
                    if (gi < 0) return;

                    // 遍历 5 个主属性（列）
                    mainAttrs.forEach(mainAttr => {
                        const si = C.ALL_GROUPS[gi].sub.indexOf(mainAttr);
                        if (si < 0) return;
                        const colIndex = App.utils.getColumnIndex(gi, si);

                        const cell = App.utils.normalizeCell(row.data[colIndex]);
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
                });
            });

            // 变暗蒙版（两个表格都变暗）
            this._applyDimming();

            // 滚动到第一个红框
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
                App.modal.showAlert('副属性和词条至少各选一个', '提示');
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
                // 编辑 / 删除按钮
                dom.regionList.addEventListener('click', (e) => {
                    const btn = e.target.closest('button[data-action]');
                    if (!btn) return;
                    const index = parseInt(btn.dataset.index, 10);
                    if (btn.dataset.action === 'edit') this.openEdit(index);
                    else if (btn.dataset.action === 'delete') this.deleteRegion(index);
                });

                // 悬停高亮
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
                    this._clearHighlight();
                });

                dom.regionList.addEventListener('mouseleave', () => {
                    this._hoveredCard = null;
                    this._clearHighlight();
                });
            }
        }
    };

})(window.App = window.App || {});