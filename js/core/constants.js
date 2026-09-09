/**
 * constants.js - 全局常量定义
 * 挂载到 App.constants
 *
 * 本文件集中定义整个应用使用的所有常量，包括：
 * - localStorage 存储键名（数据集、设置、个性化、配额等）
 * - 词条组、副属性、行名等核心数据结构
 * - 颜色变量映射与默认颜色（状态颜色、界面颜色）
 * - 表格尺寸默认值与限制
 * - 固定文案（默认备注、示例数据集名称等）
 *
 * 设计原则：
 * - 所有魔法字符串和数字均在此定义，其他模块通过 App.constants 引用
 * - 避免硬编码散落在各业务模块中，提高可维护性
 * - 新增常量时必须添加注释说明用途和数据类型
 */
(function (App) {
    'use strict';

    App.constants = {
        // =========================================================================
        // 一、localStorage 存储键
        // 用途：标识 localStorage 中保存的各类型数据
        // 注意：数据集名称不可使用 smarttable_ 前缀，防止与这些系统键冲突
        // =========================================================================

        STORAGE_KEY_THEME: 'smarttable_theme',              // 主题偏好（'light' 或 'dark'），仅用户显式切换后存在
        DEFAULT_STORAGE_KEY: '默认数据集',                  // 默认数据集的存储键，同时作为默认数据集名称
        DATASET_LIST_KEY: 'smarttable_dataset_list',        // 所有数据集名称的数组（JSON 格式）
        PROTECTED_DATASETS: ['默认数据集', '数据示例-表格样式参考'], // 受保护数据集，不可删除、清空或重命名
        REMARKS_STORAGE_KEY: 'smarttable_dataset_remarks',  // 各数据集备注对象（键为数据集名，值为备注字符串）
        TABLE_BG_STORAGE_KEY: 'smarttable_table_bg',        // 表格奇偶行背景色（按 light/dark 主题分别存储）
        STYLE_STORAGE_KEY: 'smarttable_style',              // 表格列宽与行高设置（JSON：{colWidth, rowHeight}）
        USER_COLORS_STORAGE_KEY: 'smarttable_user_colors',  // 用户自定义的四种状态颜色（按主题存储）
        CURRENT_DATASET_KEY: 'smarttable_current_dataset',  // 当前选中的数据集名称
        NOTE_TOOLTIP_LAYOUT_KEY: 'smarttable_note_layout',  // 备注悬浮框布局偏好（text-top / image-top / horizontal）
        NOTE_TOOLTIP_POS_KEY: 'smarttable_note_tooltip_pos',// 备注悬浮框位置与尺寸（JSON：{left, top, width, height}）
        RIGHT_COLLAPSED_KEY: 'smarttable_right_collapsed',  // 右侧面板是否折叠（'0' 展开，'1' 折叠）
        INTERFACE_COLORS_STORAGE_KEY: 'smarttable_interface_colors', // 界面颜色自定义（按 light/dark 主题存储）

        // =========================================================================
        // 二、词条组与行列定义
        // 数据表结构：14 个词条组 × 5 个副属性 = 70 列，12 个提升项（行）
        // =========================================================================

        // 所有词条组，每个组包含名称和其下的副属性列表
        // 副属性固定为 5 个：敏捷、力量、意志、智识、主能力
        ALL_GROUPS: [
            { name: '强攻', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '压制', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '追袭', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '粉碎', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '昂扬', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '巧技', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '残暴', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '附术', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '医疗', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '切骨', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '迸发', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '夜幕', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '流转', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '效益', sub: ['敏捷', '力量', '意志', '智识', '主能力'] }
        ],

        // 行名（提升项），共 12 行，与表格第一列一一对应
        ROW_NAMES: [
            '攻击提升',
            '生命提升',
            '暴击率提升',
            '物理伤害提升',
            '灼热伤害提升',
            '法术伤害提升',
            '自然伤害提升',
            '电磁伤害提升',
            '寒冷伤害提升',
            '源石技艺提升',
            '治疗效率提升',
            '终结技效率提升'
        ],

        // =========================================================================
        // 三、状态颜色相关（单元格四色）
        // 四种状态：已拥有、未获取、部分获取、全部获取
        // =========================================================================

        // 四种状态对应的 CSS 变量名
        COLOR_VARS: {
            hasValue: '--has-value-bg',           // 已有数值背景变量
            statusNone: '--status-none-bg',       // 未获取背景变量
            statusPartial: '--status-partial-bg', // 部分获取背景变量
            statusFull: '--status-full-bg'        // 全部获取背景变量
        },

        // 四种状态类型列表（顺序固定，遍历时使用）
        STATUS_TYPES: ['hasValue', 'statusNone', 'statusPartial', 'statusFull'],

        // 颜色预览面板中各状态数量输入框的 DOM ID
        COUNT_IDS: {
            hasValue: 'previewCountHasValue',
            statusNone: 'previewCountStatusNone',
            statusPartial: 'previewCountStatusPartial',
            statusFull: 'previewCountStatusFull'
        },

        // 各状态在亮色/暗色主题下的默认颜色
        DEFAULT_COLORS: {
            light: {
                hasValue: '#c8e6c9',            // 已拥有（亮色）
                statusNone: '#cfd8dc',          // 未获取（亮色）
                statusPartial: '#ffe0b2',       // 部分获取（亮色）
                statusFull: '#a5d6a7'           // 全部获取（亮色）
            },
            dark: {
                hasValue: '#2a4a35',            // 已拥有（暗色）
                statusNone: '#3a3f47',          // 未获取（暗色）
                statusPartial: '#5a4a28',       // 部分获取（暗色）
                statusFull: '#2e5a3b'           // 全部获取（暗色）
            }
        },

        // =========================================================================
        // 四、界面颜色个性化
        // 所有可通过设置面板自定义的界面颜色变量，按功能分组展示
        // 每组包含变量名与中文标签
        // =========================================================================

        INTERFACE_COLOR_GROUPS: [
            {
                // 导航栏与面板背景
                name: '导航栏与面板背景',
                vars: {
                    '--bg-primary': '导航栏/面板背景',       // 导航栏、面板、弹窗主背景
                    '--bg-secondary': '页面主体背景',       // 表格周围大面积背景
                    '--bg-tertiary': '表头/提升项背景',     // 表头角标、提升项列
                    '--bg-hover': '悬停高亮背景',           // 鼠标悬停时的高亮色
                    '--input-bg': '输入框背景',             // 普通输入框背景
                    '--modal-input-bg': '弹窗输入框背景'    // 弹窗内的输入框背景（暗色下更暗）
                }
            },
            {
                // 文字颜色
                name: '文字颜色',
                vars: {
                    '--text-primary': '主要文字',            // 标题、正文等主要内容
                    '--text-secondary': '次要文字',          // 标签、描述文字
                    '--text-tertiary': '弱化文字/占位符',    // 提示、占位符等弱化文字
                    '--text-cell': '单元格文字'              // 表格单元格内的数字与文本
                }
            },
            {
                // 边框颜色
                name: '边框颜色',
                vars: {
                    '--border-default': '普通边框',          // 按钮、输入框等默认边框
                    '--border-muted': '柔和边框（表格线）',  // 表格内部线、分隔线
                    '--border-emphasis': '强调边框（分组分隔）' // 词条组之间的粗分隔线
                }
            },
            {
                // 功能颜色
                name: '功能颜色',
                vars: {
                    '--accent-primary': '主色调（应用/确认按钮）', // 应用、确认等主要按钮
                    '--danger-primary': '危险色（删除/错误文字）', // 删除按钮、错误提示
                    '--danger-bg': '危险背景色',             // 危险按钮悬停背景
                    '--success-primary': '成功色（成功按钮）' // 成功提示、正向操作
                }
            },
            {
                // 表头背景
                name: '表头背景',
                vars: {
                    '--group-header-even-bg': '表头偶数单元格背景', // 表头中偶数词条组的背景
                    '--group-header-odd-bg': '表头奇数单元格背景'   // 表头中奇数词条组的背景
                }
            },
            {
                // 表格行背景
                name: '表格行背景',
                vars: {
                    '--group-even-bg': '数据区偶数行背景',   // 数据区偶数行背景色
                    '--group-odd-bg': '数据区奇数行背景'     // 数据区奇数行背景色
                }
            },
            {
                // 滚动条
                name: '滚动条',
                vars: {
                    '--scrollbar-thumb': '滚动条滑块颜色'    // 浏览器滚动条滑块颜色
                }
            }
        ],

        // =========================================================================
        // 界面颜色默认值（亮色主题）
        // -------------------------------------------------------------------------
        // 用途：
        //   - 定义亮色主题下所有可自定义界面颜色变量的默认值
        //   - 与 css/base.css 中 :root 选择器内的 CSS 变量保持一致
        //   - 用于：
        //     · 初始化界面颜色面板时填充默认颜色
        //     · “恢复系统默认”时使用
        //     · 方案管理中内置的“白天默认方案”
        //     · 当 localStorage 中无用户自定义颜色时，作为回退值
        //
        // 注意：
        //   - 变量名必须与 INTERFACE_COLOR_GROUPS 中定义的变量名完全一致
        //   - 如果修改了 base.css 中的默认颜色，必须同步修改此处，否则预览
        //     或重置功能会出现偏差
        // =========================================================================
        DEFAULT_INTERFACE_COLORS_LIGHT: {
            '--bg-primary': '#f5f7fa',                 // 导航栏/面板背景
            '--bg-secondary': '#eef1f5',               // 页面主体背景
            '--bg-tertiary': '#e2e6ec',                // 表头/提升项背景
            '--bg-hover': '#dde2e8',                   // 悬停高亮背景
            '--input-bg': '#ffffff',                   // 输入框背景
            '--text-primary': '#1f2328',               // 主要文字
            '--text-secondary': '#57606a',             // 次要文字
            '--text-tertiary': '#8b949e',              // 弱化文字/占位符
            '--text-cell': '#1f2328',                  // 单元格文字
            '--border-default': '#afb8c1',             // 普通边框
            '--border-muted': '#c0c7ce',               // 柔和边框（表格线）
            '--border-emphasis': '#8b949e',            // 强调边框（分组分隔）
            '--accent-primary': '#0969da',             // 主色调（应用/确认按钮）
            '--danger-primary': '#d1242f',             // 危险色（删除/错误文字）
            '--danger-bg': '#fff1f0',                  // 危险背景色
            '--success-primary': '#1a7f37',            // 成功色（成功按钮）
            '--group-header-even-bg': '#dce4ed',       // 表头偶数单元格背景
            '--group-header-odd-bg': '#e9edf2',        // 表头奇数单元格背景
            '--scrollbar-thumb': '#c1c7cd',            // 滚动条滑块颜色
            '--modal-input-bg': '#ffffff',             // 弹窗输入框背景
            '--group-even-bg': '#eaf0f6',              // 数据区偶数行背景
            '--group-odd-bg': '#f8fafc'                // 数据区奇数行背景
        },

        // =========================================================================
        // 界面颜色默认值（暗色主题）
        // -------------------------------------------------------------------------
        // 用途：
        //   - 定义暗色主题下所有可自定义界面颜色变量的默认值
        //   - 与 css/base.css 中 [data-theme="dark"] 选择器内的 CSS 变量保持一致
        //   - 用于：
        //     · 暗色模式下初始化界面颜色面板
        //     · “恢复系统默认”时使用
        //     · 方案管理中内置的“黑夜默认方案”
        //     · 当 localStorage 中无用户自定义颜色时，作为回退值
        //
        // 注意：
        //   - 变量名必须与 INTERFACE_COLOR_GROUPS 中定义的变量名完全一致
        //   - 如果修改了 base.css 中的暗色主题默认颜色，必须同步修改此处
        // =========================================================================
        DEFAULT_INTERFACE_COLORS_DARK: {
            '--bg-primary': '#0d1117',                 // 导航栏/面板背景（暗色）
            '--bg-secondary': '#161b22',               // 页面主体背景（暗色）
            '--bg-tertiary': '#1c2128',                // 表头/提升项背景（暗色）
            '--bg-hover': '#1f2428',                   // 悬停高亮背景（暗色）
            '--input-bg': '#1c2128',                   // 输入框背景（暗色）
            '--text-primary': '#e6edf3',               // 主要文字（暗色）
            '--text-secondary': '#8b949e',             // 次要文字（暗色）
            '--text-tertiary': '#6e7681',              // 弱化文字/占位符（暗色）
            '--text-cell': '#e6edf3',                  // 单元格文字（暗色）
            '--border-default': '#484f58',             // 普通边框（暗色）
            '--border-muted': '#343a42',               // 柔和边框（暗色）
            '--border-emphasis': '#6e7681',            // 强调边框（暗色）
            '--accent-primary': '#58a6ff',             // 主色调（暗色）
            '--danger-primary': '#f85149',             // 危险色（暗色）
            '--danger-bg': '#490202',                  // 危险背景色（暗色）
            '--success-primary': '#3fb950',            // 成功色（暗色）
            '--group-header-even-bg': '#1f2c3d',       // 表头偶数单元格背景（暗色）
            '--group-header-odd-bg': '#17202b',        // 表头奇数单元格背景（暗色）
            '--scrollbar-thumb': '#484f58',            // 滚动条滑块颜色（暗色）
            '--modal-input-bg': '#0a0e14',             // 弹窗输入框背景（暗色更暗）
            '--group-even-bg': '#1b2636',              // 数据区偶数行背景（暗色）
            '--group-odd-bg': '#0f1722'                // 数据区奇数行背景（暗色）
        },

        // =========================================================================
        // 五、固定文案
        // =========================================================================

        // 默认数据集的固定备注（不可编辑）
        DEFAULT_REMARK: "1-26.09.02 “雪凇幽梦”版本完整实装基质列表（待完善数据）\n2-“用户新建数据集默认模板”",

        // 示例数据集名称
        SAMPLE_DATASET_KEY: '数据示例-表格样式参考',

        // 示例数据集的固定备注（不可编辑）
        SAMPLE_REMARK: "1-数据表单元格 数据填充状态预览\n2-每次重新进入时随机刷新填充效果，仅供效果参考",

        // =========================================================================
        // 六、表格尺寸
        // =========================================================================

        DEFAULT_COL_WIDTH: 36,    // 默认列宽（像素）
        DEFAULT_ROW_HEIGHT: 24,   // 默认行高（像素）
        MIN_COL_WIDTH: 30,        // 列宽最小值
        MAX_COL_WIDTH: 60,        // 列宽最大值
        MIN_ROW_HEIGHT: 20,       // 行高最小值
        MAX_ROW_HEIGHT: 40,       // 行高最大值

        // 颜色预览表格总单元格数（12 行 × 10 列，仅预览前两个词条组）
        TOTAL_CELLS: 120
    };

    // =========================================================================
    // 派生常量：分组与列数
    // 由 ALL_GROUPS 自动计算，避免硬编码
    // =========================================================================

    // 第一部分：前 7 个词条组（强攻 ~ 残暴）
    App.constants.GROUP1 = App.constants.ALL_GROUPS.slice(0, 7);

    // 第二部分：后 7 个词条组（附术 ~ 效益）
    App.constants.GROUP2 = App.constants.ALL_GROUPS.slice(7);

    // 第一部分总列数（7 组 × 5 属性 = 35 列）
    App.constants.COLS1 = App.constants.GROUP1.reduce((s, g) => s + g.sub.length, 0);

    // 第二部分总列数（7 组 × 5 属性 = 35 列）
    App.constants.COLS2 = App.constants.GROUP2.reduce((s, g) => s + g.sub.length, 0);

})(window.App = window.App || {});