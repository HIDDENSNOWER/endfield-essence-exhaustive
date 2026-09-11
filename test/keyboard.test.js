/**
 * test/keyboard.test.js - 键盘导航模块单元测试
 *
 * 设计：模块级单例 bootstrap（只执行一次），beforeEach 仅重置状态。
 * 覆盖：
 * - moveCellSelection: 跨表 / 左右不跨表 / 边界
 * - getNavKeys / saveNavKeys: 自定义按键
 * - _handleCellNav: 弹窗打开 / 修饰键 / 自定义按键匹配
 * - 面板过滤 / 行筛选
 */
'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// ==================== HTML 模板 ====================
const HTML = `<!DOCTYPE html>
<html><body>
    <div id="tableArea">
        <table><tbody id="tableBody1"></tbody></table>
    </div>
    <select id="inputSubCol">
        <option value="0">敏捷</option><option value="1">力量</option>
        <option value="2">意志</option><option value="3">智识</option>
        <option value="4">主能力</option>
    </select>
    <select id="inputRow">
        <option value="0">攻击提升</option><option value="1">生命提升</option>
        <option value="2">暴击率提升</option><option value="3">物理伤害提升</option>
        <option value="4">灼热伤害提升</option><option value="5">法术伤害提升</option>
        <option value="6">自然伤害提升</option><option value="7">电磁伤害提升</option>
        <option value="8">寒冷伤害提升</option><option value="9">源石技艺提升</option>
        <option value="10">治疗效率提升</option><option value="11">终结技充能效率提升</option>
    </select>
    <select id="inputGroup">
        <option value="0">强攻</option><option value="1">压制</option>
        <option value="2">追袭</option><option value="3">粉碎</option>
        <option value="4">昂扬</option><option value="5">巧技</option>
        <option value="6">残暴</option><option value="7">附术</option>
        <option value="8">医疗</option><option value="9">切骨</option>
        <option value="10">迸发</option><option value="11">夜幕</option>
        <option value="12">流转</option><option value="13">效益</option>
    </select>
    <select id="recordSubCol"><option value="0">敏捷</option></select>
    <select id="recordRow"><option value="0">攻击提升</option></select>
    <select id="recordGroup"><option value="0">强攻</option></select>
</body></html>`;

// ==================== 模块级单例 ====================
let dom, window, document, App;
let initialized = false;

function bootstrap() {
    if (initialized) return;

    // 1. jsdom 环境
    dom = new JSDOM(HTML, {
        url: 'http://localhost/',
        pretendToBeVisual: true });
    window = dom.window;
    document = window.document;

    globalThis.window = window;
    globalThis.document = document;
    globalThis.localStorage = window.localStorage;

    // 2. App 单例（window.App 与 globalThis.App 指向同一对象）
    App = {};
    globalThis.App = App;
    window.App = App;

    // 3. 加载核心模块（顺序：constants → utils → keyboard）
    require('../js/core/constants.js');
    require('../js/core/utils.js');
    require('../js/features/keyboard.js');

    // 4. 校验挂载
    if (!App.constants) throw new Error('bootstrap 失败：App.constants 未挂载');
    if (!App.utils) throw new Error('bootstrap 失败：App.utils 未挂载');
    if (!App.keyboard) throw new Error('bootstrap 失败：App.keyboard 未挂载');

    // 5. 依赖 stub
    App.dom = {
        tableArea: document.getElementById('tableArea'),
        inputSubCol: document.getElementById('inputSubCol'),
        inputRow: document.getElementById('inputRow'),
        inputGroup: document.getElementById('inputGroup'),
        recordSubCol: document.getElementById('recordSubCol'),
        recordRow: document.getElementById('recordRow'),
        recordGroup: document.getElementById('recordGroup')
    };
    App.tableRenderer = { updateHighlightedCell: () => {} };
    App.modal = { closeTopModal: () => false };
    App.history = { undo: () => {}, redo: () => {} };
    App.state = {
        activePanel: 'input',
        selectedRows: App.constants.ROW_NAMES.slice(),
        rows: App.constants.ROW_NAMES.map(name => ({
            name,
            data: new Array(App.constants.COLS1 + App.constants.COLS2)
                .fill(null)
                .map(() => ({ v: '', t: 0, a: 0, note: { text: '', images: [] } }))
        }))
    };

    initialized = true;
}

// ==================== beforeEach：仅重置状态 ====================
beforeEach(() => {
    bootstrap();

    // 重置 localStorage（隔离自定义按键测试）
    localStorage.clear();

    // 重置 App.state
    App.state.activePanel = 'input';
    App.state.selectedRows = App.constants.ROW_NAMES.slice();

    // 移除可能残留的 modal-overlay
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
});

// ==================== 辅助函数 ====================
function setCurrent(rowIdx, groupIdx, subIdx) {
    App.dom.inputRow.value = String(rowIdx);
    App.dom.inputGroup.value = String(groupIdx);
    App.dom.inputSubCol.value = String(subIdx);
}

function getCurrent() {
    return {
        row: Number(App.dom.inputRow.value),
        group: Number(App.dom.inputGroup.value),
        sub: Number(App.dom.inputSubCol.value)
    };
}

// ==================== 跨表导航（up / down） ====================

test('moveCellSelection: 第一部分顶部按 ↑ 不移动', () => {
    setCurrent(0, 0, 0);
    const consumed = App.keyboard.moveCellSelection('up');
    assert.strictEqual(consumed, true);
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 0, sub: 0 });
});

test('moveCellSelection: 第二部分顶部按 ↑ → 跨到第一部分底部', () => {
    setCurrent(0, 7, 0);
    App.keyboard.moveCellSelection('up');
    assert.deepStrictEqual(getCurrent(), { row: 11, group: 0, sub: 0 });
});

