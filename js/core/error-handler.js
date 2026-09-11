/**
 * error-handler.js - 全局错误边界
 * 挂载到 App.errorHandler
 *
 * v0.9.7 新增：
 *   - 捕获 window.onerror 与 unhandledrejection
 *   - 记录最近 50 条错误（含时间、消息、堆栈）
 *   - 通过 Toast 提示用户（避免白屏无感知）
 *   - 提供 getErrors() 供未来「导出错误日志」使用
 *
 * 设计：
 *   - 不阻止默认行为（浏览器仍会在 Console 输出）
 *   - 错误只记录、不持久化（避免污染 localStorage）
 *   - 若 App.modal 未就绪，静默跳过 Toast
 */
(function (App) {
    'use strict';

    const MAX_ERRORS = 50;
    let _errors = [];

    App.errorHandler = {
        /**
         * 初始化全局错误监听
         * 由 main.js 在 init() 最早期调用（在其它模块之前）
         */
        init() {
            window.addEventListener('error', (e) => {
                // e.error 可能是 undefined（跨源脚本错误），回退到 e.message
                this._handle(e.error || new Error(e.message || '未知错误'));
            });

            window.addEventListener('unhandledrejection', (e) => {
                const reason = e.reason;
                const err = reason instanceof Error ? reason : new Error(String(reason));
                this._handle(err);
            });
        },

        /**
         * 记录一条错误
         * @param {Error} err
         */
        _handle(err) {
            const record = {
                time: new Date().toISOString(),
                message: err && err.message ? err.message : String(err),
                stack: err && err.stack ? err.stack : ''
            };
            _errors.push(record);
            if (_errors.length > MAX_ERRORS) _errors.shift();

            // 输出到 Console
            console.error('[EEE Error]', record.message, err);

            // Toast 提示（若 modal 就绪）
            if (App.modal && typeof App.modal.showTemporaryHint === 'function') {
                try {
                    App.modal.showTemporaryHint('发生错误，已记录（详见 Console）', 'error');
                } catch (_e) { /* 静默 */ }
            }
        },

        /**
         * 获取最近的错误记录（副本）
         * @returns {Array<{time: string, message: string, stack: string}>}
         */
        getErrors() {
            return _errors.slice();
        },

        /**
         * 清空错误记录
         */
        clear() {
            _errors = [];
        }
    };

})(window.App = window.App || {});