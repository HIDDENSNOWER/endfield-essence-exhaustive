'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const App = require('./_setup.js');
require('../js/features/data/dataset-merge.js');
const merge = App.datasetMerge;

// 辅助：构造单元格
function emptyCell() {
    return { v: '', t: 0, a: 0, note: { text: '', images: [] } };
}
function cell(v, t = 0, a = 0, note = null) {
    return { v, t, a, note: note || { text: '', images: [] } };
}

// ==================== classifyCell ====================

test('classifyCell：bothEmpty', () => {
    assert.strictEqual(merge.classifyCell(emptyCell(), emptyCell()), 'bothEmpty');
});

test('classifyCell：same（v/t/a 一致）', () => {
    assert.strictEqual(merge.classifyCell(cell('123'), cell('123')), 'same');
});

test('classifyCell：keepTarget（仅目标有数据）', () => {
    assert.strictEqual(merge.classifyCell(cell('123'), emptyCell()), 'keepTarget');
});

test('classifyCell：fillSource（仅来源有数据）', () => {
    assert.strictEqual(merge.classifyCell(emptyCell(), cell('123')), 'fillSource');
});

test('classifyCell：conflict（v 不同）', () => {
    assert.strictEqual(merge.classifyCell(cell('111'), cell('222')), 'conflict');
});

test('classifyCell：conflict（t 不同）', () => {
    assert.strictEqual(merge.classifyCell(cell('', 3, 0), cell('', 2, 0)), 'conflict');
});

test('classifyCell：conflict（备注不同）', () => {
    const a = cell('123', 0, 0, { text: 'A', images: [] });
    const b = cell('123', 0, 0, { text: 'B', images: [] });
    assert.strictEqual(merge.classifyCell(a, b), 'conflict');
});

test('classifyCell：实装 t>0 视为有数据', () => {
    assert.strictEqual(merge.classifyCell(cell('', 1, 0), emptyCell()), 'keepTarget');
});

// ==================== mergeCell ====================

test('mergeCell：t 取较大', () => {
    const r = merge.mergeCell(cell('', 3, 0), cell('', 2, 0));
    assert.strictEqual(r.t, 3);
});

test('mergeCell：a 收敛到 t', () => {
    const r = merge.mergeCell(cell('', 3, 1), cell('', 2, 2));
    assert.strictEqual(r.t, 3);
    assert.strictEqual(r.a, 2);
});

test('mergeCell：目标无实装，来源有实装 → 采用来源 v', () => {
    const r = merge.mergeCell(cell('111', 0, 0), cell('222', 2, 0));
    assert.strictEqual(r.v, '222');
    assert.strictEqual(r.t, 2);
});

test('mergeCell：双方都有实装 → 保留目标 v', () => {
    const r = merge.mergeCell(cell('111', 1, 0), cell('222', 2, 0));
    assert.strictEqual(r.v, '111');
});

test('mergeCell：备注文本拼接（不同时）', () => {
    const a = cell('123', 0, 0, { text: 'A', images: [] });
    const b = cell('123', 0, 0, { text: 'B', images: [] });
    const r = merge.mergeCell(a, b);
    assert.ok(r.note.text.includes('A'));
    assert.ok(r.note.text.includes('B'));
    assert.ok(r.note.text.includes('---导入备注---'));
});

test('mergeCell：备注图片去重', () => {
    const a = cell('123', 0, 0, { text: '', images: ['x', 'y'] });
    const b = cell('123', 0, 0, { text: '', images: ['y', 'z'] });
    const r = merge.mergeCell(a, b);
    assert.deepStrictEqual(r.note.images.slice().sort(), ['x', 'y', 'z']);
});

// ==================== applyStrategy ====================

test('applyStrategy：keep 保留目标', () => {
    const target = [{ name: '攻击提升', data: [cell('111')] }];
    const source = [{ name: '攻击提升', data: [cell('222')] }];
    const diff = merge.diffDatasets(target, source);
    const r = merge.applyStrategy(target, source, diff, 'keep');
    assert.strictEqual(r[0].data[0].v, '111');
});

test('applyStrategy：overwrite 采用来源', () => {
    const target = [{ name: '攻击提升', data: [cell('111')] }];
    const source = [{ name: '攻击提升', data: [cell('222')] }];
    const diff = merge.diffDatasets(target, source);
    const r = merge.applyStrategy(target, source, diff, 'overwrite');
    assert.strictEqual(r[0].data[0].v, '222');
});

test('applyStrategy：merge 智能合并', () => {
    const target = [{ name: '攻击提升', data: [cell('', 3, 1)] }];
    const source = [{ name: '攻击提升', data: [cell('', 2, 2)] }];
    const diff = merge.diffDatasets(target, source);
    const r = merge.applyStrategy(target, source, diff, 'merge');
    assert.strictEqual(r[0].data[0].t, 3);
    assert.strictEqual(r[0].data[0].a, 2);
});

