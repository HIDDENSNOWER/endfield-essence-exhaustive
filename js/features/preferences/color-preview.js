/**
 * color-preview.js - 颜色预览与编辑
 * 挂载到 App.colorPreview
 *
 * 本模块负责设置弹窗中的颜色预览与编辑功能，包括：
 * - 渲染一个 12行×10列 的预览表格，随机填充四种状态和空单元格
 * - 允许用户调节各状态的数量，实时更新预览
 * - 提供颜色编辑器，支持 HEX、RGB、RGBA、CMYK、HSLA 五种格式
 * - 修改颜色后实时更新预览表格中对应状态的单元格背景色
 * - 支持撤销当前颜色、撤销全部修改、重置为默认颜色、应用颜色
 *
 * 模块内部维护：
 * - tempColors：临时颜色状态，编辑中的颜色值
 * - initialColors：进入设置时从全局 CSS 变量读取的初始颜色
 * - currentEditState：当前正在编辑的状态类型（hasValue/statusNone/statusPartial/statusFull）
 *
 * 颜色应用后保存到 localStorage，并立即应用到主表格。
 */
(function (App) {
    'use strict';

    // 获取常量引用，简化后续代码
    const C = App.constants;
    const TOTAL_CELLS = C.TOTAL_CELLS;          // 预览表格总单元格数（120）
    const STATUS_TYPES = C.STATUS_TYPES;        // 四种状态类型
    const COUNT_IDS = C.COUNT_IDS;              // 数量输入框的 DOM ID 映射
    const COLOR_VARS = C.COLOR_VARS;            // 状态颜色 CSS 变量名映射

    // 模块内部状态
    let tempColors = {};            // 当前编辑的颜色（状态 -> 十六进制颜色值）
    let initialColors = {};         // 初始颜色（进入设置时的颜色）
    let currentEditState = 'hasValue'; // 当前编辑的状态类型

    App.colorPreview = {
        /**
         * 获取全局 CSS 变量颜色
         * @param {string} type - 状态类型（hasValue/statusNone/statusPartial/statusFull）
         * @returns {string} 颜色值（如 "#c8e6c9"）
         *
         * 从文档根元素的计算样式中读取对应状态的颜色变量值。
         */
        getGlobalColor(type) {
            return getComputedStyle(document.documentElement).getPropertyValue(COLOR_VARS[type]).trim() || '#ffffff';
        },

        /**
         * 获取单元格文本颜色
         * @returns {string} 文本颜色值
         *
         * 读取全局 CSS 变量 --text-cell 的值，用于预览表格中的文字颜色。
         */
        getTextColor() {
            return getComputedStyle(document.documentElement).getPropertyValue('--text-cell').trim() || '#1f2328';
        },

        /**
         * 生成随机单元格文本
         * @param {string} status - 单元格状态类型
         * @returns {string} 显示在单元格中的文本
         *
         * 根据不同状态生成对应格式的文本：
         * - preview-empty：破折号
         * - hasValue：三位随机数字（每位数1~9）
         * - statusNone：格式 (0/总数)
         * - statusPartial：格式 (已获取数/总数)
         * - statusFull：格式 (总数/总数)
         */
        generateCellText(status) {
            if (status === 'preview-empty') return '—';
            if (status === 'hasValue') {
                return `${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}`;
            }
            const total = Math.floor(Math.random() * 3) + 1; // 随机总数 1~3
            if (status === 'statusNone') return `(0/${total})`;
            if (status === 'statusPartial') return `(${Math.floor(Math.random() * (total - 1)) + 1}/${total})`;
            if (status === 'statusFull') return `(${total}/${total})`;
            return '';
        },

        /**
         * 渲染预览表格
         *
         * 根据各状态的数量输入框的值，构建 12×10 的预览表格。
         * 单元格状态随机分布，应用临时颜色作为背景。
         * 如果总数超过 120，按比例缩减并重新分配。
         */
        renderPreviewTable() {
            const container = document.getElementById('colorPreviewMain');
            if (!container) return;
            container.innerHTML = ''; // 清空现有内容

            // 读取各状态数量
            const counts = {};
            for (const type of STATUS_TYPES) {
                const inp = document.getElementById(COUNT_IDS[type]);
                counts[type] = inp ? Math.max(0, parseInt(inp.value) || 0) : 0;
            }

            // 如果总数超过 TOTAL_CELLS，按比例缩减
            let sum = Object.values(counts).reduce((a, b) => a + b, 0);
            if (sum > TOTAL_CELLS) {
                for (const type of STATUS_TYPES) {
                    counts[type] = Math.floor(counts[type] * TOTAL_CELLS / sum);
                }
                // 处理舍入误差，按顺序补足差额
                let diff = TOTAL_CELLS - Object.values(counts).reduce((a, b) => a + b, 0);
                for (let i = 0; diff > 0; i = (i + 1) % STATUS_TYPES.length) {
                    counts[STATUS_TYPES[i]]++;
                    diff--;
                }
                // 将调整后的数量写回输入框
                for (const type of STATUS_TYPES) {
                    document.getElementById(COUNT_IDS[type]).value = counts[type];
                }
            }

            // 计算剩余空格数量
            const remaining = TOTAL_CELLS - Object.values(counts).reduce((a, b) => a + b, 0);

            // 构建单元格状态数组，然后随机打乱
            const cellTypes = [];
            for (const type of STATUS_TYPES) {
                for (let i = 0; i < counts[type]; i++) cellTypes.push(type);
            }
            for (let i = 0; i < remaining; i++) cellTypes.push('preview-empty');
            App.utils.shuffle(cellTypes);

            // 预览表格使用两个固定词条组（强攻、压制）
            const groups = [
                { name: '强攻', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
                { name: '压制', sub: ['敏捷', '力量', '意志', '智识', '主能力'] }
            ];
            const rowNames = C.ROW_NAMES.slice(0, 12);
            const textColor = this.getTextColor();

            // 创建表格
            const table = document.createElement('table');
            const thead = document.createElement('thead');

            // 表头第一行：角标 + 组名
            const tr1 = document.createElement('tr');
            const corner = document.createElement('th');
            corner.rowSpan = 2;
            corner.textContent = '提升项';
            tr1.appendChild(corner);
            groups.forEach((g, idx) => {
                const th = document.createElement('th');
                th.colSpan = g.sub.length;
                th.className = `group-header ${idx % 2 === 0 ? 'group-header-even' : 'group-header-odd'}`;
                if (idx < groups.length - 1) th.classList.add('border-group-right');
                th.textContent = g.name;
                tr1.appendChild(th);
            });
            thead.appendChild(tr1);

            // 表头第二行：副属性名
            const tr2 = document.createElement('tr');
            groups.forEach((g, gIdx) => {
                g.sub.forEach((sub, sIdx) => {
                    const th = document.createElement('th');
                    th.className = gIdx % 2 === 0 ? 'group-even' : 'group-odd';
                    if (sIdx === g.sub.length - 1 && gIdx < groups.length - 1) th.classList.add('border-group-right');
                    th.textContent = sub;
                    tr2.appendChild(th);
                });
            });
            thead.appendChild(tr2);
            table.appendChild(thead);

            // 表体：12行，每行10个数据单元格
            const tbody = document.createElement('tbody');
            for (let r = 0; r < 12; r++) {
                const tr = document.createElement('tr');
                const tdName = document.createElement('td');
                tdName.textContent = rowNames[r];
                tdName.style.color = textColor;
                tdName.style.fontSize = '0.72rem';
                tr.appendChild(tdName);

                groups.forEach((g, gIdx) => {
                    g.sub.forEach((sub, sIdx) => {
                        const cellIndex = r * 10 + (gIdx * 5 + sIdx);
                        const status = cellTypes[cellIndex] || 'preview-empty';
                        const text = this.generateCellText(status);
                        const td = document.createElement('td');

                        // 设置状态类
                        td.className = status;
                        td.classList.add(gIdx % 2 === 0 ? 'group-even' : 'group-odd');
                        if (sIdx === g.sub.length - 1 && gIdx < groups.length - 1) td.classList.add('border-group-right');
                        if (status === 'preview-empty') td.classList.add('empty-value');

                        // 设置样式
                        td.style.textAlign = 'center';
                        td.style.verticalAlign = 'middle';
                        td.style.fontSize = '0.72rem';
                        td.style.color = textColor;
                        td.style.padding = '0 2px';
                        td.style.border = '1px solid var(--border-muted)';
                        td.style.whiteSpace = 'nowrap';
                        td.style.overflow = 'hidden';
                        td.style.textOverflow = 'ellipsis';

                        // 应用临时颜色
                        if (status !== 'preview-empty' && tempColors[status]) {
                            td.style.backgroundColor = tempColors[status];
                        }
                        td.textContent = text;
                        tr.appendChild(td);
                    });
                });
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            container.appendChild(table);

            // 更新剩余空格提示
            const hint = document.getElementById('previewRemainHint');
            if (hint) hint.textContent = `剩余空格：${remaining}`;
        },

        /**
         * 更新颜色编辑器 UI
         *
         * 根据当前编辑状态，更新颜色显示框、十六进制文本、
         * 颜色选择器、格式输入控件以及状态按钮激活样式。
         */
        updateColorEditor() {
            const color = tempColors[currentEditState] || '#c8e6c9';
            document.getElementById('currentColorBox').style.backgroundColor = color;
            document.getElementById('currentColorHex').textContent = color;
            document.getElementById('sharedColorPicker').value = color;
            this.buildInputs(document.getElementById('colorFormatSelect').value);
            document.querySelectorAll('.color-state-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.state === currentEditState);
            });
        },

        /**
         * 构建颜色格式输入控件
         * @param {string} format - 颜色格式（hex/rgb/rgba/cmyk/hsla）
         *
         * 根据当前格式生成对应的输入控件（文本框或数字输入框），
         * 带有标签（如 R、G、B）和滚轮调整功能。
         */
        buildInputs(format) {
            const container = document.getElementById('colorInputsContainer');
            if (!container) return;
            container.innerHTML = ''; // 清空现有控件

            const hex = tempColors[currentEditState] || '#c8e6c9';
            const utils = App.utils;
            // 将当前颜色转换为各格式的值
            const rgb = utils.hexToRgb(hex);
            const cmyk = utils.rgbToCmyk(rgb.r, rgb.g, rgb.b);
            const hsl = utils.rgbToHsl(rgb.r, rgb.g, rgb.b);

            /**
             * 创建单个输入控件
             * @param {string} label - 标签文字（如 'R'、'G'、'B'，空字符串表示无标签）
             * @param {string|number} value - 初始值
             * @param {number} min - 最小值（仅数字输入）
             * @param {number} max - 最大值（仅数字输入）
             * @param {number} step - 步长（仅数字输入）
             * @param {string} dataType - 数据类型标识（hex/r/g/b/alpha/c/m/y/k/h/s/l）
             * @returns {HTMLElement} 包装好的 span 元素
             *
             * 注意：此函数作为普通函数定义，通过 createInput.call(this, ...) 调用，
             * 确保 this 指向 App.colorPreview 对象，以便在输入事件中正确调用方法。
             */
            function createInput(label, value, min, max, step, dataType) {
                const wrap = document.createElement('span');
                wrap.style.display = 'inline-flex';
                wrap.style.alignItems = 'center';
                wrap.style.gap = '2px';

                // 添加标签
                if (label) {
                    const l = document.createElement('span');
                    l.textContent = label;
                    l.style.fontSize = '0.6rem';
                    l.style.color = 'var(--text-secondary)';
                    wrap.appendChild(l);
                }

                const inp = document.createElement('input');
                inp.type = (dataType === 'hex' ? 'text' : 'number');
                inp.value = value;
                if (dataType !== 'hex') {
                    inp.min = min;
                    inp.max = max;
                    inp.step = step;
                }
                inp.dataset.type = dataType;
                // 设置样式
                inp.style.width = (dataType === 'hex' ? '80px' : '44px');
                inp.style.fontSize = '0.65rem';
                inp.style.padding = '1px 2px';
                inp.style.border = '1px solid var(--border-default)';
                inp.style.borderRadius = '3px';
                inp.style.background = 'var(--bg-primary)';
                inp.style.color = 'var(--text-primary)';
                inp.style.textAlign = 'center';

                // 输入事件：更新颜色
                inp.addEventListener('input', () => this.updateColorFromInputs());

                // 数字输入框支持滚轮调整
                if (dataType !== 'hex') {
                    inp.addEventListener('wheel', e => {
                        e.preventDefault();
                        let v = parseFloat(inp.value) || 0;
                        v += e.deltaY > 0 ? -step : step;
                        v = Math.min(max, Math.max(min, v));
                        inp.value = v;
                        inp.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                }
                wrap.appendChild(inp);
                return wrap;
            }

            // 根据格式创建对应的输入控件组
            switch (format) {
                case 'hex':
                    container.appendChild(createInput.call(this, '', hex, 0, 0, 1, 'hex'));
                    break;
                case 'rgb':
                    container.appendChild(createInput.call(this, 'R', rgb.r, 0, 255, 1, 'r'));
                    container.appendChild(createInput.call(this, 'G', rgb.g, 0, 255, 1, 'g'));
                    container.appendChild(createInput.call(this, 'B', rgb.b, 0, 255, 1, 'b'));
                    break;
                case 'rgba':
                    container.appendChild(createInput.call(this, 'R', rgb.r, 0, 255, 1, 'r'));
                    container.appendChild(createInput.call(this, 'G', rgb.g, 0, 255, 1, 'g'));
                    container.appendChild(createInput.call(this, 'B', rgb.b, 0, 255, 1, 'b'));
                    container.appendChild(createInput.call(this, 'A', 1, 0, 1, 0.01, 'alpha'));
                    break;
                case 'cmyk':
                    container.appendChild(createInput.call(this, 'C', cmyk.c, 0, 100, 1, 'c'));
                    container.appendChild(createInput.call(this, 'M', cmyk.m, 0, 100, 1, 'm'));
                    container.appendChild(createInput.call(this, 'Y', cmyk.y, 0, 100, 1, 'y'));
                    container.appendChild(createInput.call(this, 'K', cmyk.k, 0, 100, 1, 'k'));
                    break;
                case 'hsla':
                    container.appendChild(createInput.call(this, 'H', hsl.h, 0, 360, 1, 'h'));
                    container.appendChild(createInput.call(this, 'S', hsl.s, 0, 100, 1, 's'));
                    container.appendChild(createInput.call(this, 'L', hsl.l, 0, 100, 1, 'l'));
                    container.appendChild(createInput.call(this, 'A', 1, 0, 1, 0.01, 'alpha'));
                    break;
            }
        },

        /**
         * 从输入控件更新当前颜色
         *
         * 读取当前格式的所有输入控件值，转换为十六进制颜色，
         * 更新临时颜色、颜色选择器、颜色显示框，并刷新预览表格。
         * 若解析失败则忽略（保持原颜色）。
         */
        updateColorFromInputs() {
            const format = document.getElementById('colorFormatSelect').value;
            const inputs = document.querySelectorAll('#colorInputsContainer input');
            try {
                let hex = tempColors[currentEditState];
                switch (format) {
                    case 'hex': {
                        const v = inputs[0].value.trim();
                        // 验证十六进制格式
                        if (/^#[0-9A-Fa-f]{6}$/.test(v)) hex = v;
                        break;
                    }
                    case 'rgb':
                    case 'rgba': {
                        const [r, g, b] = [parseInt(inputs[0].value), parseInt(inputs[1].value), parseInt(inputs[2].value)];
                        if ([r, g, b].some(v => isNaN(v))) return;
                        hex = App.utils.rgbToHex(r, g, b);
                        break;
                    }
                    case 'cmyk': {
                        const [c, m, y, k] = [parseFloat(inputs[0].value), parseFloat(inputs[1].value), parseFloat(inputs[2].value), parseFloat(inputs[3].value)];
                        if ([c, m, y, k].some(isNaN)) return;
                        const rgb = App.utils.cmykToRgb(c, m, y, k);
                        hex = App.utils.rgbToHex(rgb.r, rgb.g, rgb.b);
                        break;
                    }
                    case 'hsla': {
                        const [h, s, l] = [parseInt(inputs[0].value), parseInt(inputs[1].value), parseInt(inputs[2].value)];
                        if ([h, s, l].some(isNaN)) return;
                        const rgb = App.utils.hslToRgb(h, s, l);
                        hex = App.utils.rgbToHex(rgb.r, rgb.g, rgb.b);
                        break;
                    }
                }
                // 更新临时颜色和 UI
                tempColors[currentEditState] = hex;
                document.getElementById('sharedColorPicker').value = hex;
                document.getElementById('currentColorBox').style.backgroundColor = hex;
                document.getElementById('currentColorHex').textContent = hex;
                this.updatePreviewCellColors(currentEditState, hex);
            } catch (e) {
                // 忽略解析错误，保留原颜色
            }
        },

        /**
         * 更新预览表格中指定状态的颜色
         * @param {string} status - 状态类型
         * @param {string} hex - 十六进制颜色值
         *
         * 遍历预览表格中具有对应状态类的所有单元格，更新背景色。
         */
        updatePreviewCellColors(status, hex) {
            document.querySelectorAll(`#colorPreviewMain td.${status}`).forEach(td => {
                td.style.backgroundColor = hex;
            });
        },

        /**
         * 初始化颜色预览模块
         *
         * 从全局 CSS 变量读取当前四种状态颜色作为初始值，
         * 重置数量输入框为默认值 10，渲染预览表格并更新编辑器。
         * 通常在打开设置弹窗时调用。
         */
        initColorPreview() {
            tempColors = {
                hasValue: this.getGlobalColor('hasValue'),
                statusNone: this.getGlobalColor('statusNone'),
                statusPartial: this.getGlobalColor('statusPartial'),
                statusFull: this.getGlobalColor('statusFull')
            };
            initialColors = { ...tempColors };

            // 设置数量输入框默认值
            document.getElementById(COUNT_IDS.hasValue).value = 10;
            document.getElementById(COUNT_IDS.statusNone).value = 10;
            document.getElementById(COUNT_IDS.statusPartial).value = 10;
            document.getElementById(COUNT_IDS.statusFull).value = 10;

            this.renderPreviewTable();
            this.updateColorEditor();
        },

        /**
         * 绑定颜色预览事件
         * 由 events.js 统一调用
         *
         * 绑定以下事件：
         * - 数量输入框的 input 和 wheel 事件（实时更新预览）
         * - 状态按钮点击（切换当前编辑状态）
         * - 颜色选择器 input（更新当前颜色）
         * - 颜色格式下拉框 change 和 wheel（切换格式、滚轮切换）
         * - 应用颜色按钮（保存并应用）
         * - 撤销当前颜色、撤销全部修改、重置为默认按钮
         */
        bindColorPreviewEvents() {
            const self = this;

            // 数量输入框事件
            for (const type of STATUS_TYPES) {
                const input = document.getElementById(COUNT_IDS[type]);
                if (!input) continue;
                input.addEventListener('input', () => self.renderPreviewTable());
                input.addEventListener('wheel', e => {
                    e.preventDefault();
                    let val = parseInt(input.value) || 0;
                    val += e.deltaY > 0 ? -1 : 1;
                    val = Math.max(0, Math.min(TOTAL_CELLS, val));
                    input.value = val;
                    self.renderPreviewTable();
                });
            }

            // 颜色状态按钮切换
            document.querySelectorAll('.color-state-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentEditState = btn.dataset.state;
                    self.updateColorEditor();
                });
            });

            // 颜色选择器
            document.getElementById('sharedColorPicker').addEventListener('input', function () {
                tempColors[currentEditState] = this.value;
                document.getElementById('currentColorBox').style.backgroundColor = this.value;
                document.getElementById('currentColorHex').textContent = this.value;
                self.buildInputs(document.getElementById('colorFormatSelect').value);
                self.updatePreviewCellColors(currentEditState, this.value);
            });

            // 颜色格式下拉框
            const fmtSelect = document.getElementById('colorFormatSelect');
            fmtSelect.addEventListener('change', () => self.buildInputs(fmtSelect.value));
            fmtSelect.addEventListener('wheel', e => {
                e.preventDefault();
                const opts = fmtSelect.options;
                let idx = fmtSelect.selectedIndex + (e.deltaY > 0 ? 1 : -1);
                if (idx < 0) idx = opts.length - 1;
                else if (idx >= opts.length) idx = 0;
                fmtSelect.selectedIndex = idx;
                fmtSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // 应用颜色按钮
            document.getElementById('btnApplyColors').addEventListener('click', () => {
                const theme = App.state.isDarkTheme() ? 'dark' : 'light';
                const saved = App.storage.loadUserColors(theme) || {};
                // 将临时颜色写入 CSS 变量和 localStorage
                for (const type of STATUS_TYPES) {
                    const hex = tempColors[type];
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                        document.documentElement.style.setProperty(COLOR_VARS[type], hex);
                        saved[type] = hex;
                    }
                }
                App.storage.saveUserColors(theme, saved);
                // 重新渲染主表格应用新颜色
                if (typeof App.tableRenderer.renderAllTables === 'function') App.tableRenderer.renderAllTables();
                App.modal.showAlert('颜色已应用', '成功');
            });

            // 撤销当前颜色
            document.getElementById('btnUndoColors').addEventListener('click', () => {
                tempColors[currentEditState] = initialColors[currentEditState];
                self.updatePreviewCellColors(currentEditState, tempColors[currentEditState]);
                self.updateColorEditor();
            });

            // 撤销全部修改
            document.getElementById('btnUndoAllColors').addEventListener('click', () => {
                tempColors = { ...initialColors };
                for (const type of STATUS_TYPES) {
                    self.updatePreviewCellColors(type, tempColors[type] || self.getGlobalColor(type));
                }
                self.updateColorEditor();
            });

            // 重置为默认颜色
            document.getElementById('btnResetToDefault').addEventListener('click', () => {
                const defaults = C.DEFAULT_COLORS[App.state.isDarkTheme() ? 'dark' : 'light'];
                tempColors = { ...defaults };
                for (const type of STATUS_TYPES) {
                    self.updatePreviewCellColors(type, tempColors[type]);
                }
                self.updateColorEditor();
                App.modal.showAlert('已重置为默认颜色，点击“确认应用”生效', '提示');
            });
        }
    };

})(window.App = window.App || {});