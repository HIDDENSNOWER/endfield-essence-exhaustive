/**
 * color-preview.js - 单元格状态颜色预览与编辑
 * 挂载到 App.colorPreview
 *
 * 负责设置弹窗中单元格状态颜色预览与编辑，包括：
 * - 渲染 12×10 预览表格，随机填充四种状态和空单元格
 * - 调节各状态数量，实时更新预览
 * - 颜色编辑器（HEX/RGB/RGBA/CMYK/HSLA）
 * - 方案操作：应用、放弃、恢复方案颜色、恢复系统默认（白天/黑夜）、保存到方案、另存为新方案、导入导出
 * - 应用后自动保存为“用户自定义方案”
 */
(function (App) {
    'use strict';

    const C = App.constants;
    const TOTAL_CELLS = C.TOTAL_CELLS;
    const STATUS_TYPES = C.STATUS_TYPES;
    const COUNT_IDS = C.COUNT_IDS;
    const COLOR_VARS = C.COLOR_VARS;

    let tempColors = {};
    let initialColors = {};
    let currentEditState = 'hasValue';

    App.colorPreview = {
        getGlobalColor(type) {
            return getComputedStyle(document.documentElement).getPropertyValue(COLOR_VARS[type]).trim() || '#ffffff';
        },

        getTextColor() {
            return getComputedStyle(document.documentElement).getPropertyValue('--text-cell').trim() || '#1f2328';
        },

        generateCellText(status) {
            if (status === 'preview-empty') return '—';
            if (status === 'hasValue') {
                return `${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9) + 1}`;
            }
            const total = Math.floor(Math.random() * 3) + 1;
            if (status === 'statusNone') return `(0/${total})`;
            if (status === 'statusPartial') return total === 1 ? `(0/1)` : `(${Math.floor(Math.random() * (total - 1)) + 1}/${total})`;
            if (status === 'statusFull') return `(${total}/${total})`;
            return '';
        },

        renderPreviewTable() {
            const container = document.getElementById('colorPreviewMain');
            if (!container) return;
            container.innerHTML = '';

            const counts = {};
            for (const type of STATUS_TYPES) {
                const inp = document.getElementById(COUNT_IDS[type]);
                counts[type] = inp ? Math.max(0, parseInt(inp.value) || 0) : 0;
            }

            let sum = Object.values(counts).reduce((a, b) => a + b, 0);
            if (sum > TOTAL_CELLS) {
                for (const type of STATUS_TYPES) {
                    counts[type] = Math.floor(counts[type] * TOTAL_CELLS / sum);
                }
                let diff = TOTAL_CELLS - Object.values(counts).reduce((a, b) => a + b, 0);
                for (let i = 0; diff > 0; i = (i + 1) % STATUS_TYPES.length) {
                    counts[STATUS_TYPES[i]]++;
                    diff--;
                }
                for (const type of STATUS_TYPES) {
                    document.getElementById(COUNT_IDS[type]).value = counts[type];
                }
            }

            const remaining = TOTAL_CELLS - Object.values(counts).reduce((a, b) => a + b, 0);

            const cellTypes = [];
            for (const type of STATUS_TYPES) {
                for (let i = 0; i < counts[type]; i++) cellTypes.push(type);
            }
            for (let i = 0; i < remaining; i++) cellTypes.push('preview-empty');
            App.utils.shuffle(cellTypes);

            const groups = [
                { name: '强攻', sub: ['敏捷', '力量', '意志', '智识', '主能力'] },
                { name: '压制', sub: ['敏捷', '力量', '意志', '智识', '主能力'] }
            ];
            const rowNames = C.ROW_NAMES.slice(0, 12);
            const textColor = this.getTextColor();

            const table = document.createElement('table');
            const thead = document.createElement('thead');

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
        },

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

        buildInputs(format) {
            const container = document.getElementById('colorInputsContainer');
            if (!container) return;
            container.innerHTML = '';

            const hex = tempColors[currentEditState] || '#c8e6c9';
            const rgb = App.utils.hexToRgb(hex);
            const cmyk = App.utils.rgbToCmyk(rgb.r, rgb.g, rgb.b);
            const hsl = App.utils.rgbToHsl(rgb.r, rgb.g, rgb.b);

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
                if (dataType === 'alpha') {
                    inp.disabled = true;
                    inp.title = '当前版本暂不支持透明度调整';
                    inp.style.opacity = '0.5';
                }
                inp.style.width = (dataType === 'hex' ? '80px' : '44px');
                inp.style.fontSize = '0.65rem';
                inp.style.padding = '1px 2px';
                inp.style.border = '1px solid var(--border-default)';
                inp.style.borderRadius = '3px';
                inp.style.background = 'var(--bg-primary)';
                inp.style.color = 'var(--text-primary)';
                inp.style.textAlign = 'center';

                inp.addEventListener('input', () => this.updateColorFromInputs());

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

        updateColorFromInputs() {
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
                        const rawRgb = [inputs[0].value, inputs[1].value, inputs[2].value];
                        if (rawRgb.some(v => isNaN(Number(v)))) return;
                        const clamp255 = v => Math.min(255, Math.max(0, Math.round(Number(v))));
                        const [r, g, b] = rawRgb.map(clamp255);
                        inputs[0].value = r; inputs[1].value = g; inputs[2].value = b;
                        hex = App.utils.rgbToHex(r, g, b);
                        break;
                    }
                    case 'cmyk': {
                        const rawCmyk = [inputs[0].value, inputs[1].value, inputs[2].value, inputs[3].value];
                        if (rawCmyk.some(v => isNaN(Number(v)))) return;
                        const clamp100 = v => Math.min(100, Math.max(0, Number(v)));
                        const [c, m, y, k] = rawCmyk.map(clamp100);
                        [0, 1, 2, 3].forEach(i => inputs[i].value = [c, m, y, k][i]);
                        const rgb = App.utils.cmykToRgb(c, m, y, k);
                        hex = App.utils.rgbToHex(rgb.r, rgb.g, rgb.b);
                        break;
                    }
                    case 'hsla': {
                        const rawHsl = [inputs[0].value, inputs[1].value, inputs[2].value];
                        if (rawHsl.some(v => isNaN(Number(v)))) return;
                        const h = Math.min(360, Math.max(0, Math.round(Number(rawHsl[0]))));
                        const s = Math.min(100, Math.max(0, Number(rawHsl[1])));
                        const l = Math.min(100, Math.max(0, Number(rawHsl[2])));
                        inputs[0].value = h; inputs[1].value = s; inputs[2].value = l;
                        const rgb = App.utils.hslToRgb(h, s, l);
                        hex = App.utils.rgbToHex(rgb.r, rgb.g, rgb.b);
                        break;
                    }
                }
                tempColors[currentEditState] = hex;
                document.getElementById('sharedColorPicker').value = hex;
                document.getElementById('currentColorBox').style.backgroundColor = hex;
                document.getElementById('currentColorHex').textContent = hex;
                this.updatePreviewCellColors(currentEditState, hex);
            } catch (e) {}
        },

        updatePreviewCellColors(status, hex) {
            document.querySelectorAll(`#colorPreviewMain td.${status}`).forEach(td => {
                td.style.backgroundColor = hex;
            });
        },

        initColorPreview() {
            tempColors = {
                hasValue: this.getGlobalColor('hasValue'),
                statusNone: this.getGlobalColor('statusNone'),
                statusPartial: this.getGlobalColor('statusPartial'),
                statusFull: this.getGlobalColor('statusFull')
            };
            initialColors = { ...tempColors };

            document.getElementById(COUNT_IDS.hasValue).value = 10;
            document.getElementById(COUNT_IDS.statusNone).value = 10;
            document.getElementById(COUNT_IDS.statusPartial).value = 10;
            document.getElementById(COUNT_IDS.statusFull).value = 10;

            this.renderPreviewTable();
            this.updateColorEditor();
        },

        bindColorPreviewEvents() {
            const self = this;

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

            document.querySelectorAll('.color-state-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentEditState = btn.dataset.state;
                    self.updateColorEditor();
                });
            });

            document.getElementById('sharedColorPicker').addEventListener('input', function () {
                tempColors[currentEditState] = this.value;
                document.getElementById('currentColorBox').style.backgroundColor = this.value;
                document.getElementById('currentColorHex').textContent = this.value;
                self.buildInputs(document.getElementById('colorFormatSelect').value);
                self.updatePreviewCellColors(currentEditState, this.value);
            });

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

            // 应用颜色
            document.getElementById('btnApplyColors').addEventListener('click', () => {
                const theme = App.state.isDarkTheme() ? 'dark' : 'light';
                const saved = App.storage.loadUserColors(theme) || {};
                for (const type of STATUS_TYPES) {
                    const hex = tempColors[type];
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                        document.documentElement.style.setProperty(COLOR_VARS[type], hex);
                        saved[type] = hex;
                    }
                }
                App.storage.saveUserColors(theme, saved);
                App.tableRenderer.renderAllTables();
                App.modal.showAlert('颜色已应用', '成功');
                if (App.stateColorSchemeManager && App.stateColorSchemeManager.autoSaveToCustomScheme) {
                    App.stateColorSchemeManager.autoSaveToCustomScheme();
                }
            });

            // 放弃修改
            document.getElementById('btnDiscardChanges').addEventListener('click', () => {
                tempColors = { ...initialColors };
                for (const type of STATUS_TYPES) {
                    self.updatePreviewCellColors(type, tempColors[type] || self.getGlobalColor(type));
                }
                self.updateColorEditor();
            });

            // 恢复方案颜色
            document.getElementById('btnRestoreScheme').addEventListener('click', () => {
                const scheme = App.stateColorSchemeManager.getActiveScheme();
                let schemeColors = scheme ? scheme.colors : null;
                if (!schemeColors) schemeColors = C.DEFAULT_COLORS[App.state.isDarkTheme() ? 'dark' : 'light'];
                tempColors = { ...schemeColors };
                for (const type of STATUS_TYPES) self.updatePreviewCellColors(type, tempColors[type]);
                self.updateColorEditor();
                App.modal.showAlert('已恢复为当前单元格颜色方案，点击"应用颜色"生效', '提示');
            });

            // 恢复系统默认：白天
            document.getElementById('btnRestoreSystemLight').addEventListener('click', () => {
                tempColors = { ...C.DEFAULT_COLORS.light };
                for (const type of STATUS_TYPES) self.updatePreviewCellColors(type, tempColors[type]);
                self.updateColorEditor();
                App.modal.showAlert('已恢复为白天系统默认颜色，点击"应用颜色"生效', '提示');
            });

            // 恢复系统默认：黑夜
            document.getElementById('btnRestoreSystemDark').addEventListener('click', () => {
                tempColors = { ...C.DEFAULT_COLORS.dark };
                for (const type of STATUS_TYPES) self.updatePreviewCellColors(type, tempColors[type]);
                self.updateColorEditor();
                App.modal.showAlert('已恢复为黑夜系统默认颜色，点击"应用颜色"生效', '提示');
            });

            // 保存到方案
            document.getElementById('btnSaveToScheme').addEventListener('click', () => {
                App.stateColorSchemeManager.saveToCurrentScheme();
            });

            // 另存为新方案（悬浮窗口）
            document.getElementById('btnSaveAsNewScheme').addEventListener('click', () => {
                App.modal.showConfirmDialog(
                    '请输入新方案名称：<br><input type="text" id="cellStateColorNewSchemeName" placeholder="方案名称" maxlength="50" style="width:100%; margin-top:8px;">',
                    () => {
                        const nameInput = document.getElementById('cellStateColorNewSchemeName');
                        if (!nameInput) return;
                        const name = nameInput.value.trim();
                        if (name) {
                            if (App.stateColorSchemeManager.saveAsNewScheme(name)) {
                                App.modal.showAlert('方案已创建', '成功');
                            } else {
                                App.modal.showAlert('方案名称已存在', '错误');
                            }
                        } else {
                            App.modal.showAlert('方案名称不能为空', '提示');
                        }
                    },
                    () => {},
                    '另存为新方案',
                    '保存',
                    '取消'
                );
            });

            // 导出颜色（悬浮窗口输入文件名）
            document.getElementById('btnExportColors').addEventListener('click', () => {
                const now = new Date();
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const defaultName = `单元格状态颜色_${dateStr}.json`;
                App.modal.showConfirmDialog(
                    `设置导出文件名：<br><input type="text" id="cellStateColorExportFileName" value="${defaultName}" style="width:100%; margin-top:8px;">`,
                    () => {
                        const nameInput = document.getElementById('cellStateColorExportFileName');
                        const fileName = nameInput ? nameInput.value.trim() || defaultName : defaultName;
                        const exportData = {
                            type: 'eee_state_color_scheme',
                            version: '1.0',
                            name: '单元格状态颜色方案',
                            theme: App.state.isDarkTheme() ? 'dark' : 'light',
                            colors: { ...tempColors }
                        };
                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                    },
                    () => {},
                    '导出颜色',
                    '导出',
                    '取消'
                );
            });

            // 导入颜色（文件选择）
            document.getElementById('btnImportColors').addEventListener('click', () => {
                document.getElementById('colorImportFile').click();
            });

            // 处理导入文件
            const colorImportFile = document.getElementById('colorImportFile');
            if (colorImportFile) {
                colorImportFile.addEventListener('change', (e) => {
                    if (!e.target.files[0]) return;
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const parsed = JSON.parse(ev.target.result);
                            if (parsed.type === 'eee_state_color_scheme') {
                                // 正确格式：展示对比后导入
                                if (App.stateColorSchemeManager && App.stateColorSchemeManager.showImportCompare) {
                                    App.stateColorSchemeManager.showImportCompare(file);
                                } else {
                                    App.modal.showAlert('单元格颜色方案模块未加载', '错误');
                                }
                            } else if (parsed.type === 'eee_interface_colors') {
                                // 跨格式：提示并直接导入（带对比）
                                App.modal.showConfirmDialog(
                                    '检测到这是<strong>界面颜色</strong>文件，是否切换到界面颜色导入？',
                                    () => {
                                        if (App.interfaceColors && App.interfaceColors.showImportCompare) {
                                            App.interfaceColors.showImportCompare(file);
                                        } else {
                                            App.modal.showAlert('界面颜色模块未加载', '错误');
                                        }
                                    },
                                    () => {},
                                    '导入提示',
                                    '导入',
                                    '取消'
                                );
                            } else {
                                App.modal.showAlert('非法格式：文件既不是单元格状态颜色方案，也不是界面颜色。', '导入失败');
                            }
                        } catch (err) {
                            App.modal.showAlert('非法格式：文件无法解析。', '导入失败');
                        }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                });
            }
        }
    };
})(window.App = window.App || {});