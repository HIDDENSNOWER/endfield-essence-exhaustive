/**
 * keyboard.js - 键盘快捷键系统
 * 挂载到 App.keyboard
 *
 * v0.9.6 新增：
 *   - Ctrl/Cmd + Z          → 撤回
 *   - Ctrl/Cmd + Shift + Z  → 重做
 *   - Ctrl/Cmd + Y          → 重做（Windows 习惯）
 *   - Escape                → 关闭最上层弹窗
 *
 * v0.9.15 新增：
 *   - 方向键（或自定义按键）在表格中移动单元格选择
 *   - 上下键跨表连续移动（第一部分 ↔ 第二部分，保持相对列位置）
 *   - 左右键仅在本部分内移动，不跨表
 *   - 设置弹窗「表格设置」中可自定义上下左右按键
 *   - 点击表格时自动释放之前的输入框焦点，使方向键能正确导航
 *
 * 规则：
 *   - 焦点在 input / textarea / contenteditable 内时，除 Escape 外不触发
 *   - select 元素也参与导航（拦截原生方向键行为）
 *   - 有弹窗打开时不触发导航
 */
(function (App) {
    'use strict';

    // ==================== 按键配置存储 ====================
    const NAV_KEYS_KEY = 'smarttable_cell_nav_keys';
    const DEFAULT_NAV_KEYS = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight'
    };

    /**
     * 读取当前导航按键配置
     * @returns {{up: string, down: string, left: string, right: string}}
     */
    function getNavKeys() {
        try {
            const raw = localStorage.getItem(NAV_KEYS_KEY);
            if (!raw) return { ...DEFAULT_NAV_KEYS };
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_NAV_KEYS, ...parsed };
        } catch (_e) {
            return { ...DEFAULT_NAV_KEYS };
        }
    }

    /**
     * 保存导航按键配置
     * @param {{up, down, left, right}} keys
     */
    function saveNavKeys(keys) {
        try {
            localStorage.setItem(NAV_KEYS_KEY, JSON.stringify(keys));
        } catch (_e) { /* 静默 */ }
    }

    /** 判断焦点元素是否为可编辑控件（input / textarea / contenteditable） */
    function isEditableTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    App.keyboard = {
        _bound: false,
        _navSettingsBound: false,

        /**
         * 初始化
         */
        init() {
            if (this._bound) return;
            this._bound = true;
            document.addEventListener('keydown', this._onKeydown.bind(this));
            this._bindTableBlurHandler();
            this.bindNavKeySettings();
        },

        /**
         * 点击表格时释放之前的输入框焦点（v0.9.15）
         * 使得方向键能正确触发导航
         */
        _bindTableBlurHandler() {
            const tableArea = App.dom && App.dom.tableArea;
            if (!tableArea) return;
            tableArea.addEventListener('mousedown', () => {
                const active = document.activeElement;
                if (!active || active === document.body) return;
                const tag = active.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                    active.blur();
                }
            });
        },

        /**
         * 键盘事件主处理器
         */
        _onKeydown(e) {
            // Escape：关闭最上层弹窗（不区分焦点）
            if (e.key === 'Escape') {
                const closed = this._closeTopModal();
                if (closed) {
                    e.preventDefault();
                    return;
                }
            }

            // 焦点在可编辑控件内时不触发（含输入框、文本域）
            if (isEditableTarget(e.target)) return;

            // 单元格导航（v0.9.15）
            if (this._handleCellNav(e)) {
                e.preventDefault();
                return;
            }

            // 其他快捷键：需要 Ctrl / Cmd
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            // Ctrl/Cmd + Z：撤回
            if (e.key === 'z' && !e.shiftKey) {
                if (App.history && App.history.undo) {
                    e.preventDefault();
                    App.history.undo();
                }
                return;
            }

            // Ctrl/Cmd + Shift + Z：重做
            if (e.key === 'z' && e.shiftKey) {
                if (App.history && App.history.redo) {
                    e.preventDefault();
                    App.history.redo();
                }
                return;
            }

            // Ctrl/Cmd + Y：重做
            if (e.key === 'y' && !e.shiftKey) {
                if (App.history && App.history.redo) {
                    e.preventDefault();
                    App.history.redo();
                }
                return;
            }
        },

        /**
         * 处理单元格导航按键（v0.9.15）
         * @param {KeyboardEvent} e
         * @returns {boolean} 是否消费了该按键
         */
        _handleCellNav(e) {
            // 有弹窗打开时，不拦截（避免与弹窗内的按键交互冲突）
            if (this._isAnyModalOpen()) return false;
            // 有 Ctrl / Cmd / Alt 修饰键时跳过（保留组合键）
            if (e.ctrlKey || e.metaKey || e.altKey) return false;

            const keys = getNavKeys();
            const key = e.key;
            let dir = null;
            if (key === keys.up) dir = 'up';
            else if (key === keys.down) dir = 'down';
            else if (key === keys.left) dir = 'left';
            else if (key === keys.right) dir = 'right';
            if (!dir) return false;

            return this.moveCellSelection(dir);
        },

        /**
         * 检查是否有弹窗处于打开状态
         */
        _isAnyModalOpen() {
            const overlays = document.querySelectorAll('.modal-overlay');
            for (let i = 0; i < overlays.length; i++) {
                if (overlays[i].style.display === 'flex') return true;
            }
            return false;
        },

        /**
         * 移动单元格选择
         *
         * v0.9.15：
         * - 上下键跨表连续（第一部分 ↔ 第二部分），保持相对列位置
         * - 左右键仅在本部分内移动，不跨表
         *
         * @param {'up'|'down'|'left'|'right'} direction
         * @returns {boolean} 是否消费了该按键
         */
        moveCellSelection(direction) {
            const panel = App.state.activePanel;
            if (panel !== 'input' && panel !== 'record') return false;

            const dom = App.dom;
            const subSel = panel === 'input' ? dom.inputSubCol : dom.recordSubCol;
            const rowSel = panel === 'input' ? dom.inputRow : dom.recordRow;
            const groupSel = panel === 'input' ? dom.inputGroup : dom.recordGroup;
            if (!subSel || !rowSel || !groupSel) return false;

            const C = App.constants;
            const totalCols = C.COLS1 + C.COLS2;

            const rowIdx = parseInt(rowSel.value, 10);
            const groupIdx = parseInt(groupSel.value, 10);
            const subIdx = parseInt(subSel.value, 10);
            if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return false;

            const colIdx = App.utils.getColumnIndex(groupIdx, subIdx);
            if (colIdx < 0) return false;

            let newRow = rowIdx;
            let newCol = colIdx;

            switch (direction) {
                case 'up': {
                    const visible = this._getVisibleRowIndices();
                    const curPos = visible.indexOf(rowIdx);
                    if (curPos === -1) return true;
                    if (curPos === 0) {
                        // 已在当前部分顶部 → 若在第二部分，跨到第一部分底部
                        if (colIdx >= C.COLS1) {
                            newRow = visible[visible.length - 1];
                            newCol = colIdx - C.COLS1;
                        } else {
                            return true; // 已在第一部分顶部
                        }
                    } else {
                        newRow = visible[curPos - 1];
                    }
                    break;
                }
                case 'down': {
                    const visible = this._getVisibleRowIndices();
                    const curPos = visible.indexOf(rowIdx);
                    if (curPos === -1) return true;
                    if (curPos === visible.length - 1) {
                        // 已在当前部分底部 → 若在第一部分，跨到第二部分顶部
                        if (colIdx < C.COLS1) {
                            newRow = visible[0];
                            newCol = colIdx + C.COLS1;
                        } else {
                            return true; // 已在第二部分底部
                        }
                    } else {
                        newRow = visible[curPos + 1];
                    }
                    break;
                }
                case 'left':
                    if (colIdx <= 0) return true;
                    // 不允许跨表向左（第二部分 → 第一部分）
                    if (colIdx === C.COLS1) return true;
                    newCol = colIdx - 1;
                    break;
                case 'right':
                    if (colIdx >= totalCols - 1) return true;
                    // 不允许跨表向右（第一部分 → 第二部分）
                    if (colIdx === C.COLS1 - 1) return true;
                    newCol = colIdx + 1;
                    break;
                default:
                    return false;
            }

            // 全局列索引 → 系列技能索引 + 能力值索引
            let offset = 0;
            let newGroup = -1;
            let newSub = -1;
            for (let gi = 0; gi < C.ALL_GROUPS.length; gi++) {
                const len = C.ALL_GROUPS[gi].sub.length;
                if (newCol < offset + len) {
                    newGroup = gi;
                    newSub = newCol - offset;
                    break;
                }
                offset += len;
            }
            if (newGroup === -1) return false;

            // 回写下拉框
            rowSel.value = newRow;
            groupSel.value = newGroup;
            if (panel === 'input') {
                App.utils.updateSubColOptions(newGroup);
            } else {
                App.utils.updateRecordSubColOptions(newGroup);
            }
            subSel.value = newSub;

            // 触发高亮更新（会加载备注到面板）
            App.tableRenderer.updateHighlightedCell();

            // 滚动到视图内（跨表时也会滚动到目标表格）
            this._scrollCellIntoView(newRow, newCol);

            return true;
        },

        /**
         * 获取当前可见行在 state.rows 中的索引数组（行筛选后）
         */
        _getVisibleRowIndices() {
            const selected = new Set(App.state.selectedRows);
            const indices = [];
            App.state.rows.forEach((row, idx) => {
                if (selected.has(row.name)) indices.push(idx);
            });
            return indices;
        },

        /**
         * 把单元格滚动到视图内
         */
        _scrollCellIntoView(rowIdx, colIdx) {
            const td = document.querySelector(
                `td[data-rowindex="${rowIdx}"][data-colindex="${colIdx}"]`
            );
            if (td) {
                td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        },

        /**
         * 绑定设置弹窗中的导航按键捕获输入框（v0.9.15）
         */
        bindNavKeySettings() {
            if (this._navSettingsBound) return;

            const inputs = ['up', 'down', 'left', 'right']
                .map(dir => document.querySelector(`.key-capture-input[data-dir="${dir}"]`))
                .filter(Boolean);
            if (inputs.length === 0) return;
            this._navSettingsBound = true;

            const refresh = () => {
                const keys = getNavKeys();
                inputs.forEach(inp => {
                    inp.value = this._formatKeyName(keys[inp.dataset.dir]);
                });
            };
            refresh();

            inputs.forEach(inp => {
                inp.addEventListener('keydown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.key === 'Escape') { inp.blur(); return; }
                    if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock'].includes(e.key)) return;
                    const dir = inp.dataset.dir;
                    const keys = getNavKeys();
                    keys[dir] = e.key;
                    saveNavKeys(keys);
                    inp.value = this._formatKeyName(e.key);
                    inp.blur();
                });
                inp.addEventListener('focus', () => {
                    inp.value = '按下按键...';
                });
                inp.addEventListener('blur', () => {
                    refresh();
                });
            });

            const resetBtn = document.getElementById('btnResetNavKeys');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    saveNavKeys({ ...DEFAULT_NAV_KEYS });
                    refresh();
                });
            }
        },

        /**
         * 按键名称的显示格式化
         */
        _formatKeyName(key) {
            if (!key) return '';
            const map = {
                'ArrowUp': '↑ 上',
                'ArrowDown': '↓ 下',
                'ArrowLeft': '← 左',
                'ArrowRight': '→ 右',
                ' ': 'Space',
                'Enter': 'Enter',
                'Tab': 'Tab',
                'Escape': 'Esc'
            };
            return map[key] || key;
        },

        /**
         * 关闭最上层弹窗（由 modal.js 提供 closeTopModal）
         * @returns {boolean} 是否成功关闭
         */
        _closeTopModal() {
            if (!App.modal || !App.modal.closeTopModal) return false;
            return App.modal.closeTopModal();
        },

        // ==================== 对外暴露（供其他模块使用） ====================
        getNavKeys,
        saveNavKeys,
        DEFAULT_NAV_KEYS
    };

})(window.App = window.App || {});