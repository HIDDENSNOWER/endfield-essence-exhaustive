'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const App = require('./_setup.js');
const utils = App.utils;

// ==================== normalizeCell ====================

test('normalizeCell：对象输入补齐 note', () => {
    const r = utils.normalizeCell({ v: '123', t: 2, a: 1 });
    assert.strictEqual(r.v, '123');
    assert.strictEqual(r.t, 2);
    assert.strictEqual(r.a, 1);
    assert.deepStrictEqual(r.note, { text: '', images: [] });
});

test('normalizeCell：字符串包装', () => {
    const r = utils.normalizeCell('456');
    assert.strictEqual(r.v, '456');
    assert.strictEqual(r.t, 0);
    assert.strictEqual(r.a, 0);
});

test('normalizeCell：数字包装', () => {
    const r = utils.normalizeCell(789);
    assert.strictEqual(r.v, '789');
    assert.strictEqual(r.t, 0);
});

test('normalizeCell：a > t 被钳制到 t', () => {
    const r = utils.normalizeCell({ v: '', t: 2, a: 5 });
    assert.strictEqual(r.t, 2);
    assert.strictEqual(r.a, 2);
});

test('normalizeCell：t < 0 钳制为 0', () => {
    const r = utils.normalizeCell({ v: '', t: -3, a: 5 });
    assert.strictEqual(r.t, 0);
    assert.strictEqual(r.a, 0);
});

test('normalizeCell：null / undefined → 空对象', () => {
    const expected = { v: '', t: 0, a: 0, note: { text: '', images: [] } };
    assert.deepStrictEqual(utils.normalizeCell(null), expected);
    assert.deepStrictEqual(utils.normalizeCell(undefined), expected);
});

test('normalizeCell：note 为数组 → 重置为空 note', () => {
    const r = utils.normalizeCell({ v: '', t: 0, a: 0, note: [1, 2] });
    assert.deepStrictEqual(r.note, { text: '', images: [] });
});

test('normalizeCell：images 过滤非字符串', () => {
    const r = utils.normalizeCell({
        v: '', t: 0, a: 0,
        note: { text: 'x', images: ['a', 123, null, 'b', {}] }
    });
    assert.deepStrictEqual(r.note.images, ['a', 'b']);
});

test('normalizeCell：不原地改写调用方数据', () => {
    const original = { v: '1', t: 2, a: 5 };
    const r = utils.normalizeCell(original);
    assert.strictEqual(original.a, 5);
    assert.strictEqual(r.a, 2);
});

// ==================== parseTriple ====================

test('parseTriple：三位数字 → 数组', () => {
    assert.deepStrictEqual(utils.parseTriple('123'), [1, 2, 3]);
    assert.deepStrictEqual(utils.parseTriple('000'), [0, 0, 0]);
});

test('parseTriple：非三位 → null', () => {
    assert.strictEqual(utils.parseTriple('12'), null);
    assert.strictEqual(utils.parseTriple('1234'), null);
    assert.strictEqual(utils.parseTriple(''), null);
});

test('parseTriple：含非数字 → null', () => {
    assert.strictEqual(utils.parseTriple('1a3'), null);
    assert.strictEqual(utils.parseTriple('abc'), null);
});

test('parseTriple：首尾空格被去除', () => {
    assert.deepStrictEqual(utils.parseTriple(' 123 '), [1, 2, 3]);
});

// ==================== calcSum ====================

test('calcSum：求和', () => {
    assert.strictEqual(utils.calcSum([1, 2, 3]), 6);
    assert.strictEqual(utils.calcSum([0, 0, 0]), 0);
    assert.strictEqual(utils.calcSum([]), 0);
});

// ==================== getColumnIndex ====================

test('getColumnIndex：合法索引', () => {
    assert.strictEqual(utils.getColumnIndex(0, 0), 0);
    assert.strictEqual(utils.getColumnIndex(0, 4), 4);
    assert.strictEqual(utils.getColumnIndex(1, 0), 5);
    assert.strictEqual(utils.getColumnIndex(13, 4), 69);
});

test('getColumnIndex：越界返回 -1', () => {
    assert.strictEqual(utils.getColumnIndex(-1, 0), -1);
    assert.strictEqual(utils.getColumnIndex(14, 0), -1);
});

// ==================== getCellNames ====================

test('getCellNames：合法', () => {
    const n = utils.getCellNames(0, 0);
    assert.strictEqual(n.rowName, '攻击提升');
    assert.strictEqual(n.groupName, '强攻');
    assert.strictEqual(n.subName, '敏捷');
});

test('getCellNames：最后一行最后一列', () => {
    const n = utils.getCellNames(11, 69);
    assert.strictEqual(n.rowName, '终结技效率提升');
    assert.strictEqual(n.groupName, '效益');
    assert.strictEqual(n.subName, '主能力');
});

