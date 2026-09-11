/**
 * region-manager.js - 地区管理（列表 / 编辑 / 悬停高亮）
 * 挂载到 App.regionManager
 *
 * v0.9.2 重构：
 *   - 高亮逻辑改为调用 App.cellHighlighter
 *   - getUnacquiredScore 抽取至 App.utils
 *   - 移除本模块内的 _applyDimming / _removeDimming / _highlightedCells
 */
(function (App) {
    'use strict';

    let editingIndex = -1;

    App.regionManager = {
        _hoveredCard: null,

        // ==================== 渲染 ====================

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
                            <span class="region-label">属性</span>
                            ${region.rows.map(r => `<span class="region-tag">${App.utils.escapeHtml(r)}</span>`).join('')}
                        </div>
                        <div class="region-attr-row">
                            <span class="region-label">系列技能</span>
                            ${region.groups.map(g => `<span class="region-tag">${App.utils.escapeHtml(g)}</span>`).join('')}
                        </div>
                    </div>
                </div>`).join('');
        },

        // ==================== 悬停高亮 ====================

        /**
         * 高亮某地区的全部可刷取单元格（8 属性 × 8 系列技能 × 5 能力值 = 320 格）
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
                App.modal.showAlert('属性和系列技能至少各选一个', '提示');
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