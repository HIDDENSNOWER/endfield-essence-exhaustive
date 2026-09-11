/**
 * keyboard.js - 键盘快捷键系统
 * 挂载到 App.keyboard
 *
 * v0.9.6 新增：
 *   - Ctrl/Cmd + Z          → 撤回
 *   - Ctrl/Cmd + Shift + Z  → 重做
 *   - Ctrl/Cmd + Y          → 重做（Windows 习惯）
 *   - Escape                → 关闭最上层弹窗
 *
 * 规则：
 *   - 焦点在 input / textarea / select / contenteditable 内时，除 Escape 外不触发
 *   - Escape 例外：任何焦点位置都关闭最上层弹窗
 */
(function (App) {
    'use strict';

    /** 判断焦点元素是否为可编辑控件 */
    function isEditableTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    App.keyboard = {
        _bound: false,

        init() {
            if (this._bound) return;
            this._bound = true;
            document.addEventListener('keydown', this._onKeydown.bind(this));
        },

        _onKeydown(e) {
            // Escape：关闭最上层弹窗（不区分焦点）
            if (e.key === 'Escape') {
                const closed = this._closeTopModal();
                if (closed) {
                    e.preventDefault();
                    return;
                }
            }

            // 其他快捷键：焦点在可编辑控件内时不触发
            if (isEditableTarget(e.target)) return;

            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            // Ctrl/Cmd + Z：撤回
            if (e.key === 'z' && !e.shiftKey) {
                if (App.history && App.history.undo) {
                    e.preventDefault();
                    App.history.undo();
                }
                return;
            }

            // Ctrl/Cmd + Shift + Z：重做
            if (e.key === 'z' && e.shiftKey) {
                if (App.history && App.history.redo) {
                    e.preventDefault();
                    App.history.redo();
                }
                return;
            }

            // Ctrl/Cmd + Y：重做（Windows 习惯）
            if (e.key === 'y' && !e.shiftKey) {
                if (App.history && App.history.redo) {
                    e.preventDefault();
                    App.history.redo();
                }
                return;
            }
        },

        /**
         * 关闭最上层弹窗（由 modal.js 提供 closeTopModal）
         * @returns {boolean} 是否成功关闭
         */
        _closeTopModal() {
            if (!App.modal || !App.modal.closeTopModal) return false;
            return App.modal.closeTopModal();
        }
    };

})(window.App = window.App || {});