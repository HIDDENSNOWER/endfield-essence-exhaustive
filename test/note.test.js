
/**
 * test/note.test.js - 单元格备注模块单元测试
 *
 * 覆盖 v0.9.14 主从定位算法（positionNoteTooltip）
 * - acquire 已显示时紧贴其外侧
 * - acquire 未显示时回退到鼠标候选位
 * - 视口边界夹紧
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

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
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

    // 加载依赖（顺序：constants → utils → note）
    require('../js/core/constants.js');
    require('../js/core/utils.js');
    require('../js/features/note/note.js');

    if (!App.note) throw new Error('bootstrap 失败：App.note 未挂载');

    initialized = true;
}

// ==================== 桩化 ====================
/** 创建伪 DOM 元素：可控 style / offset / rect */
function createFakeTooltip(initial) {
    const state = {
        display: initial.display || 'none',
        left: initial.left || '0px',
        top: initial.top || '0px',
        width: initial.width || 0,
        height: initial.height || 0
    };
    return {
        get style() {
            return {
                get display() { return state.display; },
                set display(v) { state.display = v; },
                get left() { return state.left; },
                set left(v) { state.left = v; },
                get top() { return state.top; },
                set top(v) { state.top = v; }
            };
        },
        get offsetWidth() { return state.width; },
        get offsetHeight() { return state.height; },
        getBoundingClientRect() {
            return { left: 0, top: 0, width: state.width, height: state.height,
                     right: state.width, bottom: state.height };
        },
        className: '',
        set innerHTML(_v) {}
    };
}

beforeEach(() => {
    bootstrap();

    // 重置 DOM 桩
    App.dom = App.dom || {};
    App.dom.noteTooltip = createFakeTooltip({ width: 260, height: 120 });
    App.dom.acquireTooltip = createFakeTooltip({ width: 320, height: 300, display: 'none', left: '-9999px', top: '-9999px' });

    // 视口固定
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
});

// ==================== 用例 ====================

test('positionNoteTooltip: acquire 已显示 → note 紧贴其右侧（首选）', () => {
    App.dom.acquireTooltip.style.display = 'flex';
    App.dom.acquireTooltip.style.left = '100px';
    App.dom.acquireTooltip.style.top = '200px';
    // acquire: left=100, top=200, w=320, h=300 → right=420, bottom=500

    App.note.positionNoteTooltip(500, 500);
    // 期望：left = 420 + 8 = 428；top = 200
    assert.strictEqual(App.dom.noteTooltip.style.left, '428px');
    assert.strictEqual(App.dom.noteTooltip.style.top, '200px');
});

test('positionNoteTooltip: acquire 右侧空间不足 → note 放在其下方', () => {
    // 让 acquire 靠右，右边放不下 note
    App.dom.acquireTooltip.style.display = 'flex';
    App.dom.acquireTooltip.style.left = '700px';
    App.dom.acquireTooltip.style.top = '200px';
    // acquire: right = 700 + 320 = 1020（超过 vw=1000）
    // 实际：右侧放不下 → 下方
    App.note.positionNoteTooltip(500, 500);
    // 期望：left = 700, top = 200 + 300 + 8 = 508
    assert.strictEqual(App.dom.noteTooltip.style.left, '700px');
    assert.strictEqual(App.dom.noteTooltip.style.top, '508px');
});

test('positionNoteTooltip: acquire 未显示（display:none）→ 走鼠标右下候选位', () => {
    App.dom.acquireTooltip.style.display = 'none';
    App.note.positionNoteTooltip(200, 300);
    // 期望：left = 200 + 15 = 215；top = 300 + 15 = 315
    assert.strictEqual(App.dom.noteTooltip.style.left, '215px');
    assert.strictEqual(App.dom.noteTooltip.style.top, '315px');
});

test('positionNoteTooltip: acquire 隐藏但 left 为 -9999px → 视为未显示', () => {
    App.dom.acquireTooltip.style.display = 'flex';
    App.dom.acquireTooltip.style.left = '-9999px';
    App.dom.acquireTooltip.style.top = '-9999px';
    App.note.positionNoteTooltip(200, 300);
    // 期望：走鼠标右下
    assert.strictEqual(App.dom.noteTooltip.style.left, '215px');
    assert.strictEqual(App.dom.noteTooltip.style.top, '315px');
});

test('positionNoteTooltip: acquire 尺寸为 0 → 视为未显示', () => {
    App.dom.acquireTooltip.style.display = 'flex';
    App.dom.acquireTooltip.style.left = '100px';
    App.dom.acquireTooltip.style.top = '100px';
    App.dom.acquireTooltip = createFakeTooltip({ width: 0, height: 0, display: 'flex', left: '100px', top: '100px' });
    App.note.positionNoteTooltip(200, 300);
    // 期望：走鼠标右下
    assert.strictEqual(App.dom.noteTooltip.style.left, '215px');
    assert.strictEqual(App.dom.noteTooltip.style.top, '315px');
});

test('positionNoteTooltip: 鼠标在视口右下角 → 夹紧到视口内', () => {
    App.dom.acquireTooltip.style.display = 'none';
    App.note.positionNoteTooltip(990, 790);
    // 右下候选位越界 → 夹紧
    const left = parseInt(App.dom.noteTooltip.style.left, 10);
    const top = parseInt(App.dom.noteTooltip.style.top, 10);
    assert.ok(left <= 1000 - 260 - 10, `left=${left} 应 ≤ 730`);
    assert.ok(top <= 800 - 120 - 10, `top=${top} 应 ≤ 670`);
    assert.ok(left >= 10 && top >= 10, '应 ≥ pad');
});

test('positionNoteTooltip: acquire 占满右下角 → 回退鼠标候选位并夹紧', () => {
    // acquire 占满右下半屏
    App.dom.acquireTooltip.style.display = 'flex';
    App.dom.acquireTooltip.style.left = '500px';
    App.dom.acquireTooltip.style.top = '400px';
    App.dom.acquireTooltip.style.width = 500;   // 通过桩修改
    // 桩是只读的，换一个新的
    App.dom.acquireTooltip = createFakeTooltip({ width: 490, height: 390, display: 'flex', left: '500px', top: '400px' });
    App.note.positionNoteTooltip(950, 750);
    // 期望：note 被放到视口内某处（不抛错、不越界）
    const left = parseInt(App.dom.noteTooltip.style.left, 10);
    const top = parseInt(App.dom.noteTooltip.style.top, 10);
    assert.ok(left >= 10 && top >= 10);
    assert.ok(left + 260 <= 1000 - 10);
    assert.ok(top + 120 <= 800 - 10);
});

test('positionNoteTooltip: note 尺寸为 0 时使用兜底 260×120', () => {
    App.dom.noteTooltip = createFakeTooltip({ width: 0, height: 0 });
    App.dom.acquireTooltip.style.display = 'none';
    App.note.positionNoteTooltip(500, 400);
    // 走鼠标右下（首选未越界）
    assert.strictEqual(App.dom.noteTooltip.style.left, '515px');
    assert.strictEqual(App.dom.noteTooltip.style.top, '415px');
});