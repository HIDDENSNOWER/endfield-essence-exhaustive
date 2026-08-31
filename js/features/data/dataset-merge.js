/**
 * dataset-merge.js - 数据集覆盖/合并引擎
 * 挂载到 App.datasetMerge
 *
 * 设计目标：为「数据集覆盖/合并」提供更符合逻辑的处理结构。
 *
 * 两种入口：
 *  A. 导入重名：导入数据与现有数据集同名时，冲突弹窗中选择「合并」
 *  B. 手动合并：工具栏「合并」按钮，勾选若干独立数据集进行合并
 *     （第一个勾选的作为合并基准，其余依次并入；结果可保存为新数据集
 *       或写回第一个勾选的数据集）
 *
 * 处理流程（先搁置冲突，后由用户决策，结果可预览）：
 *  1. 差异分析（diff）：对每个来源，逐单元格对比「累积目标」与「来源数据」：
 *     - 非冲突（一方为空 / 双方相同）：自动完成合并
 *     - 冲突（双方都有数据且不一致）：暂存，并在预览中**标注来源数据集**
 *     所有来源的冲突汇总为一张清单，用户可一次查看各数据集的冲突情况。
 *  2. 策略应用（strategy）：对冲突清单提供三种全局策略：
 *     - overwrite：覆盖（以来源数据为准）
 *     - merge    ：智能合并（重复数取较大者、获取数收敛、数值保留现有、备注合并）
 *     - keep     ：保留现有（以目标数据集为准）
 *     同时支持逐单元格操作：每行可单独选择「跟随全局 / 覆盖 / 智能合并 / 保留现有」。
 *  3. 结果预览（preview）：策略结果列随全局策略与逐格选择实时刷新；
 *     点击冲突行可查看该单元格的完整信息（含备注全文与图片清单）。
 *  4. 提交（commit）：用户确认后，一次性写入 localStorage 并切换数据集。
 *
 * 设计原则：
 *  - diff / apply 均为纯函数，不依赖 DOM 与存储，便于复用与测试
 *  - 存储写入只发生在 commit 一步，中途取消不会留下任何中间态
 *  - 冲突行的「当前值」列始终显示基准快照，策略应用按快照计算，
 *    保证预览结果与最终结果一致
 *  - 单元格字段语义：v=数值（普通数值或实装属性值），t=重复数，a=已获取数（0≤a≤t）
 */
