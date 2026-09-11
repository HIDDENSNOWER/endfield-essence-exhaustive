/**
 * migration.js - 数据迁移框架
 * 挂载到 App.migration
 *
 * v0.9.7 新增：
 *   - 记录应用运行版本（smarttable_version）
 *   - 按版本号顺序执行迁移，保证旧数据可用
 *   - 迁移函数幂等（重复执行不破坏数据）
 *
 * 设计：
 *   - 版本比较使用 _lt(a, b)，仅比较 X.Y.Z 三段
 *   - 每个迁移函数对应一个历史版本引入的变更
 *   - 单步失败仅记录警告，不阻断启动
 *   - 首次运行（无版本记录）视为从未知旧版升级，执行全部迁移
 *
 * 新增迁移的流程：
 *   1. 在 CURRENT_VERSION 更新为目标版本
 *   2. 新增 _mXXX() 方法实现具体迁移逻辑
 *   3. 在 migrate() 中按版本顺序加入条件调用
 */
(function (App) {
    'use strict';

    /** 当前应用版本（与 package.json / version.json 保持同步） */
    const CURRENT_VERSION = '0.9.7';

    /** 版本记录存储键 */
    const VERSION_KEY = 'smarttable_version';

    App.migration = {
        /** 当前版本（只读引用） */
        CURRENT_VERSION,

        /**
         * 执行迁移
         * 幂等：若已是最新版本则直接返回
         * 由 main.js 在 init() 中调用
         */
        migrate() {
            const from = App.storage.get(VERSION_KEY, null);

            // 已是最新版本 → 跳过
            if (from === CURRENT_VERSION) return;

            // 首次运行（无记录）→ 视为 0.0.0，执行全部迁移
            const startVer = from || '0.0.0';
            console.log(`[Migration] ${startVer} → ${CURRENT_VERSION}`);

            // 按版本顺序执行迁移
            if (this._lt(startVer, '0.9.0')) this._safeRun('_m090', () => this._m090());
            if (this._lt(startVer, '0.9.2')) this._safeRun('_m092', () => this._m092());
            if (this._lt(startVer, '0.9.7')) this._safeRun('_m097', () => this._m097());

            // 记录当前版本
            App.storage.set(VERSION_KEY, CURRENT_VERSION);
        },

        /**
         * 安全执行迁移函数
         * 单步失败不阻断后续迁移与启动
         */
        _safeRun(label, fn) {
            try {
                fn();
            } catch (e) {
                console.warn(`[Migration] ${label} 失败：`, e);
            }
        },

        /**
         * 版本比较：a < b 返回 true
         * 支持 X.Y.Z 形式；缺失段按 0 处理
         */
        _lt(a, b) {
            const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
            const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
            for (let i = 0; i < 3; i++) {
                const va = pa[i] || 0;
                const vb = pb[i] || 0;
                if (va < vb) return true;
                if (va > vb) return false;
            }
            return false;
        },

        // ==================== 分版本迁移 ====================

        /**
         * 0.9.0 迁移：确保地区数据结构存在
         * - 未自定义时读取 DEFAULT_REGIONS（无需写入）
         * - 该版本仅为占位，未来如有新增存储键在此处理
         */
        _m090() {
            // 地区数据本身无需初始化——storage.getRegions() 会回退到 DEFAULT_REGIONS
            // 此函数为未来扩展保留钩子
        },

        /**
         * 0.9.2 迁移：确保未获取统计的地区筛选键存在
         * - 若键不存在，写入 null（= 全部选中）
         */
        _m092() {
            const key = App.constants.UNACQUIRED_REGION_FILTER_KEY;
            if (App.storage.get(key) === null) {
                App.storage.setJSON(key, null);
            }
        },

        /**
         * 0.9.7 迁移：当前无存储格式变更
         * - 此函数为未来扩展保留钩子
         * - 若 0.9.8+ 引入新的存储键，在此添加初始化逻辑
         */
        _m097() {
            // 无操作
        }
    };

})(window.App = window.App || {});