test('applyStrategy：fillSource 自动应用（非冲突）', () => {
    const target = [{ name: '攻击提升', data: [emptyCell()] }];
    const source = [{ name: '攻击提升', data: [cell('222')] }];
    const diff = merge.diffDatasets(target, source);
    const r = merge.applyStrategy(target, source, diff, 'keep');
    assert.strictEqual(r[0].data[0].v, '222');
});

// ==================== diffDatasets ====================

test('diffDatasets：统计各分类计数', () => {
    const target = [{ name: '攻击提升', data: [cell('111'), emptyCell(), cell('333')] }];
    const source = [{ name: '攻击提升', data: [cell('222'), cell('222'), cell('333')] }];
    const diff = merge.diffDatasets(target, source);
    assert.strictEqual(diff.conflicts.length, 1);
    assert.strictEqual(diff.filled, 1);
    assert.strictEqual(diff.same, 1);
});

test('diffDatasets：目标缺行 → appendedRows 增加', () => {
    const target = [{ name: '攻击提升', data: [emptyCell()] }];
    const source = [
        { name: '攻击提升', data: [emptyCell()] },
        { name: '生命提升', data: [emptyCell()] }
    ];
    const diff = merge.diffDatasets(target, source);
    assert.strictEqual(diff.appendedRows, 1);
});

// ==================== buildMultiDiff ====================

test('buildMultiDiff：无冲突时 resultBase 已合并', () => {
    const base = [{ name: '攻击提升', data: [emptyCell()] }];
    const sources = [
        { rows: [{ name: '攻击提升', data: [cell('111')] }], remark: '', label: 'A' }
    ];
    const plan = merge.buildMultiDiff(base, sources);
    assert.strictEqual(plan.conflicts.length, 0);
    assert.strictEqual(plan.resultBase[0].data[0].v, '111');
});

test('buildMultiDiff：多来源冲突汇总', () => {
    const base = [{ name: '攻击提升', data: [cell('111')] }];
    const sources = [
        { rows: [{ name: '攻击提升', data: [cell('222')] }], remark: '', label: 'A' },
        { rows: [{ name: '攻击提升', data: [cell('333')] }], remark: '', label: 'B' }
    ];
    const plan = merge.buildMultiDiff(base, sources);
    assert.strictEqual(plan.conflicts.length, 2);
    assert.strictEqual(plan.conflicts[0].sourceLabel, 'A');
    assert.strictEqual(plan.conflicts[1].sourceLabel, 'B');
});

// ==================== applyMultiStrategy ====================

test('applyMultiStrategy：全局策略 overwrite', () => {
    const base = [{ name: '攻击提升', data: [cell('111')] }];
    const sources = [
        { rows: [{ name: '攻击提升', data: [cell('222')] }], remark: '', label: 'A' }
    ];
    const plan = merge.buildMultiDiff(base, sources);
    const r = merge.applyMultiStrategy(plan, sources, 'overwrite', {});
    assert.strictEqual(r[0].data[0].v, '222');
});

test('applyMultiStrategy：overrides 覆盖全局', () => {
    const base = [{ name: '攻击提升', data: [cell('111')] }];
    const sources = [
        { rows: [{ name: '攻击提升', data: [cell('222')] }], remark: '', label: 'A' }
    ];
    const plan = merge.buildMultiDiff(base, sources);
    const key = plan.conflicts[0].key;
    const overrides = {};
    overrides[key] = 'keep';
    const r = merge.applyMultiStrategy(plan, sources, 'overwrite', overrides);
    assert.strictEqual(r[0].data[0].v, '111');
});

// ==================== formatCell / formatCellDetail ====================

test('formatCell：空单元格 → —', () => {
    assert.strictEqual(merge.formatCell(emptyCell()), '—');
});

test('formatCell：有数值 + 有实装 + 有备注', () => {
    const c = cell('123', 2, 1, { text: 'note', images: ['x'] });
    const s = merge.formatCell(c);
    assert.ok(s.includes('数值:123'));
    assert.ok(s.includes('重复:2'));
    assert.ok(s.includes('📝'));
    assert.ok(s.includes('🖼×1'));
});

test('formatCellDetail：多行详情', () => {
    const c = cell('123', 2, 1, { text: '备注内容', images: ['a.png', 'b.png'] });
    const s = merge.formatCellDetail(c);
    assert.ok(s.includes('数值：123'));
    assert.ok(s.includes('重复数：2'));
    assert.ok(s.includes('备注：备注内容'));
    assert.ok(s.includes('图片（2）'));
});