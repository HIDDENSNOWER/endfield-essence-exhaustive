/**
 * test/modal.test.js - 弹窗管理模块单元测试
 *
 * 覆盖：
 * - openModal / closeModal: display / A11y / body.overflow / 引用计数
 * - closeTopModal: 栈式关闭
 * - showAlert / showConfirmDialog / showIllegalModal / showFullAcquireModal
 * - closeConfirmDialog: 回调清理 + 按钮文本重置
 * - showTemporaryHint: toast 创建与类型
 * - bindModalEvents: 幂等性
 *
 * 环境：jsdom（url 必填，否则 localStorage 不可用）
 */
'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// ==================== HTML 模板 ====================
const HTML = `<!DOCTYPE html>
<html><body>
    <div class="modal-overlay" id="modalAlert" style="display:none;">
        <span id="alertTitle">提示</span>
        <div id="alertBody"></div>
        <button id="btnConfirmAlert">确定</button>
        <button id="btnCloseAlert">×</button>
    </div>
    <div class="modal-overlay" id="modalConfirmDialog" style="display:none;">
        <span id="confirmDialogTitle">确认</span>
        <div id="confirmDialogBody"></div>
        <button id="btnConfirmConfirmDialog">确认</button>
        <button id="btnCancelConfirmDialog">取消</button>
        <button id="btnCloseConfirmDialog">×</button>
    </div>
    <div class="modal-overlay" id="modalIllegalInput" style="display:none;">
        <div id="illegalBody"></div>
        <button id="btnConfirmIllegal">确定</button>
        <button id="btnCloseIllegal">×</button>
    </div>
    <div class="modal-overlay" id="modalFullAcquire" style="display:none;">
        <div id="fullAcquireBody"></div>
        <button id="btnConfirmFullAcquire">确定</button>
        <button id="btnCloseFullAcquire">×</button>
    </div>
</body></html>`;

// ==================== 模块级单例 bootstrap ====================
let dom, window, document, App;
let initialized = false;

function bootstrap() {
    if (initialized) return;

    // 关键：url 参数 —— jsdom 默认 about:blank（opaque origin）会禁用 localStorage
    dom = new JSDOM(HTML, {
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

    // 构建 App.dom（modal.js 方法体访问 App.dom.*）
    App.dom = {
        modalAlert: document.getElementById('modalAlert'),
        alertTitle: document.getElementById('alertTitle'),
        alertBody: document.getElementById('alertBody'),
        btnConfirmAlert: document.getElementById('btnConfirmAlert'),
        btnCloseAlert: document.getElementById('btnCloseAlert'),

        modalConfirmDialog: document.getElementById('modalConfirmDialog'),
        confirmDialogTitle: document.getElementById('confirmDialogTitle'),
        confirmDialogBody: document.getElementById('confirmDialogBody'),
        btnConfirmConfirmDialog: document.getElementById('btnConfirmConfirmDialog'),
        btnCancelConfirmDialog: document.getElementById('btnCancelConfirmDialog'),
        btnCloseConfirmDialog: document.getElementById('btnCloseConfirmDialog'),

        modalIllegalInput: document.getElementById('modalIllegalInput'),
        illegalBody: document.getElementById('illegalBody'),
        btnConfirmIllegal: document.getElementById('btnConfirmIllegal'),
        btnCloseIllegal: document.getElementById('btnCloseIllegal'),

        modalFullAcquire: document.getElementById('modalFullAcquire'),
        fullAcquireBody: document.getElementById('fullAcquireBody'),
        btnConfirmFullAcquire: document.getElementById('btnConfirmFullAcquire'),
        btnCloseFullAcquire: document.getElementById('btnCloseFullAcquire')
    };

    require('../js/services/modal.js');

    if (!App.modal) throw new Error('bootstrap 失败：App.modal 未挂载');

    initialized = true;
}

// ==================== beforeEach：仅重置状态 ====================
beforeEach(() => {
    bootstrap();

    // 重置 modal 内部闭包状态（openCount / stack / focusStack）
    if (App.modal._resetState) App.modal._resetState();

    // 重置 DOM 残留（display / A11y 属性）
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.style.display = 'none';
        el.removeAttribute('role');
        el.removeAttribute('aria-modal');
    });

    // 清空回调残留
    window.__dialogConfirmCallback = null;
    window.__dialogCancelCallback = null;

    // 移除 toast
    document.querySelectorAll('.temp-hint').forEach(el => el.remove());
});

// ==================== openModal / closeModal ====================

test('openModal: 设置 display:flex 与 A11y 属性', () => {
    const el = App.dom.modalAlert;
    App.modal.openModal(el);
    assert.strictEqual(el.style.display, 'flex');
    assert.strictEqual(el.getAttribute('role'), 'dialog');
    assert.strictEqual(el.getAttribute('aria-modal'), 'true');
});

test('openModal: 设置 body overflow 为 hidden', () => {
    App.modal.openModal(App.dom.modalAlert);
    assert.strictEqual(document.body.style.overflow, 'hidden');
});

test('closeModal: 恢复 display 与 body overflow', () => {
    App.modal.openModal(App.dom.modalAlert);
    App.modal.closeModal(App.dom.modalAlert);
    assert.strictEqual(App.dom.modalAlert.style.display, 'none');
    assert.strictEqual(document.body.style.overflow, '');
});

test('openModal 嵌套：引用计数正确', () => {
    App.modal.openModal(App.dom.modalAlert);
    App.modal.openModal(App.dom.modalConfirmDialog);
    assert.strictEqual(document.body.style.overflow, 'hidden');

    App.modal.closeModal(App.dom.modalConfirmDialog);
    assert.strictEqual(document.body.style.overflow, 'hidden');

    App.modal.closeModal(App.dom.modalAlert);
    assert.strictEqual(document.body.style.overflow, '');
});

test('openModal: 重复打开同一弹窗不重复入栈', () => {
    const el = App.dom.modalAlert;
    App.modal.openModal(el);
    App.modal.openModal(el);
    App.modal.closeModal(el);
    assert.strictEqual(document.body.style.overflow, '');
    assert.strictEqual(App.modal.closeTopModal(), false);
});

// ==================== closeTopModal ====================

test('closeTopModal: 关闭最上层弹窗', () => {
    const a = App.dom.modalAlert;
    const b = App.dom.modalConfirmDialog;
    App.modal.openModal(a);
    App.modal.openModal(b);
    const closed = App.modal.closeTopModal();
    assert.strictEqual(closed, true);
    assert.strictEqual(b.style.display, 'none');
    assert.strictEqual(a.style.display, 'flex');
});

test('closeTopModal: 无弹窗时返回 false', () => {
    assert.strictEqual(App.modal.closeTopModal(), false);
});

// ==================== showAlert / closeAlert ====================

test('showAlert: 设置标题与内容并打开弹窗', () => {
    App.modal.showAlert('测试内容', '测试标题');
    assert.strictEqual(App.dom.alertTitle.textContent, '测试标题');
    assert.ok(App.dom.alertBody.innerHTML.includes('测试内容'));
    assert.strictEqual(App.dom.modalAlert.style.display, 'flex');
});

test('showAlert: 默认标题为「提示」', () => {
    App.modal.showAlert('内容');
    assert.strictEqual(App.dom.alertTitle.textContent, '提示');
});

test('closeAlert: 关闭提示弹窗', () => {
    App.modal.showAlert('内容');
    App.modal.closeAlert();
    assert.strictEqual(App.dom.modalAlert.style.display, 'none');
});

// ==================== showConfirmDialog / closeConfirmDialog ====================

test('showConfirmDialog: 存储确认 / 取消回调', () => {
    const onConfirm = () => {};
    const onCancel = () => {};
    App.modal.showConfirmDialog('内容', onConfirm, onCancel);
    assert.strictEqual(window.__dialogConfirmCallback, onConfirm);
    assert.strictEqual(window.__dialogCancelCallback, onCancel);
});

test('showConfirmDialog: 设置自定义按钮文本', () => {
    App.modal.showConfirmDialog('内容', () => {}, () => {}, '标题', '是', '否');
    assert.strictEqual(App.dom.btnConfirmConfirmDialog.textContent, '是');
    assert.strictEqual(App.dom.btnCancelConfirmDialog.textContent, '否');
});

test('closeConfirmDialog: 清理回调并重置按钮文本', () => {
    App.modal.showConfirmDialog('内容', () => {}, () => {}, '标题', '是', '否');
    App.modal.closeConfirmDialog();
    assert.strictEqual(window.__dialogConfirmCallback, null);
    assert.strictEqual(window.__dialogCancelCallback, null);
    assert.strictEqual(App.dom.btnConfirmConfirmDialog.textContent, '确认');
    assert.strictEqual(App.dom.btnCancelConfirmDialog.textContent, '取消');
});

// ==================== showIllegalModal / showFullAcquireModal ====================

test('showIllegalModal: 设置内容并打开', () => {
    App.modal.showIllegalModal('非法原因');
    assert.ok(App.dom.illegalBody.innerHTML.includes('非法原因'));
    assert.strictEqual(App.dom.modalIllegalInput.style.display, 'flex');
});

test('closeIllegalModal: 关闭非法输入弹窗', () => {
    App.modal.showIllegalModal('内容');
    App.modal.closeIllegalModal();
    assert.strictEqual(App.dom.modalIllegalInput.style.display, 'none');
});

test('showFullAcquireModal: 设置内容并打开', () => {
    App.modal.showFullAcquireModal('全部获取消息');
    assert.ok(App.dom.fullAcquireBody.innerHTML.includes('全部获取消息'));
    assert.strictEqual(App.dom.modalFullAcquire.style.display, 'flex');
});

test('closeFullAcquireModal: 关闭全部获取弹窗', () => {
    App.modal.showFullAcquireModal('内容');
    App.modal.closeFullAcquireModal();
    assert.strictEqual(App.dom.modalFullAcquire.style.display, 'none');
});

// ==================== showTemporaryHint ====================

test('showTemporaryHint: 创建 toast 元素并设置 A11y 属性', () => {
    App.modal.showTemporaryHint('提示消息', 'success');
    const hint = document.querySelector('.temp-hint');
    assert.ok(hint);
    assert.ok(hint.classList.contains('temp-hint-success'));
    assert.strictEqual(hint.textContent, '提示消息');
    assert.strictEqual(hint.getAttribute('role'), 'status');
    assert.strictEqual(hint.getAttribute('aria-live'), 'polite');
});

test('showTemporaryHint: 默认类型为 info', () => {
    App.modal.showTemporaryHint('消息');
    const hint = document.querySelector('.temp-hint');
    assert.ok(hint.classList.contains('temp-hint-info'));
});

// ==================== bindModalEvents 幂等 ====================
// 注意：此测试必须放在最后，因为 modal.js 内部有 modalEventsBound 标志，
// 一旦调用过便永久为 true（模块级闭包），无法在 beforeEach 里重置。
// 本文件其他测试均不调用 bindModalEvents，因此可安全放在末尾。

test('bindModalEvents: 重复调用不重复绑定', () => {
    let clickCount = 0;
    const originalCloseAlert = App.modal.closeAlert;
    App.modal.closeAlert = function () {
        clickCount++;
    };

    App.modal.bindModalEvents();
    App.modal.bindModalEvents();
    App.modal.bindModalEvents();

    App.dom.btnConfirmAlert.click();

    // 若重复绑定，clickCount 会 > 1
    assert.strictEqual(clickCount, 1);

    App.modal.closeAlert = originalCloseAlert;
});