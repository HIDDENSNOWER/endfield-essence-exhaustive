/**
 * cache-clear.js - 清除浏览器缓存（全部本地数据）
 * 挂载到 App.cacheClear
 *
 * 提供右上角导航栏的「清除缓存」按钮：
 * - 点击后弹确认弹窗，**实时读取并显示当前已保存的全部数据内容**
 *   （数据集及其行数/大小、备注、设置与偏好、临时会话数据、存储总占用）
 * - 用户查看清单并确认后，清除 localStorage / sessionStorage / Cache API
 * - 清除完成后重新加载页面，应用恢复初始状态（重新加载默认数据集）
 *
 * 说明：
 * - 本应用全部数据（数据集、备注、设置等）均存储在 localStorage，
 *   因此 localStorage.clear() 即清空所有用户数据
 * - 清除操作不可撤销，清单底部会给出醒目警告与导出建议
 */
(function (App) {
    'use strict';

    // 存储键分类（与 constants.js 保持一致）
    const K = App.constants;

    /** HTML 转义 */
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /** 格式化字节数 */
    function fmtBytes(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1024 / 1024).toFixed(2) + ' MB';
    }

    /** 字符串的 UTF-8 字节大小 */
    function sizeOf(str) {
        try {
            return new Blob([str]).size;
        } catch (e) {
            return String(str || '').length * 2;
        }
    }

    /** 内容摘要（超长截断） */
    function summarize(str, maxLen) {
        const s = String(str || '');
        return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
    }

    /** 安全解析 JSON，失败返回默认值 */
    function safeParse(raw, fallback) {
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    /**
     * 扫描当前已保存的数据，构建内容清单 HTML
     * 分类展示：数据集 / 数据集备注 / 设置与偏好 / 临时会话数据，并统计总占用
     */
    function buildContentReport() {
        const sections = [];
        let totalBytes = 0;

        // ==================== localStorage ====================
        const lKeys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                lKeys.push(localStorage.key(i));
            }
        } catch (e) { /* 忽略读取失败 */ }
        lKeys.forEach(k => { totalBytes += sizeOf(localStorage.getItem(k)); });

        // ---- 数据集 ----
        const datasetList = safeParse(localStorage.getItem(K.DATASET_LIST_KEY), []);
        if (Array.isArray(datasetList) && datasetList.length) {
            const lines = datasetList.map(name => {
                const raw = localStorage.getItem(name) || '';
                let info = '数据为空';
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) info = parsed.length + ' 行 × ' + (parsed[0] && parsed[0].data ? parsed[0].data.length : 0) + ' 列';
                } catch (e) { info = summarize(raw, 40); }
                return `<div style="line-height:1.7;">· <b>${escapeHtml(name)}</b>：${info}（${fmtBytes(sizeOf(raw))}）</div>`;
            }).join('');
            sections.push(`<div style="font-weight:600; margin:6px 0 2px;">▍数据集（${datasetList.length} 个）</div>${lines}`);
        }

        // ---- 数据集备注 ----
        const remarks = safeParse(localStorage.getItem(K.REMARKS_STORAGE_KEY), {});
        const remarkNames = Object.keys(remarks || {});
        if (remarkNames.length) {
            const lines = remarkNames.map(name =>
                `<div style="line-height:1.7;">· <b>${escapeHtml(name)}</b>：${escapeHtml(summarize(remarks[name], 60))}</div>`
            ).join('');
            sections.push(`<div style="font-weight:600; margin:6px 0 2px;">▍数据集备注（${remarkNames.length} 条）</div>${lines}`);
        }

        // ---- 设置与偏好 ----
        const settings = [];
        const theme = localStorage.getItem(K.STORAGE_KEY_THEME);
        if (theme) settings.push('主题：' + (theme === 'dark' ? '暗色' : '亮色'));
        const colors = safeParse(localStorage.getItem(K.USER_COLORS_STORAGE_KEY), null);
        if (colors) settings.push('自定义颜色：' + Object.keys(colors).length + ' 项');
        const style = localStorage.getItem(K.STYLE_STORAGE_KEY);
        if (style) settings.push('表格尺寸：' + summarize(style, 40));
        const bg = localStorage.getItem(K.TABLE_BG_STORAGE_KEY);
        if (bg) settings.push('表格底色：' + summarize(bg, 40));
        const noteLayout = localStorage.getItem(K.NOTE_TOOLTIP_LAYOUT_KEY);
        if (noteLayout) settings.push('备注悬浮框布局：' + noteLayout);
        const collapsed = localStorage.getItem(K.RIGHT_COLLAPSED_KEY);
        if (collapsed) settings.push('右侧面板：' + (collapsed === '1' ? '折叠' : '展开'));
        const current = localStorage.getItem(K.CURRENT_DATASET_KEY);
        if (current) settings.push('当前选中数据集：' + current);
        if (settings.length) {
            sections.push(`<div style="font-weight:600; margin:6px 0 2px;">▍设置与偏好</div>` +
                settings.map(s => `<div style="line-height:1.7;">· ${escapeHtml(s)}</div>`).join(''));
        }

        // ==================== sessionStorage ====================
        const sessItems = [];
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const k = sessionStorage.key(i);
                sessItems.push(escapeHtml(k) + '：' + escapeHtml(summarize(sessionStorage.getItem(k), 40)));
                totalBytes += sizeOf(sessionStorage.getItem(k));
            }
        } catch (e) { /* 忽略 */ }
        if (sessItems.length) {
            sections.push(`<div style="font-weight:600; margin:6px 0 2px;">▍临时会话数据</div>` +
                sessItems.map(s => `<div style="line-height:1.7;">· ${s}</div>`).join(''));
        }

        // ---- 空状态 ----
        if (!sections.length) {
            sections.push('<div style="color:var(--text-tertiary);">当前未保存任何本地数据。</div>');
        }

        // ---- 汇总 ----
        const totalLine = `<div style="margin-top:6px; font-size:0.78rem; color:var(--text-secondary);">当前共保存 ${lKeys.length + sessItems.length} 项数据，总占用 <b>${fmtBytes(totalBytes)}</b></div>`;

        return `
            <p style="font-size:0.82rem; color:var(--text-primary); line-height:1.6; margin-bottom:6px;">
                以下为当前页面在浏览器中<b>已保存的全部数据</b>，确认后将被清除：
            </p>
            <div style="max-height:260px; overflow:auto; padding:4px 8px; border:1px solid var(--border-color,#444); border-radius:6px; font-size:0.78rem; color:var(--text-secondary);">
                ${sections.join('')}
            </div>
            ${totalLine}
            <p style="font-size:0.78rem; color:var(--danger-primary, #e74c3c); line-height:1.6; margin-top:6px;">
                ⚠️ 清除后上述内容将<b>永久丢失且无法恢复</b>，应用将恢复为初始状态。如需要保留数据，请先通过「导出」功能保存。
            </p>`;
    }

    App.cacheClear = {

        /** 构建已保存内容清单（导出便于测试） */
        buildContentReport,

        /**
         * 入口：扫描并显示当前已保存的数据内容，供用户确认后清除
         */
        openClearConfirm() {
            App.modal.showConfirmDialog(
                buildContentReport(),
                () => this.doClear(),
                () => { App.dom.inputHint.textContent = '已取消清除。'; },
                '清除浏览器缓存'
            );
        },

        /**
         * 执行清除：localStorage / sessionStorage / Cache API，然后重新加载页面
         * 清除后页面刷新，main.js 初始化会重新加载默认数据集，应用恢复初始状态
         */
        doClear() {
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) {
                console.warn('清除本地存储失败:', e);
            }
        /**
         * 执行清除：localStorage / sessionStorage / Cache API，然后重新加载页面
         * 清除后页面刷新，main.js 初始化会重新加载默认数据集，应用恢复初始状态
         */
        async doClear() {
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) {
                console.warn('清除本地存储失败:', e);
            }
            // 等待 Cache API 清除完成后再刷新，避免 Service Worker 缓存残留
            try {
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch (e) {
                console.warn('清除 Cache API 失败:', e);
            }
            // 重新加载页面
            location.reload();
        },

        /**
         * 绑定事件
         * 由 events.js 统一调用
         */
        bindCacheClearEvents() {
            if (App.dom.btnClearCache) {
                App.dom.btnClearCache.addEventListener('click', () => this.openClearConfirm());
            }
        }
    };

})(window.App = window.App || {});