test('getCellNames：越界返回 ?', () => {
    const n1 = utils.getCellNames(-1, 0);
    assert.strictEqual(n1.rowName, '?');
    const n2 = utils.getCellNames(0, -1);
    assert.strictEqual(n2.groupName, '?');
});

// ==================== combinations ====================

test('combinations：C(5,3) = 10', () => {
    const r = utils.combinations(['a', 'b', 'c', 'd', 'e'], 3);
    assert.strictEqual(r.length, 10);
    assert.deepStrictEqual(r[0], ['a', 'b', 'c']);
});

test('combinations：C(n,0) = 1', () => {
    assert.strictEqual(utils.combinations([1, 2, 3], 0).length, 1);
});

test('combinations：C(n,n) = 1', () => {
    assert.strictEqual(utils.combinations([1, 2, 3], 3).length, 1);
});

test('combinations：k > n → 0', () => {
    assert.strictEqual(utils.combinations([1, 2], 3).length, 0);
});

// ==================== getUnacquiredScore ====================

test('getUnacquiredScore：完全空白 → 1', () => {
    assert.strictEqual(utils.getUnacquiredScore({ t: 0, v: '', a: 0 }), 1);
});

test('getUnacquiredScore：有数值 → 0', () => {
    assert.strictEqual(utils.getUnacquiredScore({ t: 0, v: '123', a: 0 }), 0);
});

test('getUnacquiredScore：t>0, a<t → t-a', () => {
    assert.strictEqual(utils.getUnacquiredScore({ t: 3, v: '', a: 1 }), 2);
});

test('getUnacquiredScore：t>0, a=t → 0', () => {
    assert.strictEqual(utils.getUnacquiredScore({ t: 3, v: '', a: 3 }), 0);
});

test('getUnacquiredScore：a>t（异常）→ 0', () => {
    assert.strictEqual(utils.getUnacquiredScore({ t: 3, v: '', a: 5 }), 0);
});

// ==================== formatBytes ====================

test('formatBytes：B 级', () => {
    assert.strictEqual(utils.formatBytes(0), '0 B');
    assert.strictEqual(utils.formatBytes(1023), '1023 B');
});

test('formatBytes：KB 级', () => {
    assert.strictEqual(utils.formatBytes(1024), '1.0 KB');
});

test('formatBytes：MB 级', () => {
    assert.strictEqual(utils.formatBytes(1024 * 1024), '1.00 MB');
});

test('formatBytes：GB 级', () => {
    assert.strictEqual(utils.formatBytes(1024 * 1024 * 1024), '1.00 GB');
});

// ==================== 颜色转换 ====================

test('hexToRgb：标准 6 位', () => {
    assert.deepStrictEqual(utils.hexToRgb('#c8e6c9'), { r: 200, g: 230, b: 201 });
});

test('hexToRgb：3 位简写', () => {
    assert.deepStrictEqual(utils.hexToRgb('#abc'), { r: 170, g: 187, b: 204 });
});

test('hexToRgb：非法输入 → 0,0,0', () => {
    assert.deepStrictEqual(utils.hexToRgb('invalid'), { r: 0, g: 0, b: 0 });
});

test('rgbToHex：越界值钳制', () => {
    assert.strictEqual(utils.rgbToHex(300, -10, 128), '#ff0080');
});

test('rgbToHex + hexToRgb 往返', () => {
    const hex = '#336699';
    const { r, g, b } = utils.hexToRgb(hex);
    assert.strictEqual(utils.rgbToHex(r, g, b), hex);
});

test('rgbToCmyk：黑色 → K=100', () => {
    assert.strictEqual(utils.rgbToCmyk(0, 0, 0).k, 100);
});

test('cmykToRgb：K=100 → 黑色', () => {
    assert.deepStrictEqual(utils.cmykToRgb(0, 0, 0, 100), { r: 0, g: 0, b: 0 });
});

test('rgbToHsl：红色 → H=0, S=100, L=50', () => {
    const hsl = utils.rgbToHsl(255, 0, 0);
    assert.strictEqual(hsl.h, 0);
    assert.strictEqual(hsl.s, 100);
    assert.strictEqual(hsl.l, 50);
});

test('hslToRgb：H=0 → 红色', () => {
    assert.deepStrictEqual(utils.hslToRgb(0, 100, 50), { r: 255, g: 0, b: 0 });
});

// ==================== escapeHtml ====================

test('escapeHtml：<script> 被转义', () => {
    assert.strictEqual(utils.escapeHtml('<script>'), '&lt;script&gt;');
});

test('escapeHtml：& 被转义', () => {
    assert.strictEqual(utils.escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml：null / undefined → 空串', () => {
    assert.strictEqual(utils.escapeHtml(null), '');
    assert.strictEqual(utils.escapeHtml(undefined), '');
});