test('moveCellSelection: 第一部分底部按 ↓ → 跨到第二部分顶部', () => {
    setCurrent(11, 6, 4);
    App.keyboard.moveCellSelection('down');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 13, sub: 4 });
});

test('moveCellSelection: 第二部分底部按 ↓ 不移动', () => {
    setCurrent(11, 13, 4);
    App.keyboard.moveCellSelection('down');
    assert.deepStrictEqual(getCurrent(), { row: 11, group: 13, sub: 4 });
});

test('moveCellSelection: 行中间按 ↑ 移动到上一行（保持列）', () => {
    setCurrent(5, 3, 2);
    App.keyboard.moveCellSelection('up');
    assert.deepStrictEqual(getCurrent(), { row: 4, group: 3, sub: 2 });
});

test('moveCellSelection: 行中间按 ↓ 移动到下一行（保持列）', () => {
    setCurrent(5, 3, 2);
    App.keyboard.moveCellSelection('down');
    assert.deepStrictEqual(getCurrent(), { row: 6, group: 3, sub: 2 });
});

// ==================== 左右不跨表 ====================

test('moveCellSelection: 第一部分最右列按 → 不跨表', () => {
    setCurrent(0, 6, 4);
    App.keyboard.moveCellSelection('right');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 6, sub: 4 });
});

test('moveCellSelection: 第二部分最左列按 ← 不跨表', () => {
    setCurrent(0, 7, 0);
    App.keyboard.moveCellSelection('left');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 7, sub: 0 });
});

test('moveCellSelection: 第一部分最左列按 ← 不移动', () => {
    setCurrent(0, 0, 0);
    App.keyboard.moveCellSelection('left');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 0, sub: 0 });
});

test('moveCellSelection: 第二部分最右列按 → 不移动', () => {
    setCurrent(0, 13, 4);
    App.keyboard.moveCellSelection('right');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 13, sub: 4 });
});

test('moveCellSelection: 普通按 → 移动一列', () => {
    setCurrent(0, 0, 0);
    App.keyboard.moveCellSelection('right');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 0, sub: 1 });
});

test('moveCellSelection: 普通按 ← 移动一列', () => {
    setCurrent(0, 0, 2);
    App.keyboard.moveCellSelection('left');
    assert.deepStrictEqual(getCurrent(), { row: 0, group: 0, sub: 1 });
});

// ==================== 自定义按键 ====================

test('getNavKeys: 未存储时返回默认方向键', () => {
    const keys = App.keyboard.getNavKeys();
    assert.strictEqual(keys.up, 'ArrowUp');
    assert.strictEqual(keys.down, 'ArrowDown');
    assert.strictEqual(keys.left, 'ArrowLeft');
    assert.strictEqual(keys.right, 'ArrowRight');
});

test('saveNavKeys + getNavKeys: 往返一致', () => {
    App.keyboard.saveNavKeys({ up: 'w', down: 's', left: 'a', right: 'd' });
    const keys = App.keyboard.getNavKeys();
    assert.strictEqual(keys.up, 'w');
    assert.strictEqual(keys.down, 's');
    assert.strictEqual(keys.left, 'a');
    assert.strictEqual(keys.right, 'd');
});

test('getNavKeys: localStorage 内容损坏时回退默认', () => {
    localStorage.setItem('smarttable_cell_nav_keys', 'invalid json {');
    const keys = App.keyboard.getNavKeys();
    assert.strictEqual(keys.up, 'ArrowUp');
    assert.strictEqual(keys.down, 'ArrowDown');
});

// ==================== 面板过滤 ====================

test('moveCellSelection: 非 input/record 面板返回 false', () => {
    App.state.activePanel = 'stats';
    const consumed = App.keyboard.moveCellSelection('up');
    assert.strictEqual(consumed, false);
});

// ==================== 弹窗 / 修饰键 / 自定义按键匹配 ====================

test('_handleCellNav: 有弹窗打开时返回 false', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    document.body.appendChild(overlay);

    const e = new window.KeyboardEvent('keydown', { key: 'ArrowUp' });
    const consumed = App.keyboard._handleCellNav(e);
    assert.strictEqual(consumed, false);
});

test('_handleCellNav: Ctrl 修饰键不触发导航', () => {
    const e = new window.KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true });
    const consumed = App.keyboard._handleCellNav(e);
    assert.strictEqual(consumed, false);
});

test('_handleCellNav: 自定义按键命中时触发导航', () => {
    App.keyboard.saveNavKeys({ up: 'w', down: 's', left: 'a', right: 'd' });
    setCurrent(5, 0, 0);

    const e = new window.KeyboardEvent('keydown', { key: 'w' });
    const consumed = App.keyboard._handleCellNav(e);
    assert.strictEqual(consumed, true);
    assert.strictEqual(Number(App.dom.inputRow.value), 4);
});

// ==================== 行筛选 ====================

test('moveCellSelection: 行筛选后仅在可见行之间移动', () => {
    App.state.selectedRows = ['攻击提升', '生命提升', '暴击率提升'];
    setCurrent(0, 0, 0);
    App.keyboard.moveCellSelection('down');
    assert.strictEqual(Number(App.dom.inputRow.value), 1);

    App.keyboard.moveCellSelection('down');
    assert.strictEqual(Number(App.dom.inputRow.value), 2);
});

test('moveCellSelection: 行筛选后当前行不可见时不移动', () => {
    App.state.selectedRows = ['攻击提升', '生命提升'];
    setCurrent(5, 0, 0);
    App.keyboard.moveCellSelection('down');
    assert.strictEqual(Number(App.dom.inputRow.value), 5);
});