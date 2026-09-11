/**
 * test/unacquired.test.js - 未获取统计模块单元测试
 *
 * 覆盖：
 * - _progressClass: 三档分档
 * - setMode: 三态切换 / 非法值过滤 / 相同值跳过
 * - _lockItem / _unlockItem: 双击锁定状态机
 *
 * 环境：jsdom（url 必填）
 */
'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// ==================== 模块级单例 ====================
let window, document, App;
let initialized = false;

function bootstrap() {
    if (initialized) return;

    const dom = new JSDOM(`<!DOCTYPE html><html><body>
        <div id="unacquiredModeTabs">
            <button class="unacquired-mode-tab active" data-mode="top">未获取前 36</button>
            <button class="unacquired-mode-tab" data-mode="bottom">未获取后 36</button>
            <button class="unacquired-mode-tab" data-mode="full">全收集</button>
        </div>
        <div id="unacquiredContent"></div>
    </body></html>`, {
        url: 'http://localhost/',
        pretendToBeVisual: true
    });
    window = dom.window;
    document = window.document;

    globalThis.window = window;
    globalThis.document = document;
    globalThis.localStorage = window.localStorage;

    App = {};
    globalThis.App = App;
    window.App = App;

    require('../js/core/constants.js');
    require('../js/core/utils.js');
    require('../js/features/table/unacquired.js');

    if (!App.unacquired) throw new Error('bootstrap 失败：App.unacquired 未挂载');

    initialized = true;
}

beforeEach(() => {
    bootstrap();

    // 重置 dom
    App.dom = App.dom || {};
    App.dom.unacquiredModeTabs = document.getElementById('unacquiredModeTabs');
    App.dom.unacquiredContent = document.getElementById('unacquiredContent');

    // 重置 storage
    App.storage = App.storage || {};
    App.storage.getRegions = () => [
        { name: '枢纽区', rows: ['攻击提升'], groups: ['强攻'] }
    ];
    App.storage.getUnacquiredRegionFilter = () => null;

    // 重置 cellHighlighter
    App.cellHighlighter = App.cellHighlighter || {};
    App.cellHighlighter.highlight = () => {};
    App.cellHighlighter.clear = () => {};

    // 重置 state
    App.state = App.state || {};
    App.state.rows = App.constants.ROW_NAMES.map(name => ({
        name,
        data: new Array(App.constants.COLS1 + App.constants.COLS2)
            .fill(null)
            .map(() => ({ v: '', t: 0, a: 0, note: { text: '', images: [] } }))
    }));

    // 重置模块状态
    App.unacquired._mode = 'top';
    App.unacquired._lockedLi = null;
    App.unacquired._lockedBtnLi = null;
    App.unacquired._hoveredLi = null;

    // 桩化 renderList（避免真正渲染）
    App.unacquired.renderList = () => {};
    App.unacquired._highlightComboCells = () => {};

    // 移除可能残留的取消按钮
    document.querySelectorAll('.unacquired-cancel-wrap').forEach(el => el.remove());
});

// ==================== _progressClass ====================

test('_progressClass: < 30 → progress-low', () => {
    assert.strictEqual(App.unacquired._progressClass(0), 'progress-low');
    assert.strictEqual(App.unacquired._progressClass(29), 'progress-low');
});

test('_progressClass: 30–69 → progress-mid', () => {
    assert.strictEqual(App.unacquired._progressClass(30), 'progress-mid');
    assert.strictEqual(App.unacquired._progressClass(69), 'progress-mid');
});

test('_progressClass: ≥ 70 → progress-high', () => {
    assert.strictEqual(App.unacquired._progressClass(70), 'progress-high');
    assert.strictEqual(App.unacquired._progressClass(100), 'progress-high');
});

// ==================== setMode ====================

test('setMode: 合法切换更新 _mode 与 DOM active 类', () => {
    App.unacquired.setMode('bottom');
    assert.strictEqual(App.unacquired._mode, 'bottom');
    const tabs = App.dom.unacquiredModeTabs.querySelectorAll('.unacquired-mode-tab');
    assert.ok(tabs[1].classList.contains('active'));
    assert.ok(!tabs[0].classList.contains('active'));
});

test('setMode: 非法值被忽略', () => {
    App.unacquired.setMode('invalid');
    assert.strictEqual(App.unacquired._mode, 'top');
});

test('setMode: 相同值不重渲染', () => {
    let renderCalled = 0;
    App.unacquired.renderList = () => { renderCalled++; };
    App.unacquired.setMode('top');
    assert.strictEqual(renderCalled, 0);
});

test('setMode: 切换到 full 触发重渲染', () => {
    let renderCalled = 0;
    App.unacquired.renderList = () => { renderCalled++; };
    App.unacquired.setMode('full');
    assert.strictEqual(renderCalled, 1);
    assert.strictEqual(App.unacquired._mode, 'full');
});

// ==================== _lockItem / _unlockItem ====================

/** 创建一个模拟 <li> 并挂到 body */
function makeLi(overrides) {
    const li = document.createElement('li');
    li.className = 'unacquired-top-item';
    li.dataset.region = (overrides && overrides.region) || '枢纽区';
    li.dataset.mains = (overrides && overrides.mains) || '敏捷-力量-意志';
    li.dataset.attr = (overrides && overrides.attr) || '攻击提升';
    document.body.appendChild(li);
    return li;
}

test('_lockItem: 记录锁定元素并插入取消按钮', () => {
    const li = makeLi();
    App.unacquired._lockItem(li);
    assert.strictEqual(App.unacquired._lockedLi, li);
    assert.ok(App.unacquired._lockedBtnLi);
    assert.strictEqual(App.unacquired._lockedBtnLi.className, 'unacquired-cancel-wrap');
    assert.strictEqual(li.nextSibling, App.unacquired._lockedBtnLi);
});

test('_lockItem: 点击同一 li 幂等（不重复插入）', () => {
    const li = makeLi();
    App.unacquired._lockItem(li);
    const firstBtn = App.unacquired._lockedBtnLi;
    App.unacquired._lockItem(li);
    assert.strictEqual(App.unacquired._lockedBtnLi, firstBtn);
    assert.strictEqual(document.querySelectorAll('.unacquired-cancel-wrap').length, 1);
});

test('_lockItem: 切换锁定到新 li 清除旧按钮', () => {
    const li1 = makeLi({ region: 'A' });
    const li2 = makeLi({ region: 'B' });
    App.unacquired._lockItem(li1);
    App.unacquired._lockItem(li2);
    assert.strictEqual(App.unacquired._lockedLi, li2);
    assert.strictEqual(document.querySelectorAll('.unacquired-cancel-wrap').length, 1);
    assert.strictEqual(li2.nextSibling, App.unacquired._lockedBtnLi);
});

test('_unlockItem: 清理状态并移除按钮', () => {
    const li = makeLi();
    App.unacquired._lockItem(li);
    App.unacquired._unlockItem(true);
    assert.strictEqual(App.unacquired._lockedLi, null);
    assert.strictEqual(App.unacquired._lockedBtnLi, null);
    assert.strictEqual(document.querySelectorAll('.unacquired-cancel-wrap').length, 0);
});

test('_unlockItem(false): 清理状态但保留高亮（不调 clear）', () => {
    const li = makeLi();
    App.unacquired._lockItem(li);
    let clearCalled = 0;
    App.cellHighlighter.clear = () => { clearCalled++; };
    App.unacquired._unlockItem(false);
    assert.strictEqual(App.unacquired._lockedLi, null);
    assert.strictEqual(clearCalled, 0, 'clear 不应被调用');
});