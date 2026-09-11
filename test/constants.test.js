'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const App = require('./_setup.js');
const C = App.constants;

test('ALL_GROUPS 有 14 组', () => {
    assert.strictEqual(C.ALL_GROUPS.length, 14);
});

test('每组副属性固定 5 个', () => {
    C.ALL_GROUPS.forEach(g => {
        assert.strictEqual(g.sub.length, 5);
    });
});

test('ROW_NAMES 有 12 项', () => {
    assert.strictEqual(C.ROW_NAMES.length, 12);
});

test('SUB_ATTRS 与组内 sub 一致', () => {
    assert.deepStrictEqual(C.SUB_ATTRS, ['敏捷', '力量', '意志', '智识', '主能力']);
    C.ALL_GROUPS.forEach(g => {
        assert.deepStrictEqual(g.sub, C.SUB_ATTRS);
    });
});

test('COLS1 / COLS2 各 35，合计 70', () => {
    assert.strictEqual(C.COLS1, 35);
    assert.strictEqual(C.COLS2, 35);
    assert.strictEqual(C.COLS1 + C.COLS2, 70);
});

test('GROUP1 前 7 组，GROUP2 后 7 组', () => {
    assert.strictEqual(C.GROUP1.length, 7);
    assert.strictEqual(C.GROUP2.length, 7);
    assert.strictEqual(C.GROUP1[0].name, '强攻');
    assert.strictEqual(C.GROUP1[6].name, '残暴');
    assert.strictEqual(C.GROUP2[0].name, '附术');
    assert.strictEqual(C.GROUP2[6].name, '效益');
});

test('DEFAULT_REGIONS 有 12 个且各含 8 副属性 + 8 词条', () => {
    assert.strictEqual(C.DEFAULT_REGIONS.length, 12);
    C.DEFAULT_REGIONS.forEach(r => {
        assert.strictEqual(r.rows.length, 8);
        assert.strictEqual(r.groups.length, 8);
        assert.ok(typeof r.name === 'string' && r.name.length > 0);
    });
});