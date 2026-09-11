/**
 * modal.js - 弹窗管理 + Toast 轻提示
 * 挂载到 App.modal
 *
 * 本模块提供所有通用弹窗和轻提示的统一管理：
 * - openModal / closeModal：弹窗的打开与关闭（含滚动锁定）
 * - showAlert / closeAlert：通用提示弹窗（单按钮确定）
 * - showConfirmDialog / closeConfirmDialog：通用确认弹窗（双按钮，带回调）
 * - showIllegalModal / closeIllegalModal：非法输入提示弹窗
 * - showFullAcquireModal / closeFullAcquireModal：全部获取提示弹窗
 * - showTemporaryHint：Toast 轻提示（非模态，自动消失）
 * - bindModalEvents：绑定所有通用弹窗的关闭按钮、确定按钮和遮罩点击事件
 * - closeTopModal：关闭最上层弹窗（v0.9.6，供 Esc 快捷键调用）
 *
 * 设计说明：
 * - 所有弹窗的 DOM 元素在 core/dom.js 中缓存，通过 App.dom 访问
 * - showConfirmDialog 使用 window.__dialogConfirmCallback / __dialogCancelCallback
 *   存储回调函数，由 bindModalEvents 中的按钮事件触发
 * - v0.9.6：新增 modalStack 栈，支持 Esc 逐层关闭
 * - v0.9.7：新增 A11y 支持（role="dialog" / aria-modal / 焦点陷阱 / 焦点恢复）
 */