(function (App) {
    'use strict';

    const C = App.constants;
    const TOTAL_COLS = C.COLS1 + C.COLS2; // 固定 70 列

    // ==================== 单元格判定（纯函数） ====================

    /** 单元格是否「有数据」（数值或实装基质） */
    function hasData(cell) {
        return !!(cell && (cell.v !== '' || cell.t > 0));
    }

    /** 单元格核心值（v/t/a）是否相同 */
    function cellEquals(a, b) {
        return a.v === b.v && a.t === b.t && a.a === b.a;
    }

    /** 备注（文本 + 图片）是否相同 */
    function noteEquals(a, b) {
        const na = (a && a.note) || { text: '', images: [] };
        const nb = (b && b.note) || { text: '', images: [] };
        return na.text === nb.text &&
            (na.images || []).join('\u0001') === (nb.images || []).join('\u0001');
    }

    /**
     * 单元格差异分类
     * @returns {string}
     *  - 'bothEmpty'  : 双方都空 → 不处理
     *  - 'same'       : 双方相同（含备注）→ 不处理
     *  - 'keepTarget' : 仅目标有数据 → 保留目标（非冲突，自动）
     *  - 'fillSource' : 仅来源有数据 → 填入来源（非冲突，自动）
     *  - 'conflict'   : 双方有数据且不一致 → 暂存，待用户决策
     */
    function classifyCell(target, source) {
        const tHas = hasData(target);
        const sHas = hasData(source);
        if (!tHas && !sHas) return 'bothEmpty';
        if (tHas && !sHas) return 'keepTarget';
        if (!tHas && sHas) return 'fillSource';
        if (cellEquals(target, source) && noteEquals(target, source)) return 'same';
        return 'conflict';
    }

    /** 深拷贝单元格 */
    function cloneCell(cell) {
        return JSON.parse(JSON.stringify(cell));
    }

    /** 按列索引定位词条组与副属性（用于冲突清单展示） */
    function locate(colIdx) {
        let offset = 0;
        for (const group of C.ALL_GROUPS) {
            if (colIdx < offset + group.sub.length) {
                return { group: group.name, sub: group.sub[colIdx - offset] };
            }
            offset += group.sub.length;
        }
        return { group: '?', sub: '?' };
    }

    // ==================== 差异分析（纯函数） ====================

    /**
     * 对比目标数据集与来源数据，生成单个来源的合并计划
     * @param {Array} targetRows - 现有（累积）数据集行
     * @param {Array} sourceRows - 来源数据行
     * @returns {Object} {
     *   filled: 自动填入格数, kept: 自动保留格数, same: 一致格数,
     *   conflicts: [{ rowIdx, colIdx, rowName, groupName, subName, target, source }],
     *   appendedRows: 追加行数
     * }
     */
    function diffDatasets(targetRows, sourceRows) {
        const diff = { filled: 0, kept: 0, same: 0, conflicts: [], appendedRows: 0 };
        const rowCount = Math.max(targetRows.length, sourceRows.length);

        for (let r = 0; r < rowCount; r++) {
            const tRow = targetRows[r];
            const sRow = sourceRows[r];

            // 目标缺行：整行作为「追加」处理（非冲突）
            if (!tRow) {
                diff.appendedRows++;
                continue;
            }
            const rowName = tRow.name || (sRow && sRow.name) || '行' + (r + 1);

            for (let c = 0; c < TOTAL_COLS; c++) {
                const t = App.utils.normalizeCell(tRow.data[c]);
                const s = App.utils.normalizeCell(sRow && sRow.data[c]);
                const cls = classifyCell(t, s);
                if (cls === 'bothEmpty') {
                    continue;
                } else if (cls === 'same') {
                    diff.same++;
                } else if (cls === 'keepTarget') {
                    diff.kept++;
                } else if (cls === 'fillSource') {
                    diff.filled++;
                } else {
                    const loc = locate(c);
                    diff.conflicts.push({
                        rowIdx: r, colIdx: c,
                        rowName, groupName: loc.group, subName: loc.sub,
                        target: cloneCell(t), source: cloneCell(s)
                    });
                }
            }
        }
        return diff;
    }

    /**
     * 构建多来源合并计划：按顺序累积应用各来源的非冲突部分，
     * 冲突部分全部暂存并标注来源数据集。
     * @param {Array} baseRows - 基准数据集行
     * @param {Array} sourceItems - [{ rows, remark, label }]
     * @returns {Object} {
     *   conflicts: [{ key, sourceIdx, sourceLabel, rowIdx, colIdx, rowName, groupName, subName, target, source }],
     *   perSource: [{ label, filled, kept, same, appendedRows, conflictCount }],
     *   resultBase: 所有非冲突已应用后的行数据
     * }
     */
    function buildMultiDiff(baseRows, sourceItems) {
        const plan = { conflicts: [], perSource: [] };
        let current = JSON.parse(JSON.stringify(baseRows));

        sourceItems.forEach((item, si) => {
            const diff = diffDatasets(current, item.rows);
            plan.perSource.push({
                label: item.label,
                filled: diff.filled,
                kept: diff.kept,
                same: diff.same,
                appendedRows: diff.appendedRows,
                conflictCount: diff.conflicts.length
            });
            diff.conflicts.forEach(conf => {
                plan.conflicts.push({
                    key: si + '_' + conf.rowIdx + '_' + conf.colIdx,
                    sourceIdx: si,
                    sourceLabel: item.label,
                    rowIdx: conf.rowIdx,
                    colIdx: conf.colIdx,
                    rowName: conf.rowName,
                    groupName: conf.groupName,
                    subName: conf.subName,
                    target: conf.target,
                    source: conf.source
                });
            });
            // 应用该来源的非冲突部分（冲突格保留目标，即 keep 语义）
            current = applyStrategy(current, item.rows, diff, 'keep');
        });

        plan.resultBase = current;
        return plan;
    }

    // ==================== 策略应用（纯函数） ====================

    /** 合并两个备注：文本拼接去重、图片合并去重 */
    function mergeNotes(n1, n2) {
        const a = (n1 && n1.note) || { text: '', images: [] };
        const b = (n2 && n2.note) || { text: '', images: [] };
        let text = a.text || b.text;
        if (a.text && b.text && a.text !== b.text) {
            text = a.text + '\n---导入备注---\n' + b.text;
        }
        const images = [];
        (a.images || []).concat(b.images || []).forEach(img => {
            if (!images.includes(img)) images.push(img);
        });
        return { text, images };
    }

    /**
     * 智能合并两个冲突单元格
     * 规则（可解释、可预览）：
     *  - 重复数 t 取较大者；获取数 a 取较大者并收敛到 t
     *  - 数值 v 保留现有（目标）；若目标无实装而来源有实装，则采用来源的实装值
     *  - 备注：文本拼接（不同时）、图片去重合并
     */
    function mergeCell(target, source) {
        const t = Math.max(target.t || 0, source.t || 0);
        let v = target.v;
        if (t > 0) {
            if ((target.t || 0) === 0 && (source.t || 0) > 0) {
                v = source.v; // 目标只有普通数值，来源为实装基质 → 采用实装值
            }
        }
        const a = t > 0 ? Math.min(Math.max(target.a || 0, source.a || 0), t) : 0;
        return { v, t, a, note: mergeNotes(target, source) };
    }

    /** 冲突单元格在指定策略下的结果（target/source 均为快照，结果确定可复现） */
    function conflictResult(conflict, strategy) {
        if (strategy === 'overwrite') return conflict.source;
        if (strategy === 'keep') return conflict.target;
        return mergeCell(conflict.target, conflict.source);
    }

    /**
     * 依据合并计划与策略生成完整结果 rows（纯函数，不写存储）
     * @param {Array} targetRows
     * @param {Array} sourceRows
     * @param {Object} diff - diffDatasets 的结果
     * @param {string} strategy - 'overwrite' | 'merge' | 'keep'
     * @returns {Array} 结果行数据
     */
    function applyStrategy(targetRows, sourceRows, diff, strategy) {
        const result = JSON.parse(JSON.stringify(targetRows));
        const rowCount = Math.max(targetRows.length, sourceRows.length);

        for (let r = 0; r < rowCount; r++) {
            // 目标缺行：整行追加来源行
            if (r >= result.length) {
                result.push(JSON.parse(JSON.stringify(sourceRows[r])));
                continue;
            }
            for (let c = 0; c < TOTAL_COLS; c++) {
                const t = App.utils.normalizeCell(result[r].data[c]);
                const s = App.utils.normalizeCell(sourceRows[r] && sourceRows[r].data[c]);
                const cls = classifyCell(t, s);
                if (cls === 'fillSource') {
                    result[r].data[c] = cloneCell(s);
                } else if (cls === 'conflict') {
                    const target = App.utils.normalizeCell(targetRows[r].data[c]);
                    const source = App.utils.normalizeCell(sourceRows[r].data[c]);
                    result[r].data[c] = conflictResult(
                        { target, source },
                        strategy
                    );
                }
                // bothEmpty / same / keepTarget 保留目标原值
            }
        }
        return result;
    }

    /**
     * 多来源最终应用：以 resultBase（非冲突已合并）为起点，
     * 对每个冲突格按「该冲突行快照」应用策略，保证与预览一致。
     * @param {Object} plan - buildMultiDiff 的结果
     * @param {Array} sourceItems - [{ rows, ... }]
     * @param {string} strategy - 全局策略
     * @param {Object} overrides - 逐格覆盖 { key: strategy }
     * @returns {Array} 最终行数据
     */
    function applyMultiStrategy(plan, sourceItems, strategy, overrides) {
        const result = JSON.parse(JSON.stringify(plan.resultBase));
        plan.conflicts.forEach(conf => {
            const eff = (overrides && overrides[conf.key]) || strategy;
            if (eff === 'keep') return; // 保留 resultBase 中的目标快照值
            const source = App.utils.normalizeCell(
                sourceItems[conf.sourceIdx].rows[conf.rowIdx] &&
                sourceItems[conf.sourceIdx].rows[conf.rowIdx].data[conf.colIdx]
            );
            result[conf.rowIdx].data[conf.colIdx] = conflictResult(conf, eff);
        });
        return result;
    }

    // ==================== 展示辅助 ====================

    /** 单元格格式化（紧凑，用于清单展示） */
    function formatCell(cell) {
        const parts = [];
        if (cell.v !== '') parts.push('数值:' + cell.v);
        if (cell.t > 0) parts.push('重复:' + cell.t + ' 拥有:' + cell.a);
        const note = (cell && cell.note) || {};
        if (note.text) parts.push('📝');
        if (note.images && note.images.length) parts.push('🖼×' + note.images.length);
        return parts.join(' ') || '—';
    }

    /** 单元格完整信息（用于详情区展示，含备注全文与图片清单） */
    function formatCellDetail(cell) {
        const lines = [];
        if (cell.v !== '') lines.push('数值：' + cell.v);
        if (cell.t > 0) lines.push('重复数：' + cell.t + '，已获取：' + cell.a);
        const note = (cell && cell.note) || {};
        if (note.text) lines.push('备注：' + note.text);
        if (note.images && note.images.length) {
            const names = note.images.map(img => (img.startsWith('data:') ? '[内嵌图片]' : img));
            lines.push('图片（' + note.images.length + '）：' + names.join('、'));
        }
        return lines.join('\n') || '（空）';
    }

    /** 备注合并（数据集级） */
    function mergeRemarks(a, b) {
        if (!a) return b;
        if (!b) return a;
        if (a === b) return a;
        return a + '\n---导入备注---\n' + b;
    }

    /** 标准化数据集行（兼容存储中可能存在的旧格式） */
    function normalizeRows(rows) {
        return rows.map(row => ({
            name: row.name,
            data: row.data.map(App.utils.normalizeCell)
        }));
    }

    // ==================== 模块主体 ====================

    App.datasetMerge = {

        // ==================== 纯函数导出（便于复用与测试） ====================
        classifyCell,
        diffDatasets,
        buildMultiDiff,
        applyStrategy,
        applyMultiStrategy,
        mergeCell,
        formatCell,
        formatCellDetail,

        // ==================== 入口 A：导入重名合并 ====================

        /**
         * 从导入流程进入合并
         * @param {Array} rows - 导入数据行
         * @param {string} newKey - 已存在的目标数据集名称
         * @param {string} remark - 导入文件的备注（可能为空）
         */
        startMergeFromImport(rows, newKey, remark) {
            const targetRows = App.storage.getJSON(newKey, null);
            if (!Array.isArray(targetRows) || targetRows.length === 0) {
                // 目标数据集异常，退化为直接导入
                if (App.importExport && App.importExport.proceedImport) {
                    App.importExport.proceedImport(rows, newKey, remark);
                }
                return;
            }
            const targetRemark = (App.storage.getDatasetRemarks() || {})[newKey] || '';
            this.startMergeSequence(
                normalizeRows(targetRows),
                newKey,
                targetRemark,
                [{ rows: normalizeRows(rows), remark: remark || '', label: '导入文件' }]
            );
        },

        // ==================== 入口 B：手动选择数据集合并 ====================

        /** 打开数据集选择弹窗（勾选 2+ 个数据集，第一个为基准） */
        openMergePicker() {
            const list = App.storage.getDatasetList();
            App.dom.mergePickList.innerHTML = list.map(k => {
                const isProtected = App.constants.PROTECTED_DATASETS.includes(k);
                const safeName = this.escapeHtml(k);
                return `<label style="display:flex; align-items:center; gap:6px; padding:3px 0; cursor:pointer;">` +
                    `<input type="checkbox" value="${safeName}"> <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}${isProtected ? ' 🔒' : ''}</span>` +
                    `</label>`;
            }).join('') || '<p style="font-size:0.8rem; color:var(--text-tertiary);">暂无数据集</p>';
            App.dom.mergeNewName.value = '';
            App.modal.openModal(App.dom.modalMergePicker);
        },

        /** 确认数据集选择，启动合并 */
        confirmMergePicker() {
            const checked = Array.from(
                App.dom.mergePickList.querySelectorAll('input[type=checkbox]:checked')
            ).map(i => i.value);
            if (checked.length < 2) {
                App.modal.showAlert('请至少勾选 2 个数据集。');
                return;
            }

            // 结果保存方式
            const modeEl = App.dom.modalMergePicker.querySelector('input[name=mergeResultMode]:checked');
            const mode = modeEl ? modeEl.value : 'new';
            let finalKey;
            if (mode === 'new') {
                finalKey = App.dom.mergeNewName.value.trim();
                if (!finalKey) { App.modal.showAlert('请输入合并结果的数据集名称。'); return; }
                if (App.storage.getDatasetList().includes(finalKey)) {
                    App.modal.showAlert('该名称已存在，请使用其他名称。');
                    return;
                }
            } else {
                finalKey = checked[0];
                // 受保护数据集不可作为合并目标（防止绕过"只增不减"保护）
                if (App.constants.PROTECTED_DATASETS.includes(finalKey)) {
                    App.modal.showAlert('系统数据集不可作为合并目标，请选择「合并为新建数据集」。', '操作阻止');
                    return;
                }
            }

            // 基准 = 第一个勾选的数据集
            const baseKey = checked[0];
            const baseRows = App.storage.getJSON(baseKey, null);
            if (!Array.isArray(baseRows) || baseRows.length === 0) {
                App.modal.showAlert('基准数据集数据无效。');
                return;
            }
            const baseRemark = (App.storage.getDatasetRemarks() || {})[baseKey] || '';

            // 其余勾选的数据集为来源（并入基准）
            const sourceItems = checked.slice(1).map(k => ({
                rows: normalizeRows(App.storage.getJSON(k, []) || []),
                remark: (App.storage.getDatasetRemarks() || {})[k] || '',
                label: k
            }));

            App.modal.closeModal(App.dom.modalMergePicker);
            this.startMergeSequence(normalizeRows(baseRows), finalKey, baseRemark, sourceItems);
        },

        // ==================== 合并引擎 ====================

        /**
         * 启动合并：构建多来源差异计划，无冲突则直接应用，有冲突则打开预览
         * @param {Array} baseRows - 基准数据
         * @param {string} finalKey - 最终保存的数据集名称
         * @param {string} finalRemark - 基准备注
         * @param {Array} sourceItems - [{ rows, remark, label }]
         */
        startMergeSequence(baseRows, finalKey, finalRemark, sourceItems) {
            const plan = buildMultiDiff(baseRows, sourceItems);
            let finalRemarkMerged = finalRemark || '';
            sourceItems.forEach(item => {
                finalRemarkMerged = mergeRemarks(finalRemarkMerged, item.remark);
            });

            this._session = {
                baseRows,
                sourceItems,
                finalKey,
                finalRemark: finalRemarkMerged,
                plan,
                strategy: 'merge',
                overrides: {}   // 逐格策略覆盖：{ key: strategy }
            };

            if (plan.conflicts.length === 0) {
                // 全部无冲突：直接应用非冲突合并结果
                this.commit(plan.resultBase, finalKey, finalRemarkMerged);
                this._session = null;
                App.modal.showTemporaryHint(
                    `合并完成：${sourceItems.length} 个数据集已并入「${finalKey}」，无冲突`,
                    'success'
                );
                return;
            }

            this.renderSummary();
            this.renderStrategyRow();
            this.renderConflictList();
            App.modal.openModal(App.dom.modalMergePreview);
        },

        /** 确认合并：应用当前策略与逐格覆盖，一次性提交 */
        confirmMerge() {
            const s = this._session;
            if (!s) return;
            const result = applyMultiStrategy(s.plan, s.sourceItems, s.strategy, s.overrides);
            this.commit(result, s.finalKey, s.finalRemark);
            this._session = null;
            App.modal.closeModal(App.dom.modalMergePreview);
            App.modal.showTemporaryHint('合并已应用', 'success');
        },

        /** 取消合并：放弃整个合并（未提交任何更改） */
        cancelMerge() {
            const hadSession = !!this._session;
            this._session = null;
            App.modal.closeModal(App.dom.modalMergePreview);
            if (hadSession) {
                App.modal.showTemporaryHint('已取消合并，未保存任何更改', 'info');
            }
        },

        // ==================== 预览渲染 ====================

        /** 渲染差异摘要（各来源的自动处理统计与冲突数） */
        renderSummary() {
            const s = this._session;
            const p = s.plan;
            const sourceLines = p.perSource.map(ps =>
                `<div style="margin-left:10px;">· <b>${this.escapeHtml(ps.label)}</b>：新增 <b>${ps.filled}</b> 格 · 保留 <b>${ps.kept}</b> 格 · 一致 <b>${ps.same}</b> 格` +
                (ps.appendedRows ? ` · 追加 <b>${ps.appendedRows}</b> 行` : '') +
                (ps.conflictCount ? ` · <b style="color:var(--status-full-bg);">冲突 ${ps.conflictCount}</b>` : '') +
                `</div>`
            ).join('');

            App.dom.mergeSummary.innerHTML =
                `<div>目标数据集：<b>${this.escapeHtml(s.finalKey)}</b>（${s.baseRows.length} 行） ← 来源数据集 ${s.sourceItems.length} 个</div>` +
                sourceLines +
                (p.conflicts.length
                    ? `<div style="margin-top:6px; color:var(--status-full-bg);">共 <b>${p.conflicts.length}</b> 个冲突单元格：可逐格选择处理方式，或通过全局策略批量应用。</div>`
                    : '');
        },

        /** 渲染全局策略单选（切换时保留逐格手动设置） */
        renderStrategyRow() {
            const s = this._session;
            const checked = (v) => (s.strategy === v ? ' checked' : '');
            App.dom.mergeStrategyRow.innerHTML =
                `<label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;">` +
                `<input type="radio" name="mergeStrategy" value="merge"${checked('merge')}> 智能合并（推荐）</label>` +
                `<label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;">` +
                `<input type="radio" name="mergeStrategy" value="overwrite"${checked('overwrite')}> 覆盖（以来源为准）</label>` +
                `<label style="display:inline-flex; align-items:center; gap:4px; cursor:pointer;">` +
                `<input type="radio" name="mergeStrategy" value="keep"${checked('keep')}> 保留现有</label>`;
        },

        /** 该冲突单元格当前生效的策略（逐格覆盖优先于全局） */
        effectiveStrategy(conf) {
            const s = this._session;
            return s.overrides[conf.key] || s.strategy;
        },

        /** 策略显示名 */
        strategyLabel(v) {
            return v === 'overwrite' ? '覆盖' : v === 'keep' ? '保留现有' : '智能合并';
        },

        /**
         * 渲染冲突清单（固定布局表格 + 来源标注 + 逐格处理下拉）
         * 点击行可查看该单元格完整信息（含备注全文与图片清单）
         */
        renderConflictList() {
            const s = this._session;
            if (!s) return;
            const multi = s.sourceItems.length > 1;

            const rowsHtml = s.plan.conflicts.map((conf) => {
                const eff = this.effectiveStrategy(conf);
                const res = conflictResult(conf, eff);
                const pos = this.escapeHtml(`${conf.rowName} › ${conf.groupName} › ${conf.subName}`);
                const cur = this.escapeHtml(formatCell(conf.target));
                const src = this.escapeHtml(formatCell(conf.source));
                const resTxt = this.escapeHtml(formatCell(res));
                const srcName = this.escapeHtml(conf.sourceLabel);
                const selOpts = [['follow', '跟随全局'], ['overwrite', '覆盖'], ['merge', '智能合并'], ['keep', '保留现有']]
                    .map(([v, label]) => {
                        const selected = (s.overrides[conf.key] || 'follow') === v ? ' selected' : '';
                        return `<option value="${v}"${selected}>${label}</option>`;
                    }).join('');
                return `<tr data-cell-key="${conf.key}" title="点击查看完整信息">` +
                    (multi ? `<td class="col-srcname" title="${srcName}">${srcName}</td>` : '') +
                    `<td class="col-pos" title="${pos}">${pos}</td>` +
                    `<td class="col-cur" title="${cur}">${cur}</td>` +
                    `<td class="col-src" title="${src}">${src}</td>` +
                    `<td class="col-act"><select data-cell="${conf.key}">${selOpts}</select></td>` +
                    `<td class="col-res" title="${resTxt}">${resTxt}</td>` +
                    `</tr>`;
            }).join('');

            const headSrcName = multi ? this.escapeHtml(s.sourceItems[0].label) : '';
            App.dom.mergeConflictList.innerHTML =
                `<table class="merge-table">` +
                `<thead><tr>` +
                (multi ? `<th class="col-srcname">来源数据集</th>` : '') +
                `<th class="col-pos">位置</th>` +
                `<th class="col-cur">当前值（${this.escapeHtml(s.finalKey)}）</th>` +
                `<th class="col-src">导入值（${multi ? '来源' : headSrcName}）</th>` +
                `<th class="col-act">本格处理</th>` +
                `<th class="col-res">策略结果（${this.strategyLabel(s.strategy)}）</th>` +
                `</tr></thead><tbody>${rowsHtml}</tbody></table>`;

            // 清空详情区
            App.dom.mergeCellDetail.style.display = 'none';
            App.dom.mergeCellDetail.innerHTML = '';
        },

        /** 在详情区展示指定冲突单元格的完整信息 */
        showCellDetail(conf) {
            const d = App.dom.mergeCellDetail;
            const pos = this.escapeHtml(`${conf.rowName} › ${conf.groupName} › ${conf.subName}`);
            const targetTitle = this.escapeHtml(this._session.finalKey);
            const sourceTitle = this.escapeHtml(conf.sourceLabel);
            d.innerHTML =
                `<div style="font-weight:600; margin-bottom:4px;">${pos}</div>` +
                `<div style="white-space:pre-wrap; word-break:break-all; font-size:0.76rem; line-height:1.5;">` +
                `<span style="color:var(--text-secondary);">【${targetTitle}】</span>\n${this.escapeHtml(formatCellDetail(conf.target))}\n\n` +
                `<span style="color:var(--text-secondary);">【${sourceTitle}】</span>\n${this.escapeHtml(formatCellDetail(conf.source))}` +
                `</div>`;
            d.style.display = 'block';
        },

        /** HTML 转义（详情文本安全展示） */
        escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        // ==================== 提交 ====================

        /**
         * 提交合并结果（唯一写存储的入口）
         * @param {Array} resultRows - 最终行数据
         * @param {string} targetKey - 数据集名称
         * @param {string} remark - 合并后的数据集备注
         */
        commit(resultRows, targetKey, remark) {
            App.state.rows = resultRows;
            App.storage.setJSON(targetKey, resultRows);
            App.storage.addDatasetKey(targetKey);
            App.storage.saveCurrentDatasetKey(targetKey);

            const remarks = App.storage.getDatasetRemarks();
            if (remark) remarks[targetKey] = remark;
            App.storage.saveDatasetRemarks(remarks);

            App.datasetManager.updateDatasetDisplay();
            App.datasetManager.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.dom.inputHint.textContent = `已合并并切换到数据集: ${targetKey}`;
            if (typeof App.datasetRemark.updateDatasetRemark === 'function') App.datasetRemark.updateDatasetRemark();
            App.datasetManager.updateLockedUI();
            // 清空历史记录，防止撤回写坏合并结果
            App.datasetManager.resetHistorySafe();
        },

        // ==================== 事件绑定 ====================

        /**
         * 绑定合并相关事件
         * 由 events.js 统一调用
         */
        bindDatasetMergeEvents() {
            const dom = App.dom;

            // 工具栏「合并」按钮 → 数据集选择弹窗
            if (dom.btnMergeDatasets) {
                dom.btnMergeDatasets.addEventListener('click', () => this.openMergePicker());
            }
            // 数据集选择弹窗
            if (dom.btnConfirmMergePick) {
                dom.btnConfirmMergePick.addEventListener('click', () => this.confirmMergePicker());
            }
            if (dom.btnCancelMergePick) {
                dom.btnCancelMergePick.addEventListener('click', () => App.modal.closeModal(dom.modalMergePicker));
            }
            if (dom.btnCloseMergePick) {
                dom.btnCloseMergePick.addEventListener('click', () => App.modal.closeModal(dom.modalMergePicker));
            }
            if (dom.modalMergePicker) {
                dom.modalMergePicker.addEventListener('click', function (e) {
                    if (e.target === dom.modalMergePicker) App.modal.closeModal(dom.modalMergePicker);
                });
            }

            // 预览弹窗
            if (dom.btnConfirmMerge) {
                dom.btnConfirmMerge.addEventListener('click', () => this.confirmMerge());
            }
            if (dom.btnCancelMerge) {
                dom.btnCancelMerge.addEventListener('click', () => this.cancelMerge());
            }
            if (dom.btnCloseMergePreview) {
                dom.btnCloseMergePreview.addEventListener('click', () => this.cancelMerge());
            }
            // 全局策略切换 → 实时刷新（保留逐格手动设置）
            if (dom.mergeStrategyRow) {
                dom.mergeStrategyRow.addEventListener('change', (e) => {
                    if (e.target && e.target.name === 'mergeStrategy' && this._session) {
                        this._session.strategy = e.target.value;
                        this.renderConflictList();
                    }
                });
            }
            // 逐格处理下拉 → 覆盖全局策略，实时刷新该行结果
            if (dom.mergeConflictList) {
                dom.mergeConflictList.addEventListener('change', (e) => {
                    const sel = e.target;
                    if (sel && sel.dataset && sel.dataset.cell && this._session) {
                        const cellKey = sel.dataset.cell;
                        if (sel.value === 'follow') {
                            delete this._session.overrides[cellKey];
                        } else {
                            this._session.overrides[cellKey] = sel.value;
                        }
                        this.renderConflictList();
                    }
                });
                // 点击冲突行 → 查看该单元格完整信息（备注全文与图片清单）
                dom.mergeConflictList.addEventListener('click', (e) => {
                    if (!this._session) return;
                    if (e.target.tagName === 'SELECT') return; // 避免与下拉交互冲突
                    const tr = e.target.closest('tr[data-cell-key]');
                    if (!tr) return;
                    const conf = this._session.plan.conflicts.find(
                        c => c.key === tr.dataset.cellKey
                    );
                    if (conf) this.showCellDetail(conf);
                });
            }
            // 点击遮罩关闭
            if (dom.modalMergePreview) {
                dom.modalMergePreview.addEventListener('click', (e) => {
                    if (e.target === dom.modalMergePreview) this.cancelMerge();
                });
            }
        }
    };

})(window.App = window.App || {});
