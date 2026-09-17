/**
 * external-import.js - 外部数据导入 / 转换
 * 挂载到 App.externalImport
 *
 * 输入：endfield-essence-recognizer 的日志
 *
 * 关键日志行（时间顺序，同一基质连续出现）：
 *   [INFO]    已识别当前基质，属性: A、B、C, 稀有度: R, 未弃用, 已锁定
 *   [WARNING] 这个基质虽然匹配武器X（N★ 类型），但…因此这个基质是养成材料。   ← 实装
 *   [SUCCESS] 这个基质是养成材料，它不匹配任何已实装武器。                     ← 非实装
 *
 * 语义：
 *   实装基质   → 拥有数 a += 1（t 保持 data.json 原值不变）
 *   非实装基质 → v = 词条等级拼接（同格取字典序最大）；
 *                但若 data.json 该格 t>0（视为实装），则 a += 1，不写 v
 *
 * 基准来源：data/data.json（即默认数据集的源文件，fetch 读取）
 */
(function (App) {
    'use strict';

    const DATA_URL = 'data/data.json';
    const RECOGNIZE_RE = /已识别当前基质[，,]\s*属性[:：]\s*([^,，]+?)\s*[,，]\s*稀有度[:：]\s*([^,，\s]+)/;
    const IMPLEMENTED_RE = /虽然匹配武器/;
    const LEVEL_SUFFIX_RE = /\+\d+$/;

    function findIndexByName(arr, raw) {
        if (!raw) return -1;
        let i = arr.indexOf(raw);
        if (i >= 0) return i;
        if (raw.endsWith('提升')) {
            i = arr.indexOf(raw.slice(0, -2));
            if (i >= 0) return i;
        } else {
            i = arr.indexOf(raw + '提升');
            if (i >= 0) return i;
        }
        return -1;
    }

    function getGroupNames() {
        const groups = App.constants.ALL_GROUPS || [];
        return groups.map(g => (typeof g === 'string' ? g : (g.name || g.groupName || '')));
    }

    App.externalImport = {
        _lastPreview: null,
        _baseRows: undefined, // undefined = 未加载；null = 加载失败；数组 = 成功

        // ============ 弹窗 ============
        open() {
            const d = App.dom;
            d.extImportFile.value = '';
            d.extImportFileName.textContent = '未选择';
            d.extImportPaste.value = '';
            d.extImportDatasetName.value = '';
            d.extImportPreview.style.display = 'none';
            d.extImportPreview.innerHTML = '';
            d.btnConfirmExternalImport.disabled = true;
            this._lastPreview = null;
            this._baseRows = undefined;
            App.modal.openModal(d.modalExternalImport);
        },
        close() {
            App.modal.closeModal(App.dom.modalExternalImport);
        },

        // ============ 基准数据 ============
        /** 读取 data/data.json，作为 t 的基准；失败返回 null */
        async _loadBaseRows() {
            if (this._baseRows !== undefined) return this._baseRows;
            try {
                const res = await fetch(DATA_URL, { cache: 'no-store' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const json = await res.json();
                const rows = (json && Array.isArray(json.rows)) ? json.rows
                           : (Array.isArray(json) ? json : null);
                if (Array.isArray(rows) && rows.length === (App.constants.ROW_NAMES || []).length) {
                    this._baseRows = rows;
                    return rows;
                }
                console.warn('[external-import] data.json 结构不符，t 基准按 0 处理');
            } catch (err) {
                console.warn('[external-import] 读取 data.json 失败：', err);
            }
            this._baseRows = null;
            return null;
        },

        // ============ 解析 ============
        parseLog(text) {
            const out = [];
            if (!text) return out;
            const lines = text.split(/\r?\n/);
            let current = null;
            for (const line of lines) {
                const m = line.match(RECOGNIZE_RE);
                if (m) {
                    if (current) out.push(current);
                    const parts = m[1].split('、').map(s => s.trim());
                    const names = parts.map(s => s.replace(LEVEL_SUFFIX_RE, '').trim());
                    const levels = parts.map(s => {
                        const lm = s.match(LEVEL_SUFFIX_RE);
                        return lm ? parseInt(lm[0].slice(1), 10) : 6;
                    });
                    current = {
                        subAttrRaw: names[0] || '',
                        rowRaw: names[1] || '',
                        groupRaw: names[2] || '',
                        vStr: levels.join(''),
                        rarityRaw: m[2].trim(),
                        isImplemented: false,
                        raw: m[0]
                    };
                    continue;
                }
                if (current && !current.isImplemented && IMPLEMENTED_RE.test(line)) {
                    current.isImplemented = true;
                }
            }
            if (current) out.push(current);
            return out.filter(c => c.rowRaw && c.groupRaw && c.subAttrRaw);
        },

        resolveEntries(entries) {
            const SUB = App.constants.SUB_ATTRS || [];
            const ROW = App.constants.ROW_NAMES || [];
            const GROUP = getGroupNames();
            const resolved = [];
            const unresolved = [];
            for (const e of entries) {
                const subIdx = findIndexByName(SUB, e.subAttrRaw);
                const rowIdx = findIndexByName(ROW, e.rowRaw);
                const groupIdx = findIndexByName(GROUP, e.groupRaw);
                if (subIdx < 0 || rowIdx < 0 || groupIdx < 0) {
                    unresolved.push({ entry: e, missSub: subIdx < 0, missRow: rowIdx < 0, missGroup: groupIdx < 0 });
                    continue;
                }
                resolved.push({
                    rowIdx, groupIdx, subIdx,
                    isImplemented: e.isImplemented,
                    vStr: e.vStr
                });
            }
            return { resolved, unresolved };
        },

        /**
         * 按单元格检测重复 / 超额
         *
         * 普通基质（data.json 该格 t=0，日志非实装命中 N 次）：
         *   - 保留 vStr 最大的 1 个，其余 N-1 个列出
         *
         * 实装基质（日志实装命中 N 次，data.json 该格 t=T）：
         *   - 保留前 T 个（T=0 时全部为超额），超出 N-T 个列出
         */
        detectDuplicates(implemented, normal) {
            const ROW = App.constants.ROW_NAMES || [];
            const GROUP = getGroupNames();
            const SUB = App.constants.SUB_ATTRS || [];
            const base = this._baseRows;

            const getBaseT = (rowIdx, groupIdx, subIdx) => {
                if (!base || !base[rowIdx] || !Array.isArray(base[rowIdx].data)) return 0;
                const colIdx = App.utils.getColumnIndex(groupIdx, subIdx);
                if (colIdx < 0) return 0;
                const cell = base[rowIdx].data[colIdx];
                return cell ? (Number(cell.t) || 0) : 0;
            };

            // 按格分组
            const groupBy = (list) => {
                const m = new Map();
                for (const r of list) {
                    const key = `${r.rowIdx}_${r.groupIdx}_${r.subIdx}`;
                    if (!m.has(key)) {
                        m.set(key, { rowIdx: r.rowIdx, groupIdx: r.groupIdx, subIdx: r.subIdx, items: [] });
                    }
                    m.get(key).items.push(r.vStr || '');
                }
                return m;
            };

            const impByCell = groupBy(implemented);
            const norByCell = groupBy(normal);

            // 普通基质：data.json t=0 且非实装命中 ≥ 2
            const normalDuplicates = [];
            for (const g of norByCell.values()) {
                if (g.items.length <= 1) continue;
                const baseT = getBaseT(g.rowIdx, g.groupIdx, g.subIdx);
                if (baseT > 0) continue; // data.json 已实装，非实装命中会被当实装处理

                const sorted = g.items.slice().sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
                const keep = sorted[0];
                const keepIdx = g.items.indexOf(keep);
                normalDuplicates.push({
                    rowIdx: g.rowIdx, groupIdx: g.groupIdx, subIdx: g.subIdx,
                    total: g.items.length,
                    all: g.items,
                    keepIdx,
                    rowName: ROW[g.rowIdx] || '?',
                    groupName: GROUP[g.groupIdx] || '?',
                    subName: SUB[g.subIdx] || '?'
                });
            }

            // 实装基质：实装命中 N > data.json t=T
            const implementedOverflows = [];
            for (const g of impByCell.values()) {
                const baseT = getBaseT(g.rowIdx, g.groupIdx, g.subIdx);
                const N = g.items.length;
                if (N <= baseT) continue; // 未超额

                implementedOverflows.push({
                    rowIdx: g.rowIdx, groupIdx: g.groupIdx, subIdx: g.subIdx,
                    total: N,
                    baseT,
                    all: g.items,
                    keepCount: baseT,
                    rowName: ROW[g.rowIdx] || '?',
                    groupName: GROUP[g.groupIdx] || '?',
                    subName: SUB[g.subIdx] || '?'
                });
            }

            return { normalDuplicates, implementedOverflows };
        },

        // ============ 聚合 ============
        /**
         * 生成 12 × 70 的 rows：
         *   - t = data.json 对应格的 t（原值照抄，不累加）
         *   - a = data.json 对应格的 a + 命中实装次数
         *         （含「data.json 该格 t>0 且日志识别为非实装」的条目）
         *   - v = 仅当 data.json 该格 t=0 且日志识别为非实装时写入
         *         （同格取字典序最大）
         *   - note = 空
         */
        buildRows(implemented, normal) {
            const ROW = App.constants.ROW_NAMES || [];
            const base = this._baseRows;

            const rows = ROW.map((name, rowIdx) => ({
                name,
                data: new Array(70).fill(null).map((_, colIdx) => {
                    let t = 0, a = 0;
                    if (base &&
                        base[rowIdx] &&
                        Array.isArray(base[rowIdx].data) &&
                        base[rowIdx].data[colIdx]) {
                        const b = base[rowIdx].data[colIdx];
                        t = Number(b.t) || 0;
                        a = Number(b.a) || 0;
                    }
                    // data.json 里 t>0 的格一律不写 v（视为实装）
                    return { v: '', t, a, note: { text: '', images: [] } };
                })
            }));

            // 实装基质：a += 1
            for (const r of implemented) {
                const colIdx = App.utils.getColumnIndex(r.groupIdx, r.subIdx);
                rows[r.rowIdx].data[colIdx].a += 1;
            }

            // 非实装基质：
            //   - data.json 该格 t>0 → 视为实装 → a += 1（不写 v）
            //   - data.json 该格 t=0 → 写 v（取字典序最大）
            for (const r of normal) {
                const colIdx = App.utils.getColumnIndex(r.groupIdx, r.subIdx);
                const cell = rows[r.rowIdx].data[colIdx];
                if (cell.t > 0) {
                    cell.a += 1;
                    continue;
                }
                if (r.vStr && r.vStr > (cell.v || '')) cell.v = r.vStr;
            }

            return rows;
        },

        // ============ 预览 ============
        _readLogText() {
            const d = App.dom;
            const pasted = d.extImportPaste.value.trim();
            if (pasted) return Promise.resolve(pasted);
            const file = d.extImportFile.files && d.extImportFile.files[0];
            if (file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('读取文件失败'));
                    reader.readAsText(file, 'utf-8');
                });
            }
            return Promise.reject(new Error('请选择日志文件或粘贴日志内容'));
        },

        async preview() {
            const d = App.dom;
            try {
                await this._loadBaseRows();

                const text = await this._readLogText();
                const all = this.parseLog(text);
                if (all.length === 0) {
                    d.extImportPreview.style.display = '';
                    d.extImportPreview.innerHTML = '<div style="color:var(--danger-primary);">未找到「已识别当前基质」记录。</div>';
                    d.btnConfirmExternalImport.disabled = true;
                    this._lastPreview = null;
                    return;
                }
                const implementedRaw = all.filter(e => e.isImplemented);
                const normalRaw = all.filter(e => !e.isImplemented);

                const impRes = this.resolveEntries(implementedRaw);
                const norRes = this.resolveEntries(normalRaw);

                const implemented = impRes.resolved;
                const normal = norRes.resolved;
                const unresolved = impRes.unresolved.concat(norRes.unresolved);

                const impCells = new Set();
                const norCells = new Set();
                for (const r of implemented) impCells.add(`${r.rowIdx}_${r.groupIdx}_${r.subIdx}`);
                for (const r of normal) norCells.add(`${r.rowIdx}_${r.groupIdx}_${r.subIdx}`);

                const baseInfo = this._baseRows
                    ? `<span style="color:var(--success-primary,#2ecc71);">已加载 data/data.json 作为 t 基准</span>`
                    : `<span style="color:var(--danger-primary);">未加载 data/data.json，t 基准按 0 处理</span>`;

                let html = '';
                html += `<div>日志识别条目：<b>${all.length}</b> 条</div>`;
                html += `<div style="margin-left:16px;">· 实装基质：<b>${implementedRaw.length}</b> 条 → a+=1；命中 ${impCells.size} 格</div>`;
                html += `<div style="margin-left:16px;">· 非实装基质：<b>${normalRaw.length}</b> 条 → 写 v；命中 ${norCells.size} 格</div>`;
                html += `<div style="margin-top:6px;">t 基准：${baseInfo}</div>`;
                html += `<div style="margin-top:6px;">成功映射：实装 <b>${implemented.length}</b> · 非实装 <b>${normal.length}</b></div>`;

                if (unresolved.length > 0) {
                    html += `<div style="color:var(--danger-primary); margin-top:6px;">未能映射：<b>${unresolved.length}</b> 条（前 5 条）</div>`;
                    html += '<ul style="margin:4px 0 0 16px; padding:0;">';
                    for (const u of unresolved.slice(0, 5)) {
                        const miss = [];
                        if (u.missSub) miss.push('能力值');
                        if (u.missRow) miss.push('属性');
                        if (u.missGroup) miss.push('系列技能');
                        html += `<li style="font-size:0.78rem; color:var(--text-secondary);">未能匹配：${miss.join(' / ')} → ${App.utils.escapeHtml(u.entry.raw.slice(0, 100))}</li>`;
                    }
                    html += '</ul>';
                }

                if (implemented.length + normal.length > 0) {
                    const ROW = App.constants.ROW_NAMES || [];
                    const GROUP = getGroupNames();
                    const SUB = App.constants.SUB_ATTRS || [];
                    html += '<div style="margin-top:8px; font-weight:600;">示例：</div>';
                    html += '<ul style="margin:4px 0 0 16px; padding:0;">';
                    const sample = implemented.slice(0, 3).map(r => ({ r, tag: '实装 → a+1' }))
                        .concat(normal.slice(0, 2).map(r => ({ r, tag: `非实装 → v=${App.utils.escapeHtml(r.vStr)}` })));
                    for (const { r, tag } of sample) {
                        html += `<li style="font-size:0.78rem; color:var(--text-secondary);">${App.utils.escapeHtml(ROW[r.rowIdx] || '?')} × ${App.utils.escapeHtml(GROUP[r.groupIdx] || '?')} × ${App.utils.escapeHtml(SUB[r.subIdx] || '?')}：<b>${tag}</b></li>`;
                    }
                    html += '</ul>';
                }

                d.extImportPreview.style.display = '';
                d.extImportPreview.innerHTML = html;
                d.btnConfirmExternalImport.disabled = (implemented.length + normal.length === 0);
                this._lastPreview = { implemented, normal };
            } catch (err) {
                d.extImportPreview.style.display = '';
                d.extImportPreview.innerHTML = `<div style="color:var(--danger-primary);">${App.utils.escapeHtml(err.message || String(err))}</div>`;
                d.btnConfirmExternalImport.disabled = true;
                this._lastPreview = null;
            }
        },

        // ============ 重复 / 超额渲染 ============
        _renderDuplicateSection(dupData) {
            const { normalDuplicates, implementedOverflows } = dupData;
            if (normalDuplicates.length === 0 && implementedOverflows.length === 0) return '';

            const shortRow = (s) => (s.endsWith('提升') ? s.slice(0, -2) : s);

            const hints = [];
            if (normalDuplicates.length > 0) hints.push(`普通基质重复 ${normalDuplicates.length} 处`);
            if (implementedOverflows.length > 0) hints.push(`实装超额 ${implementedOverflows.length} 处`);

            let html = '<details class="ext-dup" open>';
            html += '<summary><span>⚠️ 重复基质提示</span>';
            html += `<span class="ext-dup-hint">（${hints.join(' · ')}）</span></summary>`;
            html += '<div class="ext-dup-body">';

            if (normalDuplicates.length > 0) {
                html += '<div class="ext-dup-section">';
                html += '<div class="ext-dup-section-title">普通基质 · 保留 v 最大的 1 个，其余重复：</div>';
                for (const d of normalDuplicates) {
                    const path = `${d.subName} - ${shortRow(d.rowName)} - ${d.groupName}`;
                    const values = d.all
                        .map((v, i) =>
                            i === d.keepIdx
                                ? `<b class="ext-dup-keep">${App.utils.escapeHtml(v)}</b>`
                                : `<s class="ext-dup-discard">${App.utils.escapeHtml(v)}</s>`
                        )
                        .join(' - ');
                    html += '<div class="ext-dup-item">';
                    html += `<span class="ext-dup-cell">${App.utils.escapeHtml(path)}</span>`;
                    html += `<span class="ext-dup-meta">${d.total} 个</span>`;
                    html += `<span class="ext-dup-values">${values}</span>`;
                    html += '</div>';
                }
                html += '</div>';
            }

            if (implementedOverflows.length > 0) {
                html += '<div class="ext-dup-section">';
                html += '<div class="ext-dup-section-title">实装基质 · 保留 t 个，超出：</div>';
                for (const d of implementedOverflows) {
                    const path = `${d.subName} - ${shortRow(d.rowName)} - ${d.groupName}`;
                    const values = d.all
                        .map((v, i) =>
                            i < d.keepCount
                                ? `<b class="ext-dup-keep">${App.utils.escapeHtml(v)}</b>`
                                : `<s class="ext-dup-discard">${App.utils.escapeHtml(v)}</s>`
                        )
                        .join(' - ');
                    html += '<div class="ext-dup-item">';
                    html += `<span class="ext-dup-cell">${App.utils.escapeHtml(path)}</span>`;
                    html += `<span class="ext-dup-meta">${d.total} 个 · t=${d.baseT} · 超出 ${d.total - d.baseT}</span>`;
                    html += `<span class="ext-dup-values">${values}</span>`;
                    html += '</div>';
                }
                html += '</div>';
            }

            html += '</div></details>';
            return html;
        },

        // ============ 导入 ============
        confirm() {
            const d = App.dom;
            if (!this._lastPreview || (this._lastPreview.implemented.length + this._lastPreview.normal.length === 0)) {
                App.modal.showAlert('请先点击「预览」确认可以映射。', '提示');
                return;
            }

            let name = (d.extImportDatasetName.value || '').trim();
            if (!name) {
                const n = new Date();
                const pad = v => String(v).padStart(2, '0');
                name = `外部导入_${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}_${pad(n.getHours())}${pad(n.getMinutes())}`;
            }
            name = name.replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 50);

            if (App.datasetManager.isReservedKey(name)) {
                App.modal.showAlert('数据集名称不可用（不能以 smarttable_ 开头）。', '导入失败');
                return;
            }
            if (App.constants.PROTECTED_DATASETS.includes(name)) {
                App.modal.showAlert('数据集名称与受保护数据集冲突。', '导入失败');
                return;
            }
            if (App.storage.getDatasetList().includes(name)) {
                App.modal.showConfirmDialog(
                    `数据集「${App.utils.escapeHtml(name)}」已存在，是否覆盖？`,
                    () => this._save(name),
                    null,
                    '确认覆盖'
                );
                return;
            }
            this._save(name);
        },

        _save(name) {
            // 1) 先用日志 + data.json 基准组装原始 rows
            const rawRows = this.buildRows(
                this._lastPreview.implemented,
                this._lastPreview.normal
            );

            // 2) 归一化：与 import-export.js / proceedImport 保持一致
            //    - v 修剪 / t、a 转数字 / a ≤ t 夹紧
            //    - note 结构统一为 { text: '', images: [] }
            const rows = rawRows.map((row) => ({
                name: row.name,
                data: row.data.map((cell) => App.utils.normalizeCell(cell))
            }));

            // 2.5) 检测重复并持久化（写数据集之前）
            if (App.datasetDuplicates && App.datasetDuplicates.save) {
                const dupData = this.detectDuplicates(
                    this._lastPreview.implemented,
                    this._lastPreview.normal
                );
                App.datasetDuplicates.save(name, dupData);
            }

            // 3) 持久化与状态写入
            App.storage.saveCurrentDatasetKey(name);
            App.storage.setJSON(name, rows);
            App.storage.addDatasetKey(name);
            App.state.rows = rows;

            // 4) 刷新界面（顺序与 import-export.js 一致）
            App.datasetManager.updateDatasetDisplay();
            App.datasetManager.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.datasetManager.updateLockedUI();
            App.datasetManager.resetHistorySafe();
            if (typeof App.datasetRemark.updateDatasetRemark === 'function') {
                App.datasetRemark.updateDatasetRemark();
            }

            // 5) 关闭弹窗 + 提示
            this.close();
            App.modal.showAlert(`已导入为新数据集：${App.utils.escapeHtml(name)}`, '导入成功');
        },

        // ============ 绑定 ============
        bindEvents() {
            const d = App.dom;
            if (d.btnImportExternal) d.btnImportExternal.addEventListener('click', () => this.open());
            if (d.btnCloseExternalImport) d.btnCloseExternalImport.addEventListener('click', () => this.close());
            if (d.btnCancelExternalImport) d.btnCancelExternalImport.addEventListener('click', () => this.close());
            if (d.modalExternalImport) {
                d.modalExternalImport.addEventListener('click', (e) => {
                    if (e.target === d.modalExternalImport) this.close();
                });
            }
            if (d.btnExtImportPickFile && d.extImportFile) {
                d.btnExtImportPickFile.addEventListener('click', () => d.extImportFile.click());
            }
            if (d.extImportFile) {
                d.extImportFile.addEventListener('change', () => {
                    const f = d.extImportFile.files && d.extImportFile.files[0];
                    d.extImportFileName.textContent = f ? f.name : '未选择';
                    if (f) {
                        d.extImportPaste.value = '';
                        this.preview();
                    }
                });
            }
            if (d.btnExtImportPreview) d.btnExtImportPreview.addEventListener('click', () => this.preview());
            if (d.btnConfirmExternalImport) d.btnConfirmExternalImport.addEventListener('click', () => this.confirm());
        }
    };

})(window.App = window.App || {});