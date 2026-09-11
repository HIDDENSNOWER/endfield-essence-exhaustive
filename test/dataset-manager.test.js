'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const App = require('./_setup.js');

// 桩化依赖（dataset-manager.js 加载时无副作用，但调用 isCellOperationAllowed 会用到）
App.storage = {
    loadCurrentDatasetKey: () => '默认数据集'
};
App.state = {
    baselineRows: null
};

require('../js/features/data/dataset-manager.js');
const dm = App.datasetManager;

// 辅助
function cell(v, t = 0, a = 0) {
    return { v, t, a, note: { text: '', images: [] } };
}
function setCurrent(key) { App.storage.loadCurrentDatasetKey = () => key; }
function setBaseline(rows) { App.state.baselineRows = rows; }

// ==================== isCellOperationAllowed ====================

test('非默认数据集 → 全允许', () => {
    setCurrent('其他数据集');
    setBaseline([{ name: '攻击提升', data: [cell('123')] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('')), true);
});

test('无 baselineRows → 允许', () => {
    setCurrent('默认数据集');
    setBaseline(null);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('')), true);
});

test('基准有 v，新 v 相同 → 允许', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('123')] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('123')), true);
});

test('基准有 v，新 v 不同 → 拒绝', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('123')] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('456')), false);
});

test('基准有 v，新 v 为空 → 拒绝', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('123')] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('')), false);
});

test('基准 t=3，新 t=2 → 拒绝', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('', 3, 0)] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('', 2, 0)), false);
});

test('基准 t=3，新 t=4 → 允许', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('', 3, 0)] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('', 4, 0)), true);
});

test('基准 a=2，新 a=1 → 拒绝', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('', 5, 2)] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('', 5, 1)), false);
});

test('基准 a=2，新 a=3 → 允许', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('', 5, 2)] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('', 5, 3)), true);
});

test('基准单元格为空 → 允许新增', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('')] }]);
    assert.strictEqual(dm.isCellOperationAllowed(0, 0, cell('123')), true);
});

test('行列越界 → 允许（异常安全）', () => {
    setCurrent('默认数据集');
    setBaseline([{ name: '攻击提升', data: [cell('123')] }]);
    assert.strictEqual(dm.isCellOperationAllowed(99, 0, cell('')), true);
    assert.strictEqual(dm.isCellOperationAllowed(0, 99, cell('')), true);
});