/**
 * test/dom.test.js - DOM 层测试（v0.9.9 新增）
 *
 * 使用 jsdom 创建虚拟 DOM 环境，测试：
 * - cell-highlighter：高亮、清除、索引缓存、变暗蒙版
 *
 * 目标：覆盖此前 90 个纯函数测试未触及的 DOM 交互路径。
 */
'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// ==================== 每次测试前重建 DOM 环境 ====================
let dom, window, document;

function setupDom() {
    dom = new JSDOM(`<!DOCTYPE html>
        <html>
        <head></head>
        <body>
            <table id="table1">
                <thead id="tableHead1"></thead>
                <tbody id="tableBody1"></tbody>
            </table>
            <table id="table2">
                <thead id="tableHead2"></thead>
                <tbody id="tableBody2"></tbody>
            </table>
        </body>
        </html>`, { pretendToBeVisual: true });

    window = dom.window;
    document = window.document;

    globalThis.window = window;
    globalThis.document = document;
    globalThis.MutationObserver = window.MutationObserver;
    globalThis.Node = window.Node;
    globalThis.HTMLElement = window.HTMLElement;

    // 关键修复：让 globalThis.App 与 window.App 指向同一个对象，
    // 保证 IIFE 内 `window.App = window.App || {}` 挂载到测试可访问的 App 上
    globalThis.App = {};
    window.App = globalThis.App;
}

// ==================== 加载核心与目标模块 ====================
function loadModules() {
    // 加载真实模块（用 Node 的 require）
    delete require.cache[require.resolve('../js/core/constants.js')];
    delete require.cache[require.resolve('../js/core/utils.js')];
    delete require.cache[require.resolve('../js/features/table/cell-highlighter.js')];

    require('../js/core/constants.js');
    require('../js/core/utils.js');
    require('../js/features/table/cell-highlighter.js');
}

// ==================== 辅助：构造 td 并写入 DOM ====================
function appendTd(bodyId, rowIdx, colIdx, text = '') {
    const body = document.getElementById(bodyId);
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.dataset.rowindex = rowIdx;
    td.dataset.colindex = colIdx;
    td.textContent = text;
    tr.appendChild(td);
    body.appendChild(tr);
    return td;
}

// ==================== 测试用例 ====================

beforeEach(() => {
    setupDom();
    loadModules();
});

test('cellHighlighter：buildIndex 构建正确索引', () => {
    appendTd('tableBody1', 0, 0);
    appendTd('tableBody1', 0, 1);
    appendTd('tableBody2', 1, 2);

    App.cellHighlighter.buildIndex();
    const index = App.cellHighlighter._index;
    assert.strictEqual(index.size, 3);
    assert.ok(index.has('0_0'));
    assert.ok(index.has('0_1'));
    assert.ok(index.has('1_2'));
});

test('cellHighlighter：_getCell 命中缓存', () => {
    const td = appendTd('tableBody1', 0, 0);
    App.cellHighlighter.buildIndex();
    const found = App.cellHighlighter._getCell(0, 0);
    assert.strictEqual(found, td);
});

test('cellHighlighter：highlight 给未获取格加红框', () => {
    const td = appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([
        { rowIdx: 0, colIndex: 0, isUnacquired: true }
    ], { scroll: false });
    assert.ok(td.classList.contains('unacquired-cell-highlight'));
});

test('cellHighlighter：highlight 给已获取格加绿框', () => {
    const td = appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([
        { rowIdx: 0, colIndex: 0, isUnacquired: false }
    ], { scroll: false });
    assert.ok(td.classList.contains('acquired-cell-highlight'));
});

test('cellHighlighter：clear 清除所有高亮', () => {
    const td = appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([
        { rowIdx: 0, colIndex: 0, isUnacquired: true }
    ], { scroll: false });
    App.cellHighlighter.clear();
    assert.ok(!td.classList.contains('unacquired-cell-highlight'));
    assert.strictEqual(App.cellHighlighter._highlightedCells.length, 0);
});

test('cellHighlighter：clear 全表兜底（残留 class 清理）', () => {
    const td = appendTd('tableBody1', 0, 0);
    // 模拟残留：直接加 class，不通过 highlight
    td.classList.add('unacquired-cell-highlight');
    App.cellHighlighter.clear();
    assert.ok(!td.classList.contains('unacquired-cell-highlight'));
});

test('cellHighlighter：isActive 状态正确', () => {
    assert.strictEqual(App.cellHighlighter.isActive(), false);

    appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([
        { rowIdx: 0, colIndex: 0, isUnacquired: true }
    ], { scroll: false });
    assert.strictEqual(App.cellHighlighter.isActive(), true);

    App.cellHighlighter.clear();
    assert.strictEqual(App.cellHighlighter.isActive(), false);
});

test('cellHighlighter：变暗蒙版在 highlight 后加上', () => {
    appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([
        { rowIdx: 0, colIndex: 0, isUnacquired: true }
    ], { scroll: false });

    const table1 = document.getElementById('tableBody1').closest('table');
    const table2 = document.getElementById('tableBody2').closest('table');
    assert.ok(table1.classList.contains('unacquired-dimming'));
    assert.ok(table2.classList.contains('unacquired-dimming'));
});

test('cellHighlighter：clear 后移除变暗蒙版', () => {
    appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([
        { rowIdx: 0, colIndex: 0, isUnacquired: true }
    ], { scroll: false });
    App.cellHighlighter.clear();

    const table1 = document.getElementById('tableBody1').closest('table');
    assert.ok(!table1.classList.contains('unacquired-dimming'));
});

test('cellHighlighter：invalidateIndex 清空索引', () => {
    appendTd('tableBody1', 0, 0);
    App.cellHighlighter.buildIndex();
    assert.ok(App.cellHighlighter._index);

    App.cellHighlighter.invalidateIndex();
    assert.strictEqual(App.cellHighlighter._index, null);
});

test('cellHighlighter：highlight 空列表不报错', () => {
    assert.doesNotThrow(() => {
        App.cellHighlighter.highlight([], { scroll: false });
    });
});

test('cellHighlighter：多次 highlight 不累积 class', () => {
    const td = appendTd('tableBody1', 0, 0);
    App.cellHighlighter.highlight([{ rowIdx: 0, colIndex: 0, isUnacquired: true }], { scroll: false });
    App.cellHighlighter.highlight([{ rowIdx: 0, colIndex: 0, isUnacquired: false }], { scroll: false });

    assert.ok(td.classList.contains('acquired-cell-highlight'));
    assert.ok(!td.classList.contains('unacquired-cell-highlight'));
    assert.strictEqual(App.cellHighlighter._highlightedCells.length, 1);
});

test('cellHighlighter：_getCell 索引失效时自动重建', () => {
    const td = appendTd('tableBody1', 0, 0);
    App.cellHighlighter.invalidateIndex();
    const found = App.cellHighlighter._getCell(0, 0);
    assert.strictEqual(found, td);
});