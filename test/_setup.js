/**
 * test/_setup.js - 测试环境共享初始化
 *
 * 项目源文件均为 IIFE 挂载到 window.App，因此：
 *   1. 在 Node 中把 globalThis 设为 window
 *   2. 提供最小 document 桩（供 escapeHtml 使用）
 *   3. 按依赖顺序加载核心模块 constants.js / utils.js
 *
 * 本文件不以 .test.js / -test.js / _test.js 命名，不会被 node --test 识别为测试文件。
 * 各测试文件只需 require('./_setup.js') 即可获得已初始化的 App。
 */
'use strict';

// 1. window / App 全局
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}
if (typeof globalThis.App === 'undefined') {
    globalThis.App = {};
}

// 2. 最小 document 桩（仅覆盖 escapeHtml 所需 API）
if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        createElement(_tag) {
            let text = '';
            return {
                set textContent(v) { text = String(v); },
                get textContent() { return text; },
                get innerHTML() {
                    return text
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }
            };
        }
    };
}

// 3. 加载核心模块（依赖顺序不可颠倒）
require('../js/core/constants.js');
require('../js/core/utils.js');

module.exports = globalThis.App;