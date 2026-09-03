/**
 * state-color-scheme-manager.js - 状态颜色（单元格四色）方案管理
 * 挂载到 App.stateColorSchemeManager
 *
 * 独立于界面颜色方案，仅管理四种状态颜色：
 *   --has-value-bg, --status-none-bg, --status-partial-bg, --status-full-bg
 * 提供默认白天/黑夜方案、用户方案保存/另存、导入导出、自动保存为"用户自定义状态颜色方案"
 */
(function (App) {
    'use strict';

    const C = App.constants;
    const STORAGE_KEY = 'smarttable_state_color_schemes';
    const ACTIVE_KEY = 'smarttable_active_state_color_scheme';
    const DEFAULT_LIGHT_ID = 'default_light';
    const DEFAULT_DARK_ID = 'default_dark';
    const CUSTOM_NAME = '用户自定义方案';

    function getDefaultSchemes() {
        return {
            [DEFAULT_LIGHT_ID]: {
                name: '白天默认状态颜色',
                theme: 'light',
                builtin: true,
                colors: { ...C.DEFAULT_COLORS.light }
            },
            [DEFAULT_DARK_ID]: {
                name: '黑夜默认状态颜色',
                theme: 'dark',
                builtin: true,
                colors: { ...C.DEFAULT_COLORS.dark }
            }
        };
    }

    App.stateColorSchemeManager = {
        getAllSchemes() {
            const stored = App.storage.getJSON(STORAGE_KEY, {});
            return { ...getDefaultSchemes(), ...stored };
        },

        saveAllSchemes(schemes) {
            const userSchemes = {};
            Object.keys(schemes).forEach(id => {
                if (!schemes[id].builtin) {
                    userSchemes[id] = schemes[id];
                }
            });
            App.storage.setJSON(STORAGE_KEY, userSchemes);
        },

        getActiveSchemeId() {
            const stored = App.storage.get(ACTIVE_KEY, '');
            const schemes = this.getAllSchemes();
            if (stored && schemes[stored]) return stored;
            return App.state.isDarkTheme() ? DEFAULT_DARK_ID : DEFAULT_LIGHT_ID;
        },

        setActiveSchemeId(id) {
            App.storage.set(ACTIVE_KEY, id);
        },

        getActiveScheme() {
            const id = this.getActiveSchemeId();
            return this.getAllSchemes()[id] || getDefaultSchemes()[DEFAULT_LIGHT_ID];
        },

        collectCurrentColors() {
            return {
                hasValue: App.colorPreview.getGlobalColor('hasValue'),
                statusNone: App.colorPreview.getGlobalColor('statusNone'),
                statusPartial: App.colorPreview.getGlobalColor('statusPartial'),
                statusFull: App.colorPreview.getGlobalColor('statusFull')
            };
        },

        applyScheme(scheme) {
            if (!scheme || !scheme.colors) return;
            const theme = scheme.theme || (App.state.isDarkTheme() ? 'dark' : 'light');
            const saved = App.storage.loadUserColors(theme) || {};
            for (const type of App.constants.STATUS_TYPES) {
                if (scheme.colors[type]) {
                    document.documentElement.style.setProperty(App.constants.COLOR_VARS[type], scheme.colors[type]);
                    saved[type] = scheme.colors[type];
                }
            }
            App.storage.saveUserColors(theme, saved);
            App.tableRenderer.renderAllTables();

            // 刷新设置面板中的预览（如果已打开）
            if (App.colorPreview && typeof App.colorPreview.initColorPreview === 'function') {
                App.colorPreview.initColorPreview();
            }
        },

        autoSaveToCustomScheme() {
            const schemes = this.getAllSchemes();
            let existingId = null;
            for (const id in schemes) {
                if (schemes[id].name === CUSTOM_NAME && !schemes[id].builtin) {
                    existingId = id;
                    break;
                }
            }
            const colors = this.collectCurrentColors();
            const theme = App.state.isDarkTheme() ? 'dark' : 'light';
            if (existingId) {
                schemes[existingId] = {
                    ...schemes[existingId],
                    theme,
                    colors
                };
                this.saveAllSchemes(schemes);
                this.setActiveSchemeId(existingId);
            } else {
                const id = 'user_' + Date.now();
                schemes[id] = {
                    name: CUSTOM_NAME,
                    builtin: false,
                    theme,
                    colors
                };
                this.saveAllSchemes(schemes);
                this.setActiveSchemeId(id);
            }
        },

        saveToCurrentScheme() {
            const activeId = this.getActiveSchemeId();
            const schemes = this.getAllSchemes();
            const scheme = schemes[activeId];
            if (!scheme) {
                App.modal.showAlert('当前无激活方案', '错误');
                return false;
            }
            if (scheme.builtin) {
                App.modal.showConfirmDialog(
                    '系统方案不可修改，是否另存为新方案？',
                    () => {
                        const name = prompt('请输入新方案名称：');
                        if (name && name.trim()) {
                            this.saveAsNewScheme(name.trim());
                        }
                    },
                    () => {},
                    '保存到方案',
                    '另存为',
                    '否'
                );
                return false;
            }
            scheme.colors = this.collectCurrentColors();
            scheme.theme = App.state.isDarkTheme() ? 'dark' : 'light';
            this.saveAllSchemes(schemes);
            App.modal.showAlert(`已保存到方案 "${scheme.name}"`, '成功');
            return true;
        },

        saveAsNewScheme(name) {
            if (!name) return false;
            const schemes = this.getAllSchemes();
            for (const id in schemes) {
                if (schemes[id].name === name && !schemes[id].builtin) {
                    App.modal.showAlert('方案名称已存在', '错误');
                    return false;
                }
            }
            const id = 'user_' + Date.now();
            schemes[id] = {
                name,
                builtin: false,
                theme: App.state.isDarkTheme() ? 'dark' : 'light',
                colors: this.collectCurrentColors()
            };
            this.saveAllSchemes(schemes);
            this.setActiveSchemeId(id);
            return true;
        },

        deleteScheme(id) {
            const schemes = this.getAllSchemes();
            if (schemes[id] && schemes[id].builtin) return false;
            delete schemes[id];
            this.saveAllSchemes(schemes);
            if (this.getActiveSchemeId() === id) {
                this.setActiveSchemeId(App.state.isDarkTheme() ? DEFAULT_DARK_ID : DEFAULT_LIGHT_ID);
            }
            return true;
        },

        exportScheme(id) {
            const scheme = this.getAllSchemes()[id];
            if (!scheme) return;
            const exportData = {
                type: 'eee_state_color_scheme',
                version: '1.0',
                scheme: {
                    name: scheme.name,
                    theme: scheme.theme,
                    colors: scheme.colors
                }
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `状态颜色方案_${scheme.name}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        importSchemeFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed.type !== 'eee_state_color_scheme') {
                        App.modal.showAlert('非法格式：不是有效的状态颜色方案文件。', '导入失败');
                        return;
                    }
                    // 兼容两种结构
                    const colors = parsed.colors || (parsed.scheme && parsed.scheme.colors);
                    if (!colors) {
                        App.modal.showAlert('非法格式：文件中缺少颜色数据。', '导入失败');
                        return;
                    }
                    const schemes = this.getAllSchemes();
                    const id = 'user_' + Date.now();
                    schemes[id] = {
                        name: parsed.name || (parsed.scheme && parsed.scheme.name) || '导入的状态颜色方案',
                        builtin: false,
                        theme: parsed.theme || (parsed.scheme && parsed.scheme.theme) || 'light',
                        colors: colors
                    };
                    this.saveAllSchemes(schemes);
                    this.setActiveSchemeId(id);
                    this.applyScheme(schemes[id]);
                    App.modal.showAlert('状态颜色方案已导入并应用', '成功');
                } catch (err) {
                    App.modal.showAlert('非法格式：文件无法解析。', '导入失败');
                }
            };
            reader.readAsText(file);
        },

        renderSchemeList() {
            const container = document.getElementById('stateColorSchemeList');
            if (!container) return;
            const schemes = this.getAllSchemes();
            const activeId = this.getActiveSchemeId();
            let html = '';
            for (const id in schemes) {
                const scheme = schemes[id];
                const isActive = id === activeId;
                const badge = scheme.builtin ? '<span class="scheme-item-badge">内置</span>' : '';
                html += `
                    <div class="scheme-item ${isActive ? 'active' : ''}" data-scheme-id="${id}">
                        <span class="scheme-item-name">${App.utils.escapeHtml(scheme.name)} ${badge}</span>
                        <div class="scheme-item-actions">
                            <button class="btn btn-sm btn-outline-gray btn-state-color-scheme-apply" data-scheme-id="${id}">应用</button>
                            ${!scheme.builtin ? `<button class="btn btn-sm btn-outline-gray btn-state-color-scheme-export" data-scheme-id="${id}">导出</button>
                            <button class="btn btn-sm btn-danger btn-state-color-scheme-delete" data-scheme-id="${id}">删除</button>` : ''}
                        </div>
                    </div>`;
            }
            container.innerHTML = html || '<p style="font-size:0.8rem; color:var(--text-tertiary);">暂无状态颜色方案</p>';
            // 更新当前方案名称显示
            const activeScheme = schemes[activeId];
            const nameEl = document.getElementById('stateColorSchemeCurrentName');
            if (nameEl && activeScheme) nameEl.textContent = activeScheme.name;
        },
        
        bindListEvents() {
            const list = document.getElementById('stateColorSchemeList');
            if (!list) return;
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const id = btn.dataset.schemeId;
                if (btn.classList.contains('btn-state-color-scheme-apply')) {
                    const schemes = this.getAllSchemes();
                    if (schemes[id]) {
                        this.setActiveSchemeId(id);
                        this.applyScheme(schemes[id]);
                        this.renderSchemeList();
                        App.modal.showAlert(`已切换到状态颜色方案 "${schemes[id].name}"`, '成功');
                    }
                } else if (btn.classList.contains('btn-state-color-scheme-export')) {
                    this.exportScheme(id);
                } else if (btn.classList.contains('btn-state-color-scheme-delete')) {
                    const schemes = this.getAllSchemes();
                    const name = schemes[id] ? schemes[id].name : '';
                    App.modal.showConfirmDialog(
                        `确定要删除状态颜色方案 "${name}" 吗？`,
                        () => {
                            if (this.deleteScheme(id)) {
                                this.renderSchemeList();
                                App.modal.showAlert('状态颜色方案已删除', '成功');
                            }
                        },
                        () => {}
                    );
                }
            });
        },
        
        bindActionButtons() {
            const saveBtn = document.getElementById('btnStateColorSchemeSave');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const nameInput = document.getElementById('stateColorSchemeNewName');
                    if (!nameInput) return;
                    const name = nameInput.value.trim();
                    if (!name) {
                        App.modal.showAlert('请输入方案名称', '提示');
                        return;
                    }
                    if (this.saveAsNewScheme(name)) {
                        App.modal.showAlert(`状态颜色方案 "${name}" 已保存`, '成功');
                        nameInput.value = '';
                        this.renderSchemeList();
                    }
                });
            }
        
            const exportBtn = document.getElementById('btnStateColorSchemeExport');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportScheme(this.getActiveSchemeId());
                });
            }
        
            const importBtn = document.getElementById('btnStateColorSchemeImport');
            if (importBtn) {
                importBtn.addEventListener('click', () => {
                    const fileInput = document.getElementById('stateColorSchemeImportFile');
                    if (fileInput) fileInput.click();
                });
            }
        
            const importFile = document.getElementById('stateColorSchemeImportFile');
            if (importFile) {
                importFile.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.importSchemeFile(e.target.files[0]);
                        e.target.value = '';
                    }
                });
            }
        },

        showImportCompare(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed.type !== 'eee_state_color_scheme') {
                        App.modal.showAlert('非法格式：不是有效的状态颜色方案文件。', '导入失败');
                        return;
                    }
                    const importedColors = parsed.colors || (parsed.scheme && parsed.scheme.colors);
                    if (!importedColors) {
                        App.modal.showAlert('非法格式：文件中缺少颜色数据。', '导入失败');
                        return;
                    }
                    // 获取当前全局颜色
                    const current = {
                        hasValue: App.colorPreview.getGlobalColor('hasValue'),
                        statusNone: App.colorPreview.getGlobalColor('statusNone'),
                        statusPartial: App.colorPreview.getGlobalColor('statusPartial'),
                        statusFull: App.colorPreview.getGlobalColor('statusFull')
                    };
                    const labels = {
                        hasValue: '已拥有',
                        statusNone: '未获取',
                        statusPartial: '部分获取',
                        statusFull: '全部获取'
                    };
                    let compareHtml = '<div style="display:flex; gap:20px; flex-wrap:wrap;">';
                    for (const type of App.constants.STATUS_TYPES) {
                        const curVal = current[type] || '#ffffff';
                        const impVal = importedColors[type] || curVal;
                        compareHtml += `
                        <div style="text-align:center;">
                            <div style="font-size:0.8rem; margin-bottom:4px;">${labels[type]}</div>
                            <div style="display:flex; gap:8px; align-items:center;">
                                <div>
                                    <div style="width:30px;height:20px;border:1px solid #ccc;background:${curVal};border-radius:3px;"></div>
                                    <div style="font-size:0.65rem; color:var(--text-tertiary);">当前</div>
                                </div>
                                <span>→</span>
                                <div>
                                    <div style="width:30px;height:20px;border:1px solid #ccc;background:${impVal};border-radius:3px;"></div>
                                    <div style="font-size:0.65rem; color:var(--text-tertiary);">导入</div>
                                </div>
                            </div>
                        </div>`;
                    }
                    compareHtml += '</div>';
        
                    App.modal.showConfirmDialog(
                        `<div style="font-size:0.9rem; margin-bottom:8px;">状态颜色导入对比：</div>${compareHtml}`,
                        () => {
                            // 确认后执行实际导入
                            this.importSchemeFile(file);
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
        
        initPanel() {
            this.renderSchemeList();
            this.bindListEvents();
            this.bindActionButtons();
        }
    };

})(window.App = window.App || {});