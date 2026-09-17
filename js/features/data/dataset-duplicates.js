/**
 * dataset-duplicates.js - 外部导入数据集的重复基质提示
 * 挂载到 App.datasetDuplicates
 *
 * 用途：提示用户日志中有哪些基质是重复的，供用户去游戏内基质库清除。
 *       用户在游戏内清除后，回到此处勾选 → 清除勾选 → 提示条目消失。
 *
 * 存储：smarttable_dataset_import_meta
 *   { [数据集名]: { importedAt, normalDuplicates[], implementedOverflows[] } }
 *
 * 注意：清除仅操作 meta 键，不改动数据集本体。
 */
(function (App) {
    'use strict';

    const META_KEY = 'smarttable_dataset_import_meta';

    let _floatingOpen = false;

    function loadAll() {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (!raw) return {};
            const obj = JSON.parse(raw);
            return obj && typeof obj === 'object' ? obj : {};
        } catch (_e) {
            return {};
        }
    }

    function saveAll(obj) {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(obj));
        } catch (_e) {
            /* 静默 */
        }
    }

    function shortRow(s) {
        return String(s).endsWith('提升') ? String(s).slice(0, -2) : String(s);
    }

    App.datasetDuplicates = {
        /** 写入某个数据集的重复记录 */
        save(name, dupData) {
            if (!name || !dupData) return;
            const all = loadAll();
            const normal = Array.isArray(dupData.normalDuplicates) ? dupData.normalDuplicates : [];
            const overflows = Array.isArray(dupData.implementedOverflows) ? dupData.implementedOverflows : [];
            if (normal.length === 0 && overflows.length === 0) {
                delete all[name];
            } else {
                all[name] = {
                    importedAt: new Date().toISOString(),
                    normalDuplicates: normal,
                    implementedOverflows: overflows
                };
            }
            saveAll(all);
        },

        /** 读取某个数据集的重复记录 */
        load(name) {
            if (!name) return null;
            const all = loadAll();
            return all[name] || null;
        },

        /** 删除某个数据集的重复记录（数据集被删时调用） */
        clear(name) {
            if (!name) return;
            const all = loadAll();
            if (all[name]) {
                delete all[name];
                saveAll(all);
            }
        },

        /** 刷新按钮显隐（由 datasetManager 调用） */
        render() {
            const btn = App.dom && App.dom.btnDatasetDup;
            if (!btn) return;

            const key = App.storage.loadCurrentDatasetKey();
            const meta = this.load(key);
            const normal = (meta && meta.normalDuplicates) || [];
            const overflows = (meta && meta.implementedOverflows) || [];
            const total = normal.length + overflows.length;

            if (total === 0) {
                btn.style.display = 'none';
                if (_floatingOpen) this.closeFloating();
                return;
            }

            btn.style.display = '';
            btn.textContent = `⚠️ 重复基质提示（${total} 处）`;
            btn.title = `普通基质重复 ${normal.length} 处 · 实装超额 ${overflows.length} 处`;
        },

        /** 打开悬浮窗 */
        openFloating() {
            const el = App.dom && App.dom.datasetDupFloating;
            const body = App.dom && App.dom.datasetDupFloatingBody;
            if (!el || !body) return;

            const key = App.storage.loadCurrentDatasetKey();
            const meta = this.load(key);
            if (!meta) return;

            body.innerHTML = this._renderBody(meta);
            el.style.display = 'flex';
            _floatingOpen = true;
        },

        /** 关闭悬浮窗 */
        closeFloating() {
            const el = App.dom && App.dom.datasetDupFloating;
            if (!el) return;
            el.style.display = 'none';
            _floatingOpen = false;
        },

        /** 切换悬浮窗 */
        toggleFloating() {
            if (_floatingOpen) this.closeFloating();
            else this.openFloating();
        },

        /** 渲染悬浮窗内容 */
        _renderBody(meta) {
            const normal = (meta && meta.normalDuplicates) || [];
            const overflows = (meta && meta.implementedOverflows) || [];

            let html = '';

            if (normal.length > 0) {
                html += '<div class="dataset-dup-floating-section">';
                html += '<div class="dataset-dup-floating-section-title">普通基质 · 保留 v 最大的 1 个，其余为重复：</div>';
                normal.forEach((d, i) => {
                    const path = `${d.subName} - ${shortRow(d.rowName)} - ${d.groupName}`;
                    const values = (d.all || [])
                        .map((v, j) =>
                            j === d.keepIdx
                                ? `<b class="dataset-dup-keep">${App.utils.escapeHtml(v)}</b>`
                                : `<s class="dataset-dup-discard">${App.utils.escapeHtml(v)}</s>`
                        )
                        .join(' - ');
                    html += '<label class="dataset-dup-floating-item">';
                    html += `<input type="checkbox" class="dup-item-checkbox" data-type="normal" data-idx="${i}">`;
                    html += `<span class="dataset-dup-floating-cell">${App.utils.escapeHtml(path)}</span>`;
                    html += `<span class="dataset-dup-floating-meta">${d.total} 个</span>`;
                    html += `<span class="dataset-dup-floating-values">${values}</span>`;
                    html += '</label>';
                });
                html += '</div>';
            }

            if (overflows.length > 0) {
                html += '<div class="dataset-dup-floating-section">';
                html += '<div class="dataset-dup-floating-section-title">实装基质 · 保留 t 个，超出为超额：</div>';
                overflows.forEach((d, i) => {
                    const path = `${d.subName} - ${shortRow(d.rowName)} - ${d.groupName}`;
                    const values = (d.all || [])
                        .map((v, j) =>
                            j < d.keepCount
                                ? `<b class="dataset-dup-keep">${App.utils.escapeHtml(v)}</b>`
                                : `<s class="dataset-dup-discard">${App.utils.escapeHtml(v)}</s>`
                        )
                        .join(' - ');
                    html += '<label class="dataset-dup-floating-item">';
                    html += `<input type="checkbox" class="dup-item-checkbox" data-type="overflow" data-idx="${i}">`;
                    html += `<span class="dataset-dup-floating-cell">${App.utils.escapeHtml(path)}</span>`;
                    html += `<span class="dataset-dup-floating-meta">${d.total} 个 · t=${d.baseT} · 超出 ${d.total - d.baseT}</span>`;
                    html += `<span class="dataset-dup-floating-values">${values}</span>`;
                    html += '</label>';
                });
                html += '</div>';
            }

            if (!html) {
                html = '<p class="input-hint" style="text-align:center;padding:24px 0;">无重复记录</p>';
            }

            return html;
        },

        /**
         * 清除勾选的提示条目
         * 只从 meta 中移除提示记录，不影响数据集本体
         */
        clearSelected() {
            const body = App.dom && App.dom.datasetDupFloatingBody;
            if (!body) return;

            const checked = body.querySelectorAll('.dup-item-checkbox:checked');
            if (checked.length === 0) {
                if (App.modal && App.modal.showTemporaryHint) {
                    App.modal.showTemporaryHint('请先勾选要清除的条目', 'info');
                }
                return;
            }

            const key = App.storage.loadCurrentDatasetKey();
            const meta = this.load(key);
            if (!meta) return;

            const normal = Array.isArray(meta.normalDuplicates) ? meta.normalDuplicates.slice() : [];
            const overflows = Array.isArray(meta.implementedOverflows) ? meta.implementedOverflows.slice() : [];

            const idxNormal = [];
            const idxOverflow = [];
            checked.forEach((c) => {
                const type = c.dataset.type;
                const i = parseInt(c.dataset.idx, 10);
                if (isNaN(i)) return;
                if (type === 'normal') idxNormal.push(i);
                else if (type === 'overflow') idxOverflow.push(i);
            });

            // 倒序删除，避免索引漂移
            idxNormal.sort((a, b) => b - a).forEach((i) => normal.splice(i, 1));
            idxOverflow.sort((a, b) => b - a).forEach((i) => overflows.splice(i, 1));

            // 写回 meta（save 内部对空数组会自动删除该键）
            this.save(key, {
                normalDuplicates: normal,
                implementedOverflows: overflows
            });

            // 全清空 → 关闭悬浮窗并隐藏按钮；否则原地重渲染
            if (normal.length === 0 && overflows.length === 0) {
                this.closeFloating();
            } else {
                body.innerHTML = this._renderBody({
                    normalDuplicates: normal,
                    implementedOverflows: overflows
                });
            }
            this.render();

            if (App.modal && App.modal.showTemporaryHint) {
                App.modal.showTemporaryHint(`已清除 ${checked.length} 条提示`, 'success');
            }
        },

        /** 绑定事件（由 events.js 调用） */
        bindEvents() {
            const d = App.dom;
            if (d.btnDatasetDup) {
                d.btnDatasetDup.addEventListener('click', () => this.toggleFloating());
            }
            if (d.btnCloseDatasetDup) {
                d.btnCloseDatasetDup.addEventListener('click', () => this.closeFloating());
            }
            if (d.btnDatasetDupClear) {
                d.btnDatasetDupClear.addEventListener('click', () => this.clearSelected());
            }
            // Esc 关闭悬浮窗（更高优先级弹窗打开时不处理）
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape' || !_floatingOpen) return;
                if (App.modal && App.modal.modalStack && App.modal.modalStack.length > 0) return;
                this.closeFloating();
            });
        }
    };
})(window.App = window.App || {});