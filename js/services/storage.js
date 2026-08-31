/**
 * storage.js - localStorage 统一封装
 * 挂载到 App.storage
 *
 * 本模块负责所有 localStorage 的读写操作，提供统一的接口：
 * - 基础操作：get / set / remove / getJSON / setJSON（带异常处理）
 * - 数据集列表管理：获取、保存、添加、移除数据集键
 * - 数据集备注：获取、保存所有备注，以及当前数据集的备注
 * - 用户自定义颜色：按主题（亮/暗）分别存储四种状态颜色
 * - 表格尺寸：列宽、行高的保存与读取（带默认值回退）
 * - 表格底色：奇偶行背景色的默认值、存储和读取（按主题区分）
 * - 备注悬浮框布局与位置：布局偏好和位置尺寸的持久化
 * - 右侧面板折叠状态：布尔值的字符串存储
 * - 当前数据集键：记住用户最后使用的数据集
 *
 * 设计说明：
 * - 所有操作均包含 try-catch，防止 localStorage 不可用或配额满时导致崩溃
 * - JSON 格式数据通过 getJSON/setJSON 自动序列化和反序列化
 * - 读取时提供默认值回退，保证应用在首次运行或无存储数据时正常工作
 */
(function (App) {
    'use strict';

    // 便捷获取常量对象，减少重复代码
    const C = App.constants;

    App.storage = {
        // ==================== 基础操作 ====================

        /**
         * 读取字符串值
         * @param {string} key - 存储键名
         * @param {*} fallback - 键不存在或读取失败时的默认值
         * @returns {*} 存储的字符串，或 fallback
         *
         * 捕获异常，确保 localStorage 不可用时不影响应用运行。
         */
        get(key, fallback = null) {
            try {
                const val = localStorage.getItem(key);
                return val !== null ? val : fallback;
            } catch (e) {
                return fallback;
            }
        },

        /**
         * 写入字符串值
         * @param {string} key - 存储键名
         * @param {string} value - 要存储的字符串
         *
         * 捕获异常并输出警告，防止写入失败导致程序中断。
         */
        set(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn('storage.set failed:', key, e);
            }
        },

        /**
         * 删除存储项
         * @param {string} key - 存储键名
         *
         * 捕获异常并输出警告。
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('storage.remove failed:', key, e);
            }
        },

        /**
         * 读取 JSON 格式数据
         * @param {string} key - 存储键名
         * @param {*} fallback - 键不存在或解析失败时的默认值
         * @returns {*} 解析后的 JSON 数据，或 fallback
         *
         * 自动 JSON.parse，解析失败时返回默认值。
         */
        getJSON(key, fallback = null) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (e) {
                return fallback;
            }
        },

        /**
         * 写入 JSON 格式数据
         * @param {string} key - 存储键名
         * @param {*} value - 要序列化并存储的数据
         *
         * 自动 JSON.stringify，捕获异常并输出警告。
         */
        setJSON(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('storage.setJSON failed:', key, e);
            }
        },

        // ==================== 数据集列表 ====================

        /**
         * 获取所有数据集名称列表
         * @returns {string[]} 数据集名称数组
         */
        getDatasetList() {
            return this.getJSON(C.DATASET_LIST_KEY, []);
        },

        /**
         * 保存数据集名称列表
         * @param {string[]} list - 数据集名称数组
         */
        saveDatasetList(list) {
            this.setJSON(C.DATASET_LIST_KEY, list);
        },

        /**
         * 向数据集列表中添加一个键（若已存在则忽略）
         * @param {string} key - 数据集名称
         */
        addDatasetKey(key) {
            const list = this.getDatasetList();
            if (!list.includes(key)) {
                list.push(key);
                this.saveDatasetList(list);
            }
        },

        /**
         * 从数据集列表移除一个键
         * @param {string} key - 数据集名称
         */
        removeDatasetKey(key) {
            const list = this.getDatasetList().filter(k => k !== key);
            this.saveDatasetList(list);
        },

        // ==================== 数据集备注 ====================

        /**
         * 获取所有数据集的备注对象
         * @returns {Object} 键为数据集名称，值为备注字符串
         */
        getDatasetRemarks() {
            return this.getJSON(C.REMARKS_STORAGE_KEY, {});
        },

        /**
         * 保存所有数据集的备注对象
         * @param {Object} remarks - 键为数据集名称，值为备注字符串
         */
        saveDatasetRemarks(remarks) {
            this.setJSON(C.REMARKS_STORAGE_KEY, remarks);
        },

        /**
         * 获取当前数据集的备注
         * @returns {string} 当前数据集的备注字符串
         *
         * 注意：此函数存在逻辑问题，使用 App.state.rows 作为键名是错误的。
         * 正确做法应使用 loadCurrentDatasetKey() 获取当前数据集名称。
         * 但由于该函数在现有代码中未被调用，暂不修改。
         */
        getCurrentDatasetRemark() {
            const remarks = this.getDatasetRemarks();
            return remarks[App.state.rows ? App.state.rows : ''] || '';
        },

        // ==================== 用户自定义颜色 ====================

        /**
         * 加载指定主题的用户自定义颜色
         * @param {string} theme - 'light' 或 'dark'
         * @returns {Object|null} 包含四种状态颜色的对象，未保存则返回 null
         */
        loadUserColors(theme) {
            const data = this.getJSON(C.USER_COLORS_STORAGE_KEY, {});
            return data[theme] || null;
        },

        /**
         * 保存指定主题的用户自定义颜色
         * @param {string} theme - 'light' 或 'dark'
         * @param {Object} colors - 包含四种状态颜色的对象
         *
         * 将颜色保存到对应主题的键下，不影响其他主题。
         */
        saveUserColors(theme, colors) {
            const data = this.getJSON(C.USER_COLORS_STORAGE_KEY, {});
            data[theme] = colors;
            this.setJSON(C.USER_COLORS_STORAGE_KEY, data);
        },

        // ==================== 表格尺寸 ====================

        /**
         * 加载表格列宽和行高设置
         * @returns {{colWidth: number, rowHeight: number}} 列宽和行高，带默认值回退
         */
        loadTableSize() {
            const saved = this.getJSON(C.STYLE_STORAGE_KEY, {});
            return {
                colWidth: saved.colWidth || C.DEFAULT_COL_WIDTH,
                rowHeight: saved.rowHeight || C.DEFAULT_ROW_HEIGHT
            };
        },

        /**
         * 保存表格列宽和行高设置
         * @param {number} colWidth - 列宽（像素）
         * @param {number} rowHeight - 行高（像素）
         */
        saveTableSize(colWidth, rowHeight) {
            this.setJSON(C.STYLE_STORAGE_KEY, { colWidth, rowHeight });
        },

        // ==================== 表格底色 ====================

        /**
         * 获取指定主题的默认表格底色
         * @param {string} theme - 'light' 或 'dark'
         * @returns {{odd: string, even: string}} 奇偶行默认背景色
         */
        getDefaultTableBgColors(theme) {
            return theme === 'dark'
                ? { odd: '#0f1722', even: '#1b2636' }
                : { odd: '#f8fafc', even: '#eaf0f6' };
        },

        /**
         * 获取所有主题存储的表格底色
         * @returns {Object} 键为主题，值为 {odd, even} 对象
         */
        getStoredTableBgColors() {
            return this.getJSON(C.TABLE_BG_STORAGE_KEY, {});
        },

        /**
         * 保存指定主题的表格底色
         * @param {string} theme - 'light' 或 'dark'
         * @param {{odd: string, even: string}} colors - 奇偶行背景色
         */
        saveTableBgColors(theme, colors) {
            const stored = this.getStoredTableBgColors();
            stored[theme] = { odd: colors.odd, even: colors.even };
            this.setJSON(C.TABLE_BG_STORAGE_KEY, stored);
        },

        /**
         * 加载指定主题的表格底色
         * @param {string} theme - 'light' 或 'dark'
         * @returns {{odd: string, even: string}} 奇偶行背景色，带默认值回退
         */
        loadTableBgColors(theme) {
            const stored = this.getStoredTableBgColors();
            const colors = stored[theme];
            const defaults = this.getDefaultTableBgColors(theme);

            if (typeof colors !== 'object' || colors === null) return defaults;

            return {
                odd: colors.odd || defaults.odd,
                even: colors.even || defaults.even
            };
        },

        // ==================== 备注悬浮框布局与位置 ====================

        /**
         * 加载备注悬浮框布局偏好
         * @returns {string} 布局类型：'text-top' | 'image-top' | 'horizontal'，默认 'text-top'
         */
        loadNoteTooltipLayout() {
            return this.get(C.NOTE_TOOLTIP_LAYOUT_KEY, 'text-top');
        },

        /**
         * 保存备注悬浮框布局偏好
         * @param {string} layout - 布局类型
         */
        saveNoteTooltipLayout(layout) {
            this.set(C.NOTE_TOOLTIP_LAYOUT_KEY, layout);
        },

        /**
         * 加载备注悬浮框位置和尺寸
         * @returns {Object} 包含 left、top、width、height 的对象
         */
        loadNoteTooltipPos() {
            return this.getJSON(C.NOTE_TOOLTIP_POS_KEY, {});
        },

        /**
         * 保存备注悬浮框位置和尺寸
         * @param {Object} pos - 包含 left、top、width、height 的对象
         */
        saveNoteTooltipPos(pos) {
            this.setJSON(C.NOTE_TOOLTIP_POS_KEY, pos);
        },

        // ==================== 右侧面板折叠状态 ====================

        /**
         * 加载右侧面板折叠状态
         * @returns {boolean} true 表示折叠，false 表示展开，默认 false
         */
        loadRightCollapsed() {
            return this.get(C.RIGHT_COLLAPSED_KEY, '0') === '1';
        },

        /**
         * 保存右侧面板折叠状态
         * @param {boolean} collapsed - true 折叠，false 展开
         *
         * 布尔值转换为字符串 '1' 或 '0' 存储。
         */
        saveRightCollapsed(collapsed) {
            this.set(C.RIGHT_COLLAPSED_KEY, collapsed ? '1' : '0');
        },

        // ==================== 当前数据集 ====================

        /**
         * 加载当前使用的数据集名称
         * @returns {string} 数据集名称，默认返回默认数据集键
         */
        loadCurrentDatasetKey() {
            return this.get(C.CURRENT_DATASET_KEY, C.DEFAULT_STORAGE_KEY);
        },

        /**
         * 保存当前使用的数据集名称
         * @param {string} key - 数据集名称
         */
        saveCurrentDatasetKey(key) {
            this.set(C.CURRENT_DATASET_KEY, key);
        }
    };

})(window.App = window.App || {});