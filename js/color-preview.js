/**
 * color-preview.js - 颜色预览与编辑模块
 * 包含：预览表格渲染、颜色编辑、格式转换、颜色应用
 */
(function () {
    // ========== 常量 ==========
    const TOTAL_CELLS = 120;
    const STATUS_TYPES = ['hasValue', 'statusNone', 'statusPartial', 'statusFull'];
    const COUNT_IDS = {
        hasValue: 'previewCountHasValue',
        statusNone: 'previewCountStatusNone',
        statusPartial: 'previewCountStatusPartial',
        statusFull: 'previewCountStatusFull'
    };
    const COLOR_VARS = {
        hasValue: '--has-value-bg',
        statusNone: '--status-none-bg',
        statusPartial: '--status-partial-bg',
        statusFull: '--status-full-bg'
    };

    // ========== 状态变量 ==========
    let tempColors = {};
    let initialColors = {};
    let currentEditState = 'hasValue';

    // ========== 工具函数 ==========
    /**
     * 数组洗牌
     * @param {Array} arr
     */
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    /**
     * 生成随机单元格文本
     * @param {string} status - 状态类型
     * @returns {string}
     */
    function generateCellText(status) {
        if (status === 'preview-empty') return '—';
        if (status === 'hasValue') return `${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}`;
        const total = Math.floor(Math.random() * 3) + 1;
        if (status === 'statusNone') return `(0/${total})`;
        if (status === 'statusPartial') return `(${Math.floor(Math.random() * (total - 1)) + 1}/${total})`;
        if (status === 'statusFull') return `(${total}/${total})`;
        return '';
    }

    /**
     * 获取全局 CSS 变量颜色
     * @param {string} type - 状态键
     * @returns {string}
     */
    function getGlobalColor(type) {
        return getComputedStyle(document.documentElement).getPropertyValue(COLOR_VARS[type]).trim() || '#ffffff';
    }

    /**
     * 获取单元格文本颜色
     * @returns {string}
     */
    function getTextColor() {
        return getComputedStyle(document.documentElement).getPropertyValue('--text-cell').trim() || '#1f2328';
    }

    // ========== 预览表格渲染 ==========
    /**
     * 渲染预览表格
     */
    function renderPreviewTable() {
        const container = document.getElementById('colorPreviewMain');
        if (!container) return;
        container.innerHTML = '';

        // 获取各状态数量
        const counts = {};
        for (const type of STATUS_TYPES) {
            const inp = document.getElementById(COUNT_IDS[type]);
            counts[type] = inp ? Math.max(0, parseInt(inp.value) || 0) : 0;
        }

        // 控制总数不超过 TOTAL_CELLS
        let sum = Object.values(counts).reduce((a, b) => a + b, 0);
        if (sum > TOTAL_CELLS) {
            for (const type of STATUS_TYPES) counts[type] = Math.floor(counts[type] * TOTAL_CELLS / sum);
            let diff = TOTAL_CELLS - Object.values(counts).reduce((a, b) => a + b, 0);
            for (let i = 0; diff > 0; i = (i + 1) % STATUS_TYPES.length) {
                counts[STATUS_TYPES[i]]++;
                diff--;
            }
            for (const type of STATUS_TYPES) document.getElementById(COUNT_IDS[type]).value = counts[type];
        }

        const remaining = TOTAL_CELLS - Object.values(counts).reduce((a, b) => a + b, 0);
        const cellTypes = [];
        for (const type of STATUS_TYPES) {
            for (let i = 0; i < counts[type]; i++) cellTypes.push(type);
        }
        for (let i = 0; i < remaining; i++) cellTypes.push('preview-empty');
        shuffle(cellTypes);

        // 构建表格
        const groups = [
            { name: '强攻', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
            { name: '压制', sub: ['敏捷', '力量', '意志', '智识', '主能力'] }
        ];
        const rowNames = [
            '攻击提升', '生命提升', '暴击率提升', '物理伤害提升', '灼热伤害提升',
            '法术伤害提升', '自然伤害提升', '电磁伤害提升', '寒冷伤害提升',
            '源石技艺提升', '治疗效率提升', '终结技效率提升'
        ];
        const textColor = getTextColor();

        const table = document.createElement('table');
        const thead = document.createElement('thead');

        // 表头第一行
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

        // 表头第二行
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

        // 表体
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
                    const text = generateCellText(status);
                    const td = document.createElement('td');

                    td.className = status;
                    td.classList.add(gIdx % 2 === 0 ? 'group-even' : 'group-odd');
                    if (sIdx === g.sub.length - 1 && gIdx < groups.length - 1) td.classList.add('border-group-right');
                    if (status === 'preview-empty') td.classList.add('empty-value');

                    td.style.textAlign = 'center';
                    td.style.verticalAlign = 'middle';
                    td.style.fontSize = '0.72rem';
                    td.style.color = textColor;
                    td.style.padding = '0 2px';
                    td.style.border = '1px solid var(--border-muted)';
                    td.style.whiteSpace = 'nowrap';
                    td.style.overflow = 'hidden';
                    td.style.textOverflow = 'ellipsis';

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

        const hint = document.getElementById('previewRemainHint');
        if (hint) hint.textContent = `剩余空格：${remaining}`;
    }

    // ========== 颜色编辑器 ==========
    /**
     * 更新颜色编辑器 UI
     */
    function updateColorEditor() {
        const color = tempColors[currentEditState] || '#c8e6c9';
        document.getElementById('currentColorBox').style.backgroundColor = color;
        document.getElementById('currentColorHex').textContent = color;
        document.getElementById('sharedColorPicker').value = color;
        buildInputs(document.getElementById('colorFormatSelect').value);
        document.querySelectorAll('.color-state-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.state === currentEditState);
        });
    }

    /**
     * 构建颜色格式输入控件
     * @param {string} format - 颜色格式（hex/rgb/rgba/cmyk/hsla）
     */
    function buildInputs(format) {
        const container = document.getElementById('colorInputsContainer');
        if (!container) return;
        container.innerHTML = '';

        const hex = tempColors[currentEditState] || '#c8e6c9';
        const rgb = hexToRgb(hex);
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        /**
         * 创建输入控件
         */
        function createInput(label, value, min, max, step, dataType) {
            const wrap = document.createElement('span');
            wrap.style.display = 'inline-flex';
            wrap.style.alignItems = 'center';
            wrap.style.gap = '2px';

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
            inp.style.width = (dataType === 'hex' ? '80px' : '44px');
            inp.style.fontSize = '0.65rem';
            inp.style.padding = '1px 2px';
            inp.style.border = '1px solid var(--border-default)';
            inp.style.borderRadius = '3px';
            inp.style.background = 'var(--bg-primary)';
            inp.style.color = 'var(--text-primary)';
            inp.style.textAlign = 'center';

            inp.addEventListener('input', updateColorFromInputs);
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

        switch (format) {
            case 'hex':
                container.appendChild(createInput('', hex, 0, 0, 1, 'hex'));
                break;
            case 'rgb':
                container.appendChild(createInput('R', rgb.r, 0, 255, 1, 'r'));
                container.appendChild(createInput('G', rgb.g, 0, 255, 1, 'g'));
                container.appendChild(createInput('B', rgb.b, 0, 255, 1, 'b'));
                break;
            case 'rgba':
                container.appendChild(createInput('R', rgb.r, 0, 255, 1, 'r'));
                container.appendChild(createInput('G', rgb.g, 0, 255, 1, 'g'));
                container.appendChild(createInput('B', rgb.b, 0, 255, 1, 'b'));
                container.appendChild(createInput('A', 1, 0, 1, 0.01, 'alpha'));
                break;
            case 'cmyk':
                container.appendChild(createInput('C', cmyk.c, 0, 100, 1, 'c'));
                container.appendChild(createInput('M', cmyk.m, 0, 100, 1, 'm'));
                container.appendChild(createInput('Y', cmyk.y, 0, 100, 1, 'y'));
                container.appendChild(createInput('K', cmyk.k, 0, 100, 1, 'k'));
                break;
            case 'hsla':
                container.appendChild(createInput('H', hsl.h, 0, 360, 1, 'h'));
                container.appendChild(createInput('S', hsl.s, 0, 100, 1, 's'));
                container.appendChild(createInput('L', hsl.l, 0, 100, 1, 'l'));
                container.appendChild(createInput('A', 1, 0, 1, 0.01, 'alpha'));
                break;
        }
    }

    /**
     * 从输入控件更新当前颜色
     */
    function updateColorFromInputs() {
        const format = document.getElementById('colorFormatSelect').value;
        const inputs = document.querySelectorAll('#colorInputsContainer input');
        try {
            let hex = tempColors[currentEditState];
            switch (format) {
                case 'hex': {
                    const v = inputs[0].value.trim();
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) hex = v;
                    break;
                }
                case 'rgb':
                case 'rgba': {
                    const [r, g, b] = [parseInt(inputs[0].value), parseInt(inputs[1].value), parseInt(inputs[2].value)];
                    if ([r, g, b].some(v => isNaN(v))) return;
                    hex = rgbToHex(r, g, b);
                    break;
                }
                case 'cmyk': {
                    const [c, m, y, k] = [parseFloat(inputs[0].value), parseFloat(inputs[1].value), parseFloat(inputs[2].value), parseFloat(inputs[3].value)];
                    if ([c, m, y, k].some(isNaN)) return;
                    const rgb = cmykToRgb(c, m, y, k);
                    hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                    break;
                }
                case 'hsla': {
                    const [h, s, l] = [parseInt(inputs[0].value), parseInt(inputs[1].value), parseInt(inputs[2].value)];
                    if ([h, s, l].some(isNaN)) return;
                    const rgb = hslToRgb(h, s, l);
                    hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                    break;
                }
            }
            tempColors[currentEditState] = hex;
            document.getElementById('sharedColorPicker').value = hex;
            document.getElementById('currentColorBox').style.backgroundColor = hex;
            document.getElementById('currentColorHex').textContent = hex;
            updatePreviewCellColors(currentEditState, hex);
        } catch (e) {
            // 忽略解析错误
        }
    }

    /**
     * 更新预览表格中指定状态的颜色
     * @param {string} status
     * @param {string} hex
     */
    function updatePreviewCellColors(status, hex) {
        document.querySelectorAll(`#colorPreviewMain td.${status}`).forEach(td => {
            td.style.backgroundColor = hex;
        });
    }

    // ========== 颜色转换工具 ==========
    function hexToRgb(hex) {
        const c = hex.substring(1), v = parseInt(c, 16);
        return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    }

    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function rgbToCmyk(r, g, b) {
        let c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255, k = Math.min(c, m, y);
        if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
        c = Math.round(((c - k) / (1 - k)) * 100);
        m = Math.round(((m - k) / (1 - k)) * 100);
        y = Math.round(((y - k) / (1 - k)) * 100);
        k = Math.round(k * 100);
        return { c, m, y, k };
    }

    function cmykToRgb(c, m, y, k) {
        c /= 100; m /= 100; y /= 100; k /= 100;
        return {
            r: Math.round(255 * (1 - c) * (1 - k)),
            g: Math.round(255 * (1 - m) * (1 - k)),
            b: Math.round(255 * (1 - y) * (1 - k))
        };
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    // ========== 事件绑定 ==========
    /**
     * 设置数量输入框事件
     */
    function setupCountInputs() {
        for (const type of STATUS_TYPES) {
            const input = document.getElementById(COUNT_IDS[type]);
            if (!input) continue;
            input.addEventListener('input', renderPreviewTable);
            input.addEventListener('wheel', e => {
                e.preventDefault();
                let val = parseInt(input.value) || 0;
                val += e.deltaY > 0 ? -1 : 1;
                val = Math.max(0, Math.min(TOTAL_CELLS, val));
                input.value = val;
                renderPreviewTable();
            });
        }
    }

    /**
     * 设置颜色编辑器事件
     */
    function setupColorEditor() {
        document.querySelectorAll('.color-state-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentEditState = btn.dataset.state;
                updateColorEditor();
            });
        });

        document.getElementById('sharedColorPicker').addEventListener('input', function () {
            tempColors[currentEditState] = this.value;
            document.getElementById('currentColorBox').style.backgroundColor = this.value;
            document.getElementById('currentColorHex').textContent = this.value;
            buildInputs(document.getElementById('colorFormatSelect').value);
            updatePreviewCellColors(currentEditState, this.value);
        });

        const fmtSelect = document.getElementById('colorFormatSelect');
        fmtSelect.addEventListener('change', () => buildInputs(fmtSelect.value));
        fmtSelect.addEventListener('wheel', e => {
            e.preventDefault();
            const opts = fmtSelect.options;
            let idx = fmtSelect.selectedIndex + (e.deltaY > 0 ? 1 : -1);
            if (idx < 0) idx = opts.length - 1;
            else if (idx >= opts.length) idx = 0;
            fmtSelect.selectedIndex = idx;
            fmtSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });

        document.getElementById('btnApplyColors').addEventListener('click', () => {
            const theme = isDarkTheme() ? 'dark' : 'light';
            const saved = JSON.parse(localStorage.getItem('smarttable_user_colors') || '{}');
            if (!saved[theme]) saved[theme] = {};
            for (const type of STATUS_TYPES) {
                const hex = tempColors[type];
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    document.documentElement.style.setProperty(COLOR_VARS[type], hex);
                    saved[theme][type] = hex;
                }
            }
            localStorage.setItem('smarttable_user_colors', JSON.stringify(saved));
            if (typeof renderAllTables === 'function') renderAllTables();
            showAlert('颜色已应用', '成功');
        });

        document.getElementById('btnUndoColors').addEventListener('click', () => {
            tempColors[currentEditState] = initialColors[currentEditState];
            updatePreviewCellColors(currentEditState, tempColors[currentEditState]);
            updateColorEditor();
        });

        document.getElementById('btnUndoAllColors').addEventListener('click', () => {
            tempColors = { ...initialColors };
            for (const type of STATUS_TYPES) updatePreviewCellColors(type, tempColors[type] || getGlobalColor(type));
            updateColorEditor();
        });

        document.getElementById('btnResetToDefault').addEventListener('click', () => {
            const defaults = {
                hasValue: isDarkTheme() ? '#2a4a35' : '#c8e6c9',
                statusNone: isDarkTheme() ? '#3a3f47' : '#cfd8dc',
                statusPartial: isDarkTheme() ? '#5a4a28' : '#ffe0b2',
                statusFull: isDarkTheme() ? '#2e5a3b' : '#a5d6a7'
            };
            tempColors = { ...defaults };
            for (const type of STATUS_TYPES) updatePreviewCellColors(type, tempColors[type]);
            updateColorEditor();
            showAlert('已重置为默认颜色，点击“确认应用”生效', '提示');
        });
    }

    /**
     * 初始化模块
     */
    function init() {
        tempColors = {
            hasValue: getGlobalColor('hasValue'),
            statusNone: getGlobalColor('statusNone'),
            statusPartial: getGlobalColor('statusPartial'),
            statusFull: getGlobalColor('statusFull')
        };
        initialColors = { ...tempColors };

        document.getElementById(COUNT_IDS.hasValue).value = 10;
        document.getElementById(COUNT_IDS.statusNone).value = 10;
        document.getElementById(COUNT_IDS.statusPartial).value = 10;
        document.getElementById(COUNT_IDS.statusFull).value = 10;

        renderPreviewTable();
        updateColorEditor();
    }

    // ========== DOMContentLoaded 初始化 ==========
    document.addEventListener('DOMContentLoaded', () => {
        setupCountInputs();
        setupColorEditor();
        document.getElementById('btnOpenSettings').addEventListener('click', () => {
            setTimeout(init, 50);
        });
    });
})();