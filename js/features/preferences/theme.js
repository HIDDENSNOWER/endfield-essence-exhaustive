/**
 * theme.js - 主题切换与颜色恢复
 * 挂载到 App.theme
 *
 * 本模块负责应用的明暗主题管理：
 * - applyTheme：应用指定主题（light 或 dark），更新 DOM 属性、图标、保存偏好、恢复自定义颜色
 * - toggleTheme：在亮色与暗色之间切换
 * - loadTheme：从 localStorage 或系统偏好加载初始主题
 * - applySavedColors：应用用户自定义的四种状态颜色（按主题区分）
 * - bindThemeEvents：绑定主题切换按钮和系统主题变化监听
 *
 * 主题切换会影响：
 * - CSS 变量（通过 html 的 data-theme 属性）
 * - 图标显隐（太阳/月亮）
 * - 用户自定义颜色（不同主题可分别保存）
 * - 表格底色（奇偶行背景随主题变化）
 */
(function (App) {
    'use strict';

    App.theme = {
        /**
         * 应用主题
         * @param {string} theme - 'light' 或 'dark'
         *
         * 功能：
         * - 更新全局状态 state.theme
         * - 设置 html 元素的 data-theme 属性，触发 CSS 变量切换
         * - 切换太阳/月亮图标的显示状态
         * - 保存主题偏好到 localStorage
         * - 应用该主题下的用户自定义状态颜色
         * - 同步表格底色（确保奇偶行背景与主题匹配）
         */
        applyTheme(theme) {
            // 更新全局状态
            App.state.theme = theme;

            // 设置 html 元素的 data-theme 属性，用于 CSS 变量切换
            document.documentElement.setAttribute('data-theme', theme);

            // 获取图标元素
            const dom = App.dom;
            const iconSun = dom.iconSun;
            const iconMoon = dom.iconMoon;

            // 切换图标显隐：亮色显示太阳，暗色显示月亮
            if (iconSun) iconSun.style.display = theme === 'dark' ? 'none' : '';
            if (iconMoon) iconMoon.style.display = theme === 'dark' ? '' : 'none';

            // 保存主题到 localStorage
            App.storage.set(App.constants.STORAGE_KEY_THEME, theme);

            // 应用用户自定义状态颜色
            this.applySavedColors();

            // 同步表格底色（确保奇偶行背景与主题匹配）
            if (App.tableStyle && App.tableStyle.syncTableBgColors) {
                App.tableStyle.syncTableBgColors();
            }
        },

        /**
         * 切换主题
         *
         * 根据当前主题状态，切换为相反的主题。
         */
        toggleTheme() {
            this.applyTheme(App.state.isDarkTheme() ? 'light' : 'dark');
        },

        /**
         * 从 localStorage 或系统偏好加载主题
         *
         * 优先使用用户保存的主题偏好；
         * 若无保存记录，则根据操作系统的颜色偏好决定初始主题。
         */
        loadTheme() {
            const saved = App.storage.get(App.constants.STORAGE_KEY_THEME);
            if (saved) {
                this.applyTheme(saved);
            } else {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.applyTheme(prefersDark ? 'dark' : 'light');
            }
        },

        /**
         * 应用保存的用户自定义状态颜色
         *
         * 根据当前主题，从 localStorage 读取用户自定义的四种状态颜色，
         * 并设置为内联 CSS 变量。若未保存自定义颜色，则移除内联变量，
         * 使用默认主题颜色（由 CSS 变量在 :root 或 [data-theme] 中定义）。
         */
        applySavedColors() {
            const C = App.constants;

            // 移除所有内联颜色变量，防止旧主题颜色残留
            Object.keys(C.COLOR_VARS).forEach(key => {
                document.documentElement.style.removeProperty(C.COLOR_VARS[key]);
            });

            // 读取当前主题的用户自定义颜色
            const theme = App.state.isDarkTheme() ? 'dark' : 'light';
            const colors = App.storage.loadUserColors(theme);
            if (!colors) return; // 无自定义颜色，使用默认

            // 应用自定义颜色
            Object.keys(C.COLOR_VARS).forEach(key => {
                if (colors[key]) {
                    document.documentElement.style.setProperty(C.COLOR_VARS[key], colors[key]);
                }
            });
        },

        /**
         * 绑定主题相关事件
         * 由 events.js 统一调用
         *
         * 绑定：
         * - 主题切换按钮点击事件
         * - 系统主题变化监听（仅当用户未手动设置主题时生效）
         */
        bindThemeEvents() {
            const dom = App.dom;

            // 点击按钮切换主题
            if (dom.btnToggleTheme) {
                dom.btnToggleTheme.addEventListener('click', () => this.toggleTheme());
            }

            // 监听系统主题变化（仅当用户未手动设置主题时）
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!App.storage.get(App.constants.STORAGE_KEY_THEME)) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    };

})(window.App = window.App || {});