/**
 * fouc-prevent.js - 防主题闪烁（FOUC）
 *
 * v0.9.7 从 index.html 的 <head> 内联脚本外移，
 * 以配合 CSP 严格化。
 *
 * 在 body 渲染前，从 localStorage 读取主题偏好并设置 data-theme 属性，
 * 避免页面以默认主题绘制后闪切。
 *
 * 必须在 <head> 中同步加载（非 defer / 非 async）。
 */
(function () {
    'use strict';
    try {
        const t = localStorage.getItem('smarttable_theme');
        if (t === 'dark' || t === 'light') {
            document.documentElement.setAttribute('data-theme', t);
        }
    } catch (e) { /* localStorage 不可用则忽略 */ }
})();