/**
 * eslint.config.js - ESLint 9 flat config
 *
 * 项目使用 IIFE 挂载 window.App，全部为普通 <script>，sourceType 为 script。
 * jszip.min.js 与 data/ 目录不纳入检查。
 */
'use strict';

/** 浏览器 + 项目自定义全局变量 */
const browserGlobals = {
    // 标准浏览器 API
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    indexedDB: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    fetch: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly',
    Blob: 'readonly',
    File: 'readonly',
    FileReader: 'readonly',
    Image: 'readonly',
    URL: 'readonly',
    atob: 'readonly',
    btoa: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    requestAnimationFrame: 'readonly',
    MutationObserver: 'readonly',
    IntersectionObserver: 'readonly',
    Event: 'readonly',
    CustomEvent: 'readonly',
    caches: 'readonly',
    matchMedia: 'readonly',
    getComputedStyle: 'readonly',
    performance: 'readonly',
    // 项目自定义全局
    App: 'writable',
    JSZip: 'readonly',
    DEFAULT_ROWS: 'writable',
    globalThis: 'readonly'
};

module.exports = [
    // ==================== 忽略清单 ====================
    {
        ignores: [
            'node_modules/**',
            'js/lib/jszip.min.js',
            'data/**',
            '**/*.min.js'
        ]
    },

    // ==================== 前端 JS（浏览器环境） ====================
    {
        files: ['js/**/*.js'],
        ignores: ['js/lib/**'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: browserGlobals
        },
        rules: {
            // 严重级：错误
            'no-undef': 'error',
            'no-redeclare': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always'],
            'no-fallthrough': 'error',
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-cond-assign': ['error', 'except-parens'],

            // 警告级：可渐进修复
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],
            'prefer-const': 'warn',
            'no-prototype-builtins': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }]
        }
    },

    // ==================== Node 脚本（bump-version.js） ====================
    {
        files: ['bump-version.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly'
            }
        },
        rules: {
            'no-undef': 'error',
            'no-redeclare': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always'],
            'prefer-const': 'warn',
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }]
        }
    }
];