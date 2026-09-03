/**
 * constants.js - 全局常量定义
 * 挂载到 App.constants
 *
 * 本文件集中定义整个应用使用的常量，包括：
 * - localStorage 存储键名
 * - 词条组、副属性、行名等数据结构
 * - 颜色变量映射、默认颜色
 * - 表格尺寸默认值与限制
 * - 其他固定文案（备注、示例数据集名称等）
 *
 * 所有模块通过 App.constants 访问这些常量，避免硬编码，提高可维护性。
 */
(function (App) {
    'use strict';

    App.constants = {
        // ==================== localStorage 存储键 ====================
        STORAGE_KEY_THEME: 'smarttable_theme',              // 主题偏好（'light' 或 'dark'）
        DEFAULT_STORAGE_KEY: '默认数据集',                  // 默认数据集的存储键，也作为默认名称
        DATASET_LIST_KEY: 'smarttable_dataset_list',        // 所有数据集名称列表
        PROTECTED_DATASETS: ['默认数据集', '数据示例-表格样式参考'], // 受保护数据集，不可删除或清空
        REMARKS_STORAGE_KEY: 'smarttable_dataset_remarks',  // 各数据集的备注内容（对象，键为数据集名）
        TABLE_BG_STORAGE_KEY: 'smarttable_table_bg',        // 表格奇偶行背景色（按主题存储）
        STYLE_STORAGE_KEY: 'smarttable_style',              // 表格列宽与行高设置
        USER_COLORS_STORAGE_KEY: 'smarttable_user_colors',  // 用户自定义的四种状态颜色（按主题存储）
        CURRENT_DATASET_KEY: 'smarttable_current_dataset',  // 当前选中的数据集名称
        NOTE_TOOLTIP_LAYOUT_KEY: 'smarttable_note_layout',  // 备注悬浮框布局偏好（text-top / image-top / horizontal）
        NOTE_TOOLTIP_POS_KEY: 'smarttable_note_tooltip_pos',// 备注悬浮框位置与尺寸
        RIGHT_COLLAPSED_KEY: 'smarttable_right_collapsed',  // 右侧面板是否折叠（'0' 展开，'1' 折叠）

        // ==================== 词条组与行列定义 ====================
        // 所有词条组，每个组包含名称和其下的副属性列表
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
        // 行名（提升项），共12行
        ROW_NAMES: [
            '攻击提升', '生命提升', '暴击率提升', '物理伤害提升', '灼热伤害提升',
            '法术伤害提升', '自然伤害提升', '电磁伤害提升', '寒冷伤害提升',
            '源石技艺提升', '治疗效率提升', '终结技效率提升'
        ],

        // ==================== 颜色相关 ====================
        // 四种状态的 CSS 变量名映射
        COLOR_VARS: {
            hasValue: '--has-value-bg',           // 已有数值背景变量
            statusNone: '--status-none-bg',       // 未获取背景变量
            statusPartial: '--status-partial-bg', // 部分获取背景变量
            statusFull: '--status-full-bg'        // 全部获取背景变量
        },
        // 四种状态类型列表（顺序固定）
        STATUS_TYPES: ['hasValue', 'statusNone', 'statusPartial', 'statusFull'],
        // 颜色预览面板中数量输入框的 DOM ID
        COUNT_IDS: {
            hasValue: 'previewCountHasValue',
            statusNone: 'previewCountStatusNone',
            statusPartial: 'previewCountStatusPartial',
            statusFull: 'previewCountStatusFull'
        },
        // 各状态在亮色/暗色主题下的默认颜色
        DEFAULT_COLORS: {
            light: {
                hasValue: '#c8e6c9',
                statusNone: '#cfd8dc',
                statusPartial: '#ffe0b2',
                statusFull: '#a5d6a7'
            },
            dark: {
                hasValue: '#2a4a35',
                statusNone: '#3a3f47',
                statusPartial: '#5a4a28',
                statusFull: '#2e5a3b'
            }
        },

        // ==================== 固定文案 ====================
        // 默认数据集的固定备注
        DEFAULT_REMARK: "1-26.07.16 “向渊行”版本完整实装基质列表\n2-“用户新建数据集默认模板”",
        // 示例数据集名称
        SAMPLE_DATASET_KEY: '数据示例-表格样式参考',
        // 示例数据集的固定备注
        SAMPLE_REMARK: "1-数据表单元格 数据填充状态预览\n2-每次重新进入时随机刷新填充效果，仅供效果参考",

        // ==================== 表格尺寸 ====================
        DEFAULT_COL_WIDTH: 36,    // 默认列宽（像素）
        DEFAULT_ROW_HEIGHT: 24,   // 默认行高（像素）
        MIN_COL_WIDTH: 30,        // 列宽最小值
        MAX_COL_WIDTH: 60,        // 列宽最大值
        MIN_ROW_HEIGHT: 20,       // 行高最小值
        MAX_ROW_HEIGHT: 40,       // 行高最大值

        // 颜色预览表格总单元格数（12行 × 10列）
        TOTAL_CELLS: 120,

        // ==================== 界面颜色个性化 ====================
        INTERFACE_COLOR_GROUPS: [
            {
                name: '导航栏与面板背景',
                vars: {
                    '--bg-primary': '导航栏/面板背景',
                    '--bg-secondary': '页面主体背景',
                    '--bg-tertiary': '表头/提升项背景',
                    '--bg-hover': '悬停高亮背景',
                    '--input-bg': '输入框背景',
                    '--modal-input-bg': '弹窗输入框背景'
                }
            },
            {
                name: '文字颜色',
                vars: {
                    '--text-primary': '主要文字',
                    '--text-secondary': '次要文字',
                    '--text-tertiary': '弱化文字/占位符',
                    '--text-cell': '单元格文字'
                }
            },
            {
                name: '边框颜色',
                vars: {
                    '--border-default': '普通边框',
                    '--border-muted': '柔和边框（表格线）',
                    '--border-emphasis': '强调边框（分组分隔）'
                }
            },
            {
                name: '功能颜色',
                vars: {
                    '--accent-primary': '主色调（应用/确认按钮）',
                    '--danger-primary': '危险色（删除/错误文字）',
                    '--danger-bg': '危险背景色',
                    '--success-primary': '成功色（成功按钮）'
                }
            },
            {
                name: '表头背景',
                vars: {
                    '--group-header-even-bg': '表头偶数单元格背景',
                    '--group-header-odd-bg': '表头奇数单元格背景'
                }
            },
            {
                name: '表格行背景',
                vars: {
                    '--group-even-bg': '数据区偶数行背景',
                    '--group-odd-bg': '数据区奇数行背景'
                }
            },
            {
                name: '滚动条',
                vars: {
                    '--scrollbar-thumb': '滚动条滑块颜色'
                }
            }
        ],

        DEFAULT_INTERFACE_COLORS_LIGHT: {
            '--bg-primary': '#f5f7fa',
            '--bg-secondary': '#eef1f5',
            '--bg-tertiary': '#e2e6ec',
            '--bg-hover': '#dde2e8',
            '--input-bg': '#ffffff',
            '--text-primary': '#1f2328',
            '--text-secondary': '#57606a',
            '--text-tertiary': '#8b949e',
            '--text-cell': '#1f2328',
            '--border-default': '#afb8c1',
            '--border-muted': '#c0c7ce',
            '--border-emphasis': '#8b949e',
            '--accent-primary': '#0969da',
            '--danger-primary': '#d1242f',
            '--danger-bg': '#fff1f0',
            '--success-primary': '#1a7f37',
            '--group-header-even-bg': '#dce4ed',
            '--group-header-odd-bg': '#e9edf2',
            '--scrollbar-thumb': '#c1c7cd',
            '--modal-input-bg': '#ffffff',
            '--group-even-bg': '#eaf0f6',
            '--group-odd-bg': '#f8fafc',
        },

        DEFAULT_INTERFACE_COLORS_DARK: {
            '--bg-primary': '#0d1117',
            '--bg-secondary': '#161b22',
            '--bg-tertiary': '#1c2128',
            '--bg-hover': '#1f2428',
            '--input-bg': '#1c2128',
            '--text-primary': '#e6edf3',
            '--text-secondary': '#8b949e',
            '--text-tertiary': '#6e7681',
            '--text-cell': '#e6edf3',
            '--border-default': '#484f58',
            '--border-muted': '#343a42',
            '--border-emphasis': '#6e7681',
            '--accent-primary': '#58a6ff',
            '--danger-primary': '#f85149',
            '--danger-bg': '#490202',
            '--success-primary': '#3fb950',
            '--group-header-even-bg': '#1f2c3d',
            '--group-header-odd-bg': '#17202b',
            '--scrollbar-thumb': '#484f58',
            '--modal-input-bg': '#0a0e14',
            '--group-even-bg': '#1b2636',
            '--group-odd-bg': '#0f1722',

        },

        INTERFACE_COLORS_STORAGE_KEY: 'smarttable_interface_colors'

    };

    // ==================== 分组与列数 ====================
    // 第一部分：前7个词条组（强攻 ~ 残暴）
    App.constants.GROUP1 = App.constants.ALL_GROUPS.slice(0, 7);
    // 第二部分：后7个词条组（附术 ~ 效益）
    App.constants.GROUP2 = App.constants.ALL_GROUPS.slice(7);
    // 第一部分总列数（7组 × 5属性 = 35列）
    App.constants.COLS1 = App.constants.GROUP1.reduce((s, g) => s + g.sub.length, 0);
    // 第二部分总列数（7组 × 5属性 = 35列）
    App.constants.COLS2 = App.constants.GROUP2.reduce((s, g) => s + g.sub.length, 0);

})(window.App = window.App || {});