/**
 * interface-colors.js - 界面颜色个性化管理（CSS变量驱动预览版）
 * 挂载到 App.interfaceColors
 *
 * 负责除状态颜色外的所有 CSS 颜色变量的自定义，包括表格底色。
 * 颜色修改仅更新预览，点击"应用"后才写入全局 CSS 变量并持久化。
 * 应用后自动保存为"用户自定义方案"。
 */
(function (App) {
    'use strict';

    const C = App.constants;

    let tempInterfaceColors = {};
    let initialInterfaceColors = {};
    let previewContainerRef = null;

    function getDefaults(theme) {
        return theme === 'dark' ? C.DEFAULT_INTERFACE_COLORS_DARK : C.DEFAULT_INTERFACE_COLORS_LIGHT;
    }

    function getStored() {
        return App.storage.getJSON(C.INTERFACE_COLORS_STORAGE_KEY, {});
    }

    function saveStored(stored) {
        App.storage.setJSON(C.INTERFACE_COLORS_STORAGE_KEY, stored);
    }

    function getCustom(theme) {
        const stored = getStored();
        const defaults = getDefaults(theme) || {};
        return { ...defaults, ...(stored[theme] || {}) };
    }

    function getPreviewColor(varName) {
        const theme = App.state.isDarkTheme() ? 'dark' : 'light';
        const defaults = getDefaults(theme) || {};
        return tempInterfaceColors[varName] || defaults[varName] || '#ffffff';
    }

    App.interfaceColors = {
        getDefaults,
        getStored,
        saveStored,
        getCustom,

        applyColors(theme, colors) {
            if (!colors) return;
            const stored = getStored();
            stored[theme] = { ...colors };
            saveStored(stored);
            for (const varName in colors) {
                if (colors[varName]) document.documentElement.style.setProperty(varName, colors[varName]);
            }
        },

        resetTheme(theme) {
            const stored = getStored();
            delete stored[theme];
            saveStored(stored);
            this.applyCurrentTheme();
        },

        applyCurrentTheme() {
            const theme = App.state.isDarkTheme() ? 'dark' : 'light';
            const allVars = new Set([
                ...Object.keys(getDefaults('light')),
                ...Object.keys(getDefaults('dark'))
            ]);
            allVars.forEach(v => document.documentElement.style.removeProperty(v));
            const custom = getStored()[theme] || {};
            for (const varName in custom) {
                document.documentElement.style.setProperty(varName, custom[varName]);
            }
        },

        renderColorControls(container) {
            if (!container) return;
            const theme = App.state.isDarkTheme() ? 'dark' : 'light';
            const custom = getCustom(theme);
            const defaults = getDefaults(theme) || {};

            tempInterfaceColors = { ...custom };
            initialInterfaceColors = { ...custom };

            let html = '';
            for (const group of C.INTERFACE_COLOR_GROUPS) {
                html += `<div class="interface-color-group"><h4 class="interface-color-group-title">${group.name}</h4><div class="interface-color-grid">`;
                for (const [varName, label] of Object.entries(group.vars)) {
                    const val = custom[varName] || defaults[varName] || '#ffffff';
                    html += `<div class="interface-color-item" data-var-name="${varName}">
                                <label class="interface-color-label">${label}</label>
                                <div class="interface-color-controls">
                                    <input type="color" class="interface-color-input" data-var-name="${varName}" value="${val}"
                                        oninput="App.interfaceColors._onColorInput(this)"
                                        onchange="App.interfaceColors._onColorInput(this)">
                                    <span class="interface-color-value">${val}</span>
                                </div>
                            </div>`;
                }
                html += `</div></div>`;
            }
            container.innerHTML = html;
        },

        _onColorInput(input) {
            const varName = input.dataset.varName;
            const value = input.value;
            tempInterfaceColors[varName] = value;
            if (previewContainerRef) {
                previewContainerRef.style.setProperty(varName, value);
            }
            const item = input.closest('.interface-color-item');
            if (item) {
                const valSpan = item.querySelector('.interface-color-value');
                if (valSpan) valSpan.textContent = value;
            }
        },

        updateColorControlsUI() {
            document.querySelectorAll('.interface-color-input').forEach(input => {
                const varName = input.dataset.varName;
                if (tempInterfaceColors[varName]) {
                    input.value = tempInterfaceColors[varName];
                    const span = input.closest('.interface-color-item').querySelector('.interface-color-value');
                    if (span) span.textContent = tempInterfaceColors[varName];
                }
            });
        },

        renderPreview(container) {
            if (!container) return;
            previewContainerRef = container;

            const theme = App.state.isDarkTheme() ? 'dark' : 'light';
            const defaults = getDefaults(theme) || {};
            const allColors = { ...defaults, ...tempInterfaceColors };
            for (const varName in allColors) {
                container.style.setProperty(varName, allColors[varName]);
            }

            container.innerHTML = `
                <div style="background: var(--bg-secondary); border:1px solid var(--border-default); border-radius:6px; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background-color: var(--bg-primary); border-bottom:1px solid var(--border-default);">
                        <span style="font-size:10px; font-weight:600; color: var(--text-primary);">EEE 工具</span>
                        <div style="display:flex; gap:4px;">
                            <span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border:1px solid var(--border-default); border-radius:4px; color:var(--text-secondary);">☀</span>
                            <span style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border:1px solid var(--border-default); border-radius:4px; color:var(--text-secondary);">⚙</span>
                        </div>
                    </div>
                    <div style="display:flex; min-height:140px; background-color: var(--bg-secondary);">
                        <div style="width:22px; display:flex; flex-direction:column; align-items:center; padding:6px 0; gap:5px; background-color: var(--bg-primary); border-right:1px solid var(--border-default);">
                            <div style="width:14px; height:14px; border-radius:3px; background-color: var(--bg-hover); border:1px solid var(--border-default);"></div>
                            <div style="width:14px; height:14px; border-radius:3px; border:1px solid var(--border-muted);"></div>
                            <div style="width:14px; height:14px; border-radius:3px; border:1px solid var(--border-muted);"></div>
                        </div>
                        <div style="flex:1; padding:6px; min-width:0; display:flex; flex-direction:column; gap:5px;">
                            <div style="font-size:7px; padding:2px 5px; border-radius:2px; background-color: var(--bg-primary); border:1px solid var(--border-default); color:var(--text-primary);">悬停单元格查看详情</div>
                            <div style="border:1px solid var(--border-default); border-radius:3px; overflow:hidden;">
                                <table style="width:100%; border-collapse:collapse; font-size:7px; white-space:nowrap; table-layout:fixed;">
                                    <thead>
                                        <tr>
                                            <th rowspan="2" style="width:50px; background-color: var(--bg-tertiary); color:var(--text-secondary); border:1px solid var(--border-muted); padding:2px 4px;">提升项</th>
                                            <th colspan="5" style="background-color: var(--group-header-even-bg); color:var(--text-secondary); border:1px solid var(--border-muted); border-right:2px solid var(--border-emphasis);">强攻</th>
                                            <th colspan="5" style="background-color: var(--group-header-odd-bg); color:var(--text-secondary); border:1px solid var(--border-muted);">压制</th>
                                        </tr>
                                        <tr>
                                            ${['敏捷','力量','意志','智识','主能力'].map((s,i)=>`<th style="background-color: var(--group-header-even-bg); color:var(--text-secondary); border:1px solid var(--border-muted); ${i===4?'border-right:2px solid var(--border-emphasis)':''}">${s}</th>`).join('')}
                                            ${['敏捷','力量','意志','智识','主能力'].map(s=>`<th style="background-color: var(--group-header-odd-bg); color:var(--text-secondary); border:1px solid var(--border-muted);">${s}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${['攻击提升','生命提升'].map(row=>`
                                        <tr>
                                            <td style="background-color: var(--bg-tertiary); color:var(--text-cell); border:1px solid var(--border-muted); padding:2px 4px;">${row}</td>
                                            ${Array.from({length:5}).map((_,i)=>`<td style="background-color: ${i%2===0?'var(--group-even-bg)':'var(--group-odd-bg)'}; color:var(--text-cell); border:1px solid var(--border-muted); ${i===4?'border-right:2px solid var(--border-emphasis)':''}">${i===0?'123':'—'}</td>`).join('')}
                                            ${Array.from({length:5}).map((_,i)=>`<td style="background-color: ${i%2===0?'var(--group-odd-bg)':'var(--group-even-bg)'}; color:var(--text-cell); border:1px solid var(--border-muted);">${i===0?'456':'—'}</td>`).join('')}
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style="width:65px; background-color: var(--input-bg); border-left:1px solid var(--border-default); padding:6px; display:flex; flex-direction:column; gap:5px;">
                            <div style="color:var(--text-primary); font-weight:600; font-size:8px;">📝 面板</div>
                            <div style="border:1px solid var(--border-default); background-color: var(--input-bg); color:var(--text-primary); font-size:7px; padding:3px; border-radius:2px;">输入内容</div>
                            <div style="display:flex; gap:3px; flex-wrap:wrap;">
                                <span style="background-color: var(--accent-primary); color:#fff; font-size:7px; padding:2px 4px; border-radius:2px;">应用</span>
                                <span style="border:1px solid var(--danger-primary); color:var(--danger-primary); font-size:7px; padding:2px 4px; border-radius:2px;">删除</span>
                                <span style="background-color: var(--success-primary); color:#fff; font-size:7px; padding:2px 4px; border-radius:2px;">确定</span>
                            </div>
                            <div style="background-color: var(--danger-bg); color:var(--danger-primary); font-size:6px; padding:2px; border-radius:2px;">危险提示</div>
                        </div>
                    </div>
                    <div style="padding:6px; background-color: var(--bg-secondary); border-top:1px dashed var(--border-muted);">
                        <div style="font-size:7px; color:var(--text-secondary); margin-bottom:4px;">弹窗示例</div>
                        <div style="background-color: var(--bg-primary); border:1px solid var(--border-default); border-radius:4px; max-width:160px;">
                            <div style="border-bottom:1px solid var(--border-muted); color:var(--text-primary); font-size:8px; padding:3px 5px;">提示</div>
                            <div style="padding:5px;">
                                <p style="color:var(--text-primary); font-size:7px;">主要文本</p>
                                <p style="color:var(--text-secondary); font-size:7px;">次要文本</p>
                                <p style="color:var(--text-tertiary); font-size:7px;">弱化文本</p>
                                <input style="width:100%; font-size:7px; padding:2px; border:1px solid var(--border-default); background-color: var(--modal-input-bg); color:var(--text-primary);" placeholder="弹窗输入框">
                            </div>
                            <div style="border-top:1px solid var(--border-muted); display:flex; justify-content:flex-end; gap:3px; padding:3px;">
                                <span style="border:1px solid var(--border-default); color:var(--text-secondary); font-size:6px;">取消</span>
                                <span style="background-color: var(--accent-primary); color:#fff; font-size:6px;">确定</span>
                            </div>
                        </div>
                    </div>
                    <div style="padding:6px; background-color: var(--bg-secondary); border-top:1px dashed var(--border-muted); display:flex; align-items:center; gap:6px;">
                        <span style="font-size:7px; color:var(--text-secondary);">滚动条：</span>
                        <div style="width:60px; height:5px; background-color: var(--scrollbar-thumb); border-radius:2px;"></div>
                    </div>
                </div>
            `;
        },

        showImportCompare(file) {
            const self = this;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    if (parsed.type !== 'eee_interface_colors' || !parsed.colors) {
                        App.modal.showAlert('非法格式：不是有效的界面颜色文件。', '导入失败');
                        return;
                    }
                    const importedColors = parsed.colors;
                    const current = { ...tempInterfaceColors };
                    const changedVars = Object.keys(importedColors).filter(varName => {
                        const curVal = current[varName] || getPreviewColor(varName);
                        return curVal !== importedColors[varName];
                    });
                    if (changedVars.length === 0) {
                        App.modal.showAlert('导入的颜色与当前完全一致。', '提示');
                        return;
                    }
                    let compareHtml = '<div style="max-height:300px; overflow-y:auto;">';
                    for (const group of C.INTERFACE_COLOR_GROUPS) {
                        let groupHasChange = false;
                        let groupHtml = `<div style="margin-bottom:8px;"><strong style="font-size:0.85rem;">${group.name}</strong><div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:4px;">`;
                        for (const [varName, label] of Object.entries(group.vars)) {
                            if (!changedVars.includes(varName)) continue;
                            groupHasChange = true;
                            const curVal = current[varName] || getPreviewColor(varName);
                            const impVal = importedColors[varName];
                            groupHtml += `
                            <div style="text-align:center; min-width:80px;">
                                <div style="font-size:0.7rem; margin-bottom:2px;">${label}</div>
                                <div style="display:flex; gap:4px; align-items:center; justify-content:center;">
                                    <div style="width:24px;height:18px;border:1px solid #ccc;background:${curVal};border-radius:2px;"></div>
                                    <span>→</span>
                                    <div style="width:24px;height:18px;border:1px solid #ccc;background:${impVal};border-radius:2px;"></div>
                                </div>
                                <div style="font-size:0.6rem; color:var(--text-tertiary);">当前 → 导入</div>
                            </div>`;
                        }
                        groupHtml += '</div></div>';
                        if (groupHasChange) compareHtml += groupHtml;
                    }
                    compareHtml += '</div>';
                    App.modal.showConfirmDialog(
                        `<div style="font-size:0.9rem; margin-bottom:8px;">界面颜色导入对比（仅显示有变化项）：</div>${compareHtml}`,
                        () => {
                            tempInterfaceColors = { ...importedColors };
                            self.updateColorControlsUI();
                            self.renderPreview(document.getElementById('interfacePreviewArea'));
                            App.modal.showAlert('颜色已导入，点击"应用"生效', '成功');
                        },
                        () => {},
                        '导入确认',
                        '导入',
                        '取消'
                    );
                } catch (err) {
                    App.modal.showAlert('非法格式：文件无法解析。', '导入失败');
                }
            };
            reader.readAsText(file);
        },

        renderPanel(container) {
            if (!container) return;
            const controlsContainer = document.getElementById('interfaceColorControls');
            const previewContainer = document.getElementById('interfacePreviewArea');
            if (controlsContainer) this.renderColorControls(controlsContainer);
            if (previewContainer) this.renderPreview(previewContainer);
            this.bindPanelButtons();
        },

        bindPanelButtons() {
            const self = this;

            const applyBtn = document.getElementById('btnApplyInterfaceColors');
            if (applyBtn) {
                applyBtn.onclick = () => {
                    const theme = App.state.isDarkTheme() ? 'dark' : 'light';
                    const stored = getStored();
                    const defaults = getDefaults(theme) || {};
                    stored[theme] = {};
                    for (const varName in tempInterfaceColors) {
                        const value = tempInterfaceColors[varName];
                        if (value && value !== defaults[varName]) {
                            stored[theme][varName] = value;
                            document.documentElement.style.setProperty(varName, value);
                        } else {
                            document.documentElement.style.removeProperty(varName);
                        }
                    }
                    saveStored(stored);

                    if (App.tableStyle) {
                        const bgColors = App.tableStyle.loadTableBgColors();
                        const newOdd = tempInterfaceColors['--group-odd-bg'];
                        const newEven = tempInterfaceColors['--group-even-bg'];
                        if (newOdd) bgColors.odd = newOdd;
                        if (newEven) bgColors.even = newEven;
                        App.tableStyle.saveTableBgColors(bgColors);
                        App.tableStyle.refreshTableBgColors();
                    }

                    initialInterfaceColors = { ...tempInterfaceColors };
                    App.modal.showAlert('界面颜色已应用', '成功');

                    if (App.schemeManager && App.schemeManager.autoSaveToCustomScheme) {
                        App.schemeManager.autoSaveToCustomScheme();
                    }
                };
            }

            const discardBtn = document.getElementById('btnDiscardInterfaceColors');
            if (discardBtn) {
                discardBtn.onclick = () => {
                    tempInterfaceColors = { ...initialInterfaceColors };
                    self.updateColorControlsUI();
                    self.renderPreview(document.getElementById('interfacePreviewArea'));
                };
            }

            const restoreLightBtn = document.getElementById('btnRestoreInterfaceLight');
            if (restoreLightBtn) {
                restoreLightBtn.onclick = () => {
                    tempInterfaceColors = { ...getDefaults('light') };
                    self.updateColorControlsUI();
                    self.renderPreview(document.getElementById('interfacePreviewArea'));
                };
            }

            const restoreDarkBtn = document.getElementById('btnRestoreInterfaceDark');
            if (restoreDarkBtn) {
                restoreDarkBtn.onclick = () => {
                    tempInterfaceColors = { ...getDefaults('dark') };
                    self.updateColorControlsUI();
                    self.renderPreview(document.getElementById('interfacePreviewArea'));
                };
            }

            // 保存到方案
            const saveToSchemeBtn = document.getElementById('btnSaveInterfaceToScheme');
            if (saveToSchemeBtn) {
                saveToSchemeBtn.onclick = () => {
                    if (!App.schemeManager) {
                        App.modal.showAlert('方案管理模块未加载', '错误');
                        return;
                    }
                    const activeId = App.schemeManager.getActiveSchemeId();
                    const schemes = App.schemeManager.getAllSchemes();
                    const scheme = schemes[activeId];
                    if (!scheme) {
                        App.modal.showAlert('当前无激活方案', '错误');
                        return;
                    }
                    if (scheme.builtin) {
                        App.modal.showConfirmDialog(
                            '系统方案不可修改，是否另存为新方案？<br><input type="text" id="schemeSaveAsNameInput" placeholder="请输入新方案名称" maxlength="50" style="width:100%; margin-top:8px;">',
                            () => {
                                const nameInput = document.getElementById('schemeSaveAsNameInput');
                                if (!nameInput) return;
                                const name = nameInput.value.trim();
                                if (name) {
                                    self._saveAsNewScheme(name);
                                } else {
                                    App.modal.showAlert('方案名称不能为空', '提示');
                                }
                            },
                            () => {},
                            '保存到方案',
                            '另存为',
                            '否'
                        );
                        return;
                    }
                    scheme.interfaceColors = { ...tempInterfaceColors };
                    App.schemeManager.saveAllSchemes(schemes);
                    App.modal.showAlert(`已保存到方案 "${scheme.name}"`, '成功');
                };
            }

            // 另存为新方案
            const saveAsBtn = document.getElementById('btnSaveInterfaceAsScheme');
            if (saveAsBtn) {
                saveAsBtn.onclick = () => {
                    App.modal.showConfirmDialog(
                        '请输入新方案名称：<br><input type="text" id="schemeNewNameInput" placeholder="新方案名称" maxlength="50" style="width:100%; margin-top:8px;">',
                        () => {
                            const nameInput = document.getElementById('schemeNewNameInput');
                            if (!nameInput) return;
                            const name = nameInput.value.trim();
                            if (name) {
                                self._saveAsNewScheme(name);
                            } else {
                                App.modal.showAlert('方案名称不能为空', '提示');
                            }
                        },
                        () => {},
                        '另存为新方案',
                        '保存',
                        '取消'
                    );
                };
            }

            // 导出颜色
            const exportBtn = document.getElementById('btnExportInterfaceColors');
            if (exportBtn) {
                exportBtn.onclick = () => {
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const defaultName = `界面颜色_${dateStr}.json`;
                    App.modal.showConfirmDialog(
                        `设置导出文件名：<br><input type="text" id="exportInterfaceFileName" value="${defaultName}" style="width:100%; margin-top:8px;">`,
                        () => {
                            const nameInput = document.getElementById('exportInterfaceFileName');
                            const fileName = nameInput ? nameInput.value.trim() || defaultName : defaultName;
                            const exportData = {
                                type: 'eee_interface_colors',
                                version: '1.0',
                                theme: App.state.isDarkTheme() ? 'dark' : 'light',
                                colors: { ...tempInterfaceColors }
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
                };
            }

            // 导入颜色
            const importBtn = document.getElementById('btnImportInterfaceColors');
            if (importBtn) {
                importBtn.onclick = () => {
                    const fileInput = document.getElementById('interfaceColorImportFile');
                    if (fileInput) fileInput.click();
                };
            }

            const importFile = document.getElementById('interfaceColorImportFile');
            if (importFile) {
                importFile.onchange = (e) => {
                    if (!e.target.files[0]) return;
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const parsed = JSON.parse(ev.target.result);
                            if (parsed.type === 'eee_interface_colors' && parsed.colors) {
                                self.showImportCompare(file);
                            } else if (parsed.type === 'eee_state_color_scheme') {
                                App.modal.showConfirmDialog(
                                    '检测到这是<strong>单元格颜色方案</strong>文件，是否切换到单元格颜色导入？',
                                    () => {
                                        if (App.stateColorSchemeManager && App.stateColorSchemeManager.showImportCompare) {
                                            App.stateColorSchemeManager.showImportCompare(file);
                                        } else {
                                            App.modal.showAlert('单元格颜色方案模块未加载', '错误');
                                        }
                                    },
                                    () => {},
                                    '导入提示',
                                    '导入',
                                    '取消'
                                );
                            } else {
                                App.modal.showAlert('非法格式：文件既不是界面颜色，也不是单元格颜色方案。', '导入失败');
                            }
                        } catch (err) {
                            App.modal.showAlert('非法格式：文件无法解析。', '导入失败');
                        }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                };
            }
        },

        _saveAsNewScheme(name) {
            const settings = {
                theme: App.state.isDarkTheme() ? 'dark' : 'light',
                interfaceColors: { ...tempInterfaceColors },
                size: App.storage.loadTableSize()
            };
            const success = App.schemeManager.saveCurrentAsSchemeWithName(name, settings);
            if (success) {
                App.modal.showAlert(`方案 "${name}" 已创建`, '成功');
            } else {
                App.modal.showAlert('方案名称已存在', '错误');
            }
        }
    };
})(window.App = window.App || {});