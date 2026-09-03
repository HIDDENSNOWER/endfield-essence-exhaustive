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
 *
 * 设计说明：
 * - 所有弹窗的 DOM 元素在 core/dom.js 中缓存，通过 App.dom 访问
 * - showConfirmDialog 使用 window.__dialogConfirmCallback / __dialogCancelCallback
 *   存储回调函数，由 bindModalEvents 中的按钮事件触发
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

    App.modal = {
        /**
         * 打开弹窗
         * @param {HTMLElement} el - 弹窗遮罩元素
         *
         * 设置弹窗 display:flex 使其可见，
         * 并锁定 body 滚动，防止背景页面滚动。
         */
        openModal(el) {
            el.style.display = 'flex';
            modalOpenCount++; // 引用计数：支持嵌套弹窗
            document.body.style.overflow = 'hidden'; // 锁定背景滚动
        },

        /**
         * 关闭弹窗
         * @param {HTMLElement} el - 弹窗遮罩元素
         *
         * 隐藏弹窗；仅当所有弹窗都关闭时才恢复背景滚动（引用计数）。
         */
        closeModal(el) {
            el.style.display = 'none';
            modalOpenCount = Math.max(0, modalOpenCount - 1);
            if (modalOpenCount === 0) document.body.style.overflow = ''; // 全部关闭才恢复滚动
        },

        /**
         * 显示通用提示弹窗
         * @param {string} msg - 提示文本（支持 HTML）
         * @param {string} title - 弹窗标题，默认"提示"
         *
         * 设置标题和内容后打开 modalAlert 弹窗。
         * 内容使用固定样式（0.9rem、主要文字颜色、1.5倍行高）。
         */
        showAlert(msg, title = '提示') {
            const d = dom();
            d.alertTitle.textContent = title;
            d.alertBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</div>`;
            this.openModal(d.modalAlert);
        },

        /**
         * 关闭通用提示弹窗
         */
        closeAlert() {
            this.closeModal(dom().modalAlert);
        },

        /**
         * 显示通用确认弹窗
         * @param {string} msg - 提示消息
         * @param {Function} onConfirm - 点击"确认"后的回调函数
         * @param {Function} onCancel - 点击"取消"或关闭后的回调函数
         * @param {string} title - 弹窗标题，默认"确认"
         *
         * 设置标题和内容后打开 modalConfirmDialog 弹窗，
         * 并将回调函数存储到 window 对象上，供 bindModalEvents 中的按钮事件调用。
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
         * 关闭通用确认弹窗
         *
         * 关闭时清理全局回调并恢复底部按钮显示，
         * 防止残留回调在后续弹窗中被误触发（安全修复）。
         */
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
         * @param {string} reason - 非法输入的原因说明
         *
         * 设置原因文本后打开 modalIllegalInput 弹窗，
         * 使用 1.6 倍行高以提升可读性。
         */
        showIllegalModal(reason) {
            const d = dom();
            d.illegalBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.6;">${reason}</div>`;
            this.openModal(d.modalIllegalInput);
        },

        /**
         * 关闭非法输入提示弹窗
         */
        closeIllegalModal() {
            this.closeModal(dom().modalIllegalInput);
        },

        /**
         * 显示全部获取提示弹窗
         * @param {string} msg - 提示内容
         *
         * 当用户尝试录入已全部获取的实装基质时弹出此提示。
         */
        showFullAcquireModal(msg) {
            const d = dom();
            d.fullAcquireBody.innerHTML = `<div style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</div>`;
            this.openModal(d.modalFullAcquire);
        },

        /**
         * 关闭全部获取提示弹窗
         */
        closeFullAcquireModal() {
            this.closeModal(dom().modalFullAcquire);
        },

        /**
         * 显示短暂提示（Toast，非模态，自动消失）
         * @param {string} message - 提示内容
         * @param {string} type - 类型：'success' | 'error' | 'info'，默认 'info'
         *
         * 创建临时 div 元素，添加相应类型样式类，
         * 3 秒后自动淡出并移除。不阻塞用户操作。
         */
        showTemporaryHint(message, type = 'info') {
            const hint = document.createElement('div');
            hint.className = `temp-hint temp-hint-${type}`;
            hint.textContent = message;
            document.body.appendChild(hint);

            // 下一帧添加 show 类，触发淡入过渡
            setTimeout(() => hint.classList.add('show'), 10);

            // 3 秒后开始淡出，300ms 后移除元素
            setTimeout(() => {
                hint.classList.remove('show');
                setTimeout(() => hint.remove(), 300);
            }, 3000);
        },

        /**
         * 绑定通用弹窗的事件
         * 由 events.js 统一调用
         *
         * 绑定以下弹窗的按钮和遮罩点击事件：
         * - 通用提示弹窗（modalAlert）
         * - 通用确认弹窗（modalConfirmDialog）
         * - 非法输入弹窗（modalIllegalInput）
         * - 全部获取提示弹窗（modalFullAcquire）
         *
         * 遮罩点击（e.target === 弹窗遮罩）时关闭弹窗。
         */
        bindModalEvents() {
            // 幂等保护：重复调用不会重复绑定事件（修复回调执行两次的问题）
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
                    const cb = window.__dialogConfirmCallback; // 先取引用，关闭时会清理
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