(function (App) {
    'use strict';

    // 便捷获取 DOM 的辅助函数
    function dom() {
        return App.dom;
    }

    // 模块级状态：打开的弹窗计数（滚动锁引用计数）与事件绑定标志（幂等）
    let modalOpenCount = 0;
    let modalEventsBound = false;
    // v0.9.6：弹窗栈，用于 Esc 键关闭最上层弹窗
    const modalStack = [];
    // v0.9.7：焦点恢复栈（与 modalStack 一一对应）
    const focusStack = [];

    /** 可聚焦元素选择器 */
    const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    App.modal = {
        /**
         * 打开弹窗
         * @param {HTMLElement} el - 弹窗遮罩元素
         *
         * v0.9.7：
         * - 添加 role="dialog" / aria-modal="true"
         * - 保存当前焦点
         * - 聚焦弹窗内第一个可聚焦元素
         * - 启用焦点陷阱（Tab 循环）
         */
        openModal(el) {
            // 若已在栈中，先移除再压入（避免重复）
            const existingIdx = modalStack.indexOf(el);
            if (existingIdx >= 0) {
                modalStack.splice(existingIdx, 1);
                focusStack.splice(existingIdx, 1);
            }

            // A11y 属性
            el.setAttribute('role', 'dialog');
            el.setAttribute('aria-modal', 'true');

            el.style.display = 'flex';
            modalOpenCount++;
            document.body.style.overflow = 'hidden';
            modalStack.push(el);

            // 保存当前焦点
            focusStack.push(document.activeElement);

            // 焦点陷阱（幂等：只在首次打开时绑定）
            if (!el._trapHandler) {
                el._trapHandler = (e) => this._trapTab(e, el);
                el.addEventListener('keydown', el._trapHandler);
            }

            // 聚焦第一个可聚焦元素（延迟到 display 生效后）
            const focusables = el.querySelectorAll(FOCUSABLE_SELECTOR);
            if (focusables.length > 0) {
                setTimeout(() => focusables[0].focus(), 10);
            }
        },

        /**
         * 关闭弹窗
         * @param {HTMLElement} el - 弹窗遮罩元素
         */
        closeModal(el) {
            el.style.display = 'none';
            modalOpenCount = Math.max(0, modalOpenCount - 1);
            if (modalOpenCount === 0) document.body.style.overflow = '';

            const idx = modalStack.indexOf(el);
            if (idx >= 0) modalStack.splice(idx, 1);

            // 移除焦点陷阱监听
            if (el._trapHandler) {
                el.removeEventListener('keydown', el._trapHandler);
                delete el._trapHandler;
            }

            // 恢复焦点
            const prevFocus = focusStack.pop();
            if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) {
                setTimeout(() => prevFocus.focus(), 0);
            }
        },

        /**
         * Tab 焦点陷阱
         * @param {KeyboardEvent} e
         * @param {HTMLElement} modalEl
         */
        _trapTab(e, modalEl) {
            if (e.key !== 'Tab') return;
            const focusables = modalEl.querySelectorAll(FOCUSABLE_SELECTOR);
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                // Shift+Tab：首元素 → 循环到末元素
                if (active === first || !modalEl.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab：末元素 → 循环到首元素
                if (active === last || !modalEl.contains(active)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        },

        /**
         * 关闭最上层弹窗（v0.9.6 新增，供 Esc 快捷键调用）
         * @returns {boolean} 是否成功关闭
         */
        closeTopModal() {
            const el = modalStack[modalStack.length - 1];
            if (!el) return false;
            this.closeModal(el);
            return true;
        },

        /**
         * 显示通用提示弹窗
         */
        showAlert(msg, title = '提示') {
            const d = dom();
            d.alertTitle.textContent = title;
            d.alertBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</div>`;
            this.openModal(d.modalAlert);
        },

        closeAlert() {
            this.closeModal(dom().modalAlert);
        },

        /**
         * 显示通用确认弹窗
         */
        showConfirmDialog(msg, onConfirm, onCancel, title = '确认', confirmText = '确认', cancelText = '取消') {
            const d = dom();
            d.confirmDialogTitle.textContent = title;
            d.confirmDialogBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</div>`;
            window.__dialogConfirmCallback = null;
            window.__dialogCancelCallback = null;
            window.__dialogConfirmCallback = onConfirm;
            window.__dialogCancelCallback = onCancel;
            if (d.btnConfirmConfirmDialog) {
                d.btnConfirmConfirmDialog.style.display = '';
                d.btnConfirmConfirmDialog.textContent = confirmText;
            }
            if (d.btnCancelConfirmDialog) {
                d.btnCancelConfirmDialog.style.display = '';
                d.btnCancelConfirmDialog.textContent = cancelText;
            }
            this.openModal(d.modalConfirmDialog);
        },

        closeConfirmDialog() {
            this.closeModal(dom().modalConfirmDialog);
            window.__dialogConfirmCallback = null;
            window.__dialogCancelCallback = null;
            const d = dom();
            if (d.btnConfirmConfirmDialog) {
                d.btnConfirmConfirmDialog.style.display = '';
                d.btnConfirmConfirmDialog.textContent = '确认';
            }
            if (d.btnCancelConfirmDialog) {
                d.btnCancelConfirmDialog.style.display = '';
                d.btnCancelConfirmDialog.textContent = '取消';
            }
        },

        /**
         * 显示非法输入提示弹窗
         */
        showIllegalModal(reason) {
            const d = dom();
            d.illegalBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.6;">${reason}</div>`;
            this.openModal(d.modalIllegalInput);
        },

        closeIllegalModal() {
            this.closeModal(dom().modalIllegalInput);
        },

        /**
         * 显示全部获取提示弹窗
         */
        showFullAcquireModal(msg) {
            const d = dom();
            d.fullAcquireBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</div>`;
            this.openModal(d.modalFullAcquire);
        },

        closeFullAcquireModal() {
            this.closeModal(dom().modalFullAcquire);
        },

        /**
         * 显示短暂提示（Toast，非模态，自动消失）
         *
         * v0.9.7：添加 role="status" aria-live="polite" 供屏幕阅读器播报
         */
        showTemporaryHint(message, type = 'info') {
            const hint = document.createElement('div');
            hint.className = `temp-hint temp-hint-${type}`;
            hint.textContent = message;
            hint.setAttribute('role', 'status');
            hint.setAttribute('aria-live', 'polite');
            document.body.appendChild(hint);

            setTimeout(() => hint.classList.add('show'), 10);

            setTimeout(() => {
                hint.classList.remove('show');
                setTimeout(() => hint.remove(), 300);
            }, 3000);
        },

        /**
         * 绑定通用弹窗的事件
         */
        bindModalEvents() {
            if (modalEventsBound) return;
            modalEventsBound = true;
            const d = dom();

            // ==================== 通用提示弹窗 ====================
            if (d.btnConfirmAlert) d.btnConfirmAlert.addEventListener('click', () => this.closeAlert());
            if (d.btnCloseAlert) d.btnCloseAlert.addEventListener('click', () => this.closeAlert());
            if (d.modalAlert) {
                d.modalAlert.addEventListener('click', (e) => {
                    if (e.target === d.modalAlert) this.closeAlert();
                });
            }

            // ==================== 通用确认弹窗 ====================
            if (d.btnConfirmConfirmDialog) {
                d.btnConfirmConfirmDialog.addEventListener('click', () => {
                    const cb = window.__dialogConfirmCallback;
                    this.closeConfirmDialog();
                    if (typeof cb === 'function') cb();
                });
            }
            if (d.btnCancelConfirmDialog) {
                d.btnCancelConfirmDialog.addEventListener('click', () => {
                    const cb = window.__dialogCancelCallback;
                    this.closeConfirmDialog();
                    if (typeof cb === 'function') cb();
                });
            }
            if (d.btnCloseConfirmDialog) {
                d.btnCloseConfirmDialog.addEventListener('click', () => {
                    const cb = window.__dialogCancelCallback;
                    this.closeConfirmDialog();
                    if (typeof cb === 'function') cb();
                });
            }
            if (d.modalConfirmDialog) {
                d.modalConfirmDialog.addEventListener('click', (e) => {
                    if (e.target === d.modalConfirmDialog) {
                        const cb = window.__dialogCancelCallback;
                        this.closeConfirmDialog();
                        if (typeof cb === 'function') cb();
                    }
                });
            }

            // ==================== 非法输入弹窗 ====================
            if (d.btnConfirmIllegal) d.btnConfirmIllegal.addEventListener('click', () => this.closeIllegalModal());
            if (d.btnCloseIllegal) d.btnCloseIllegal.addEventListener('click', () => this.closeIllegalModal());
            if (d.modalIllegalInput) {
                d.modalIllegalInput.addEventListener('click', (e) => {
                    if (e.target === d.modalIllegalInput) this.closeIllegalModal();
                });
            }

            // ==================== 全部获取提示弹窗 ====================
            if (d.btnConfirmFullAcquire) d.btnConfirmFullAcquire.addEventListener('click', () => this.closeFullAcquireModal());
            if (d.btnCloseFullAcquire) d.btnCloseFullAcquire.addEventListener('click', () => this.closeFullAcquireModal());
            if (d.modalFullAcquire) {
                d.modalFullAcquire.addEventListener('click', (e) => {
                    if (e.target === d.modalFullAcquire) this.closeFullAcquireModal();
                });
            }
        }
    };

})(window.App = window.App || {});