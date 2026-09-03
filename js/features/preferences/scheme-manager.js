/**
 * scheme-manager.js - 个性化方案管理
 * 挂载到 App.schemeManager
 *
 * 方案包含：
 * - 四种状态颜色（hasValue / statusNone / statusPartial / statusFull）
 * - 表格底色（奇数行 / 偶数行）
 * - 表格尺寸（列宽 / 行高）
 *
 * 默认方案："白天默认方案" 和 "黑夜默认方案"
 * 用户可保存当前设置为自定义方案、切换方案、导出/导入方案 JSON
 */
(function (App) {
    'use strict';

    const SCHEME_STORAGE_KEY = 'smarttable_schemes';
    const ACTIVE_SCHEME_KEY = 'smarttable_active_scheme';

    const DEFAULT_LIGHT_ID = 'default_light';
    const DEFAULT_DARK_ID = 'default_dark';

    function getDefaultSchemes() {
        const C = App.constants;
        return {
            [DEFAULT_LIGHT_ID]: {
                name: '白天默认方案',
                theme: 'light',
                builtin: true,
                interfaceColors: { ...C.DEFAULT_INTERFACE_COLORS_LIGHT },
                statusColors: { ...C.DEFAULT_COLORS.light },
                bgColors: { odd: '#f8fafc', even: '#eaf0f6' },
                size: { colWidth: 36, rowHeight: 24 }
            },
            [DEFAULT_DARK_ID]: {
                name: '黑夜默认方案',
                theme: 'dark',
                builtin: true,
                interfaceColors: { ...C.DEFAULT_INTERFACE_COLORS_DARK },
                statusColors: { ...C.DEFAULT_COLORS.dark },
                bgColors: { odd: '#0f1722', even: '#1b2636' },
                size: { colWidth: 36, rowHeight: 24 }
            }
        };
    }

    App.schemeManager = {
        /**
         * 获取所有方案（含内置默认方案）
         */
        getAllSchemes() {
            const stored = App.storage.getJSON(SCHEME_STORAGE_KEY, {});
            const defaults = getDefaultSchemes();
            return { ...defaults, ...stored };
        },

        /**
         * 保存所有方案（仅保存用户方案，内置方案不持久化）
         */
        saveAllSchemes(schemes) {
            const userSchemes = {};
            Object.keys(schemes).forEach(key => {
                if (!schemes[key].builtin) {
                    userSchemes[key] = schemes[key];
                }
            });
            App.storage.setJSON(SCHEME_STORAGE_KEY, userSchemes);
        },

        /**
         * 获取当前激活方案 ID
         */
        getActiveSchemeId() {
            const stored = App.storage.get(ACTIVE_SCHEME_KEY, '');
            const schemes = this.getAllSchemes();
            if (stored && schemes[stored]) return stored;
            return App.state.isDarkTheme() ? DEFAULT_DARK_ID : DEFAULT_LIGHT_ID;
        },

        /**
         * 设置当前激活方案 ID
         */
        setActiveSchemeId(id) {
            App.storage.set(ACTIVE_SCHEME_KEY, id);
        },

        /**
         * 获取当前激活方案数据
         */
        getActiveScheme() {
            const id = this.getActiveSchemeId();
            return this.getAllSchemes()[id] || getDefaultSchemes()[DEFAULT_LIGHT_ID];
        },

        /**
         * 收集当前界面所有个性化设置
         */
        collectCurrentSettings() {
            const theme = App.state.isDarkTheme() ? 'dark' : 'light';
            return {
                theme,
                interfaceColors: App.interfaceColors ? App.interfaceColors.getCustom(theme) : {},
                size: App.storage.loadTableSize()
            };
        },

        autoSaveToCustomScheme() {
            const name = '用户自定义方案';
            const schemes = this.getAllSchemes();
        
            // 查找是否已存在同名的用户方案（非内置）
            let existingId = null;
            for (const id in schemes) {
                if (schemes[id].name === name && !schemes[id].builtin) {
                    existingId = id;
                    break;
                }
            }
        
            const settings = this.collectCurrentSettings();
        
            if (existingId) {
                // 更新现有方案
                schemes[existingId] = {
                    ...schemes[existingId],
                    ...settings
                };
                this.saveAllSchemes(schemes);
                this.setActiveSchemeId(existingId);
            } else {
                // 创建新方案
                const id = 'user_' + Date.now();
                schemes[id] = {
                    name,
                    builtin: false,
                    ...settings
                };
                this.saveAllSchemes(schemes);
                this.setActiveSchemeId(id);
            }
        
            // 刷新方案列表显示（若面板已打开）
            if (typeof this.renderSchemeList === 'function') {
                this.renderSchemeList();
            }
        },

        /**
         * 应用方案到界面
         */
        applyScheme(scheme) {
            // 应用主题
            if (scheme.theme && scheme.theme !== (App.state.isDarkTheme() ? 'dark' : 'light')) {
                App.theme.applyTheme(scheme.theme);
            }
        
            // 应用界面颜色（包含表格底色，因为已合并进 interfaceColors）
            if (scheme.interfaceColors && App.interfaceColors) {
                App.interfaceColors.applyColors(scheme.theme || (App.state.isDarkTheme() ? 'dark' : 'light'), scheme.interfaceColors);
            }
        
            // 应用状态颜色
            if (scheme.statusColors && App.colorPreview) {
                const theme = scheme.theme || (App.state.isDarkTheme() ? 'dark' : 'light');
                const saved = App.storage.loadUserColors(theme) || {};
                for (const type of App.constants.STATUS_TYPES) {
                    if (scheme.statusColors[type]) {
                        document.documentElement.style.setProperty(App.constants.COLOR_VARS[type], scheme.statusColors[type]);
                        saved[type] = scheme.statusColors[type];
                    }
                }
                App.storage.saveUserColors(theme, saved);
            }
        
            // 应用表格底色（兼容旧方案，或独立设置）
            if (scheme.bgColors && App.tableStyle) {
                App.tableStyle.saveTableBgColors(scheme.bgColors);
                App.tableStyle.applyTableBgColors(scheme.bgColors);
                App.tableStyle.updateTableBgColorUI(scheme.bgColors);
            }
        
            // 应用表格尺寸
            if (scheme.size) {
                App.tableStyle.applyStyle(scheme.size.colWidth, scheme.size.rowHeight);
                if (App.dom.colWidthInput) App.dom.colWidthInput.value = scheme.size.colWidth;
                if (App.dom.colWidthSlider) App.dom.colWidthSlider.value = scheme.size.colWidth;
                if (App.dom.colWidthValue) App.dom.colWidthValue.textContent = scheme.size.colWidth;
                if (App.dom.rowHeightInput) App.dom.rowHeightInput.value = scheme.size.rowHeight;
                if (App.dom.rowHeightSlider) App.dom.rowHeightSlider.value = scheme.size.rowHeight;
                if (App.dom.rowHeightValue) App.dom.rowHeightValue.textContent = scheme.size.rowHeight;
            }
        
            App.tableRenderer.renderAllTables();
        },

        /**
         * 保存当前设置为新方案（原方法）
         */
        saveCurrentAsScheme(name) {
            if (!name || !name.trim()) return false;
            const trimmedName = name.trim();
            const settings = this.collectCurrentSettings();
            return this.saveCurrentAsSchemeWithName(trimmedName, settings);
        },

        /**
         * 使用指定设置创建新方案
         * @param {string} name - 方案名称
         * @param {Object} settings - 包含 theme, colors, bgColors, size
         * @returns {boolean} 是否成功
         */
        saveCurrentAsSchemeWithName(name, settings) {
            if (!name || !name.trim()) return false;
            const trimmed = name.trim();
            const schemes = this.getAllSchemes();
            for (const key in schemes) {
                if (schemes[key].name === trimmed && !schemes[key].builtin) return false;
            }
            const id = 'user_' + Date.now();
            schemes[id] = {
                name: trimmed,
                builtin: false,
                ...settings
            };
            this.saveAllSchemes(schemes);
            this.setActiveSchemeId(id);
            return true;
        },

        /**
         * 删除方案
         */
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

        /**
         * 导出方案为 JSON 文件
         */
        exportScheme(id) {
            const schemes = this.getAllSchemes();
            const scheme = schemes[id];
            if (!scheme) return;
            const exportData = {
                type: 'eee_scheme',
                version: '1.0',
                scheme: {
                    name: scheme.name,
                    ...scheme
                }
            };
            delete exportData.scheme.builtin;
            delete exportData.scheme.id;
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `方案_${scheme.name}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        /**
         * 导入方案 JSON 文件
         */
        importSchemeFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (parsed.type !== 'eee_scheme' || !parsed.scheme) {
                        App.modal.showAlert('无效的方案文件格式。', '导入失败');
                        return;
                    }
                    const scheme = parsed.scheme;
                    if (!scheme.name) {
                        App.modal.showAlert('方案缺少名称。', '导入失败');
                        return;
                    }
                    const schemes = this.getAllSchemes();
                    const id = 'user_' + Date.now();
                    schemes[id] = {
                        name: scheme.name,
                        builtin: false,
                        theme: scheme.theme || 'light',
                        colors: scheme.colors || {},
                        bgColors: scheme.bgColors || {},
                        size: scheme.size || { colWidth: 36, rowHeight: 24 }
                    };
                    this.saveAllSchemes(schemes);
                    this.setActiveSchemeId(id);
                    this.renderSchemeList();
                    App.modal.showAlert(`方案 "${scheme.name}" 已导入。`, '导入成功');
                } catch (err) {
                    App.modal.showAlert('解析方案文件失败。', '导入失败');
                }
            };
            reader.readAsText(file);
        },

        /**
         * 渲染方案列表
         */
        renderSchemeList() {
            const container = document.getElementById('schemeList');
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
                        <button class="btn btn-sm btn-outline-gray btn-scheme-apply" data-scheme-id="${id}">应用</button>
                        ${!scheme.builtin ? `<button class="btn btn-sm btn-outline-gray btn-scheme-export" data-scheme-id="${id}">导出</button>
                        <button class="btn btn-sm btn-danger btn-scheme-delete" data-scheme-id="${id}">删除</button>` : ''}
                    </div>
                </div>`;
            }
            container.innerHTML = html || '<p style="font-size:0.8rem; color:var(--text-tertiary);">暂无方案</p>';
            const activeScheme = schemes[activeId];
            const nameEl = document.getElementById('schemeCurrentName');
            if (nameEl && activeScheme) nameEl.textContent = activeScheme.name;
        },

        /**
         * 绑定方案管理事件
         */
        bindSchemeEvents() {
            const dom = App.dom;

            // 保存当前为方案（方案管理面板中的输入框）
            if (dom.btnSchemeSave) {
                dom.btnSchemeSave.addEventListener('click', () => {
                    const nameInput = document.getElementById('schemeNewName');
                    if (!nameInput) return;
                    const name = nameInput.value.trim();
                    if (!name) {
                        App.modal.showAlert('请输入方案名称。', '提示');
                        return;
                    }
                    const success = this.saveCurrentAsScheme(name);
                    if (success) {
                        App.modal.showAlert(`方案 "${name}" 已保存。`, '成功');
                        nameInput.value = '';
                        this.renderSchemeList();
                    } else {
                        App.modal.showAlert('方案名称已存在或无效。', '提示');
                    }
                });
            }

            // 方案列表事件委托
            const schemeList = document.getElementById('schemeList');
            if (schemeList) {
                schemeList.addEventListener('click', (e) => {
                    const btn = e.target.closest('button');
                    if (!btn) return;
                    const id = btn.dataset.schemeId;
                    if (btn.classList.contains('btn-scheme-apply')) {
                        const schemes = this.getAllSchemes();
                        if (schemes[id]) {
                            this.setActiveSchemeId(id);
                            this.applyScheme(schemes[id]);
                            this.renderSchemeList();
                            App.modal.showAlert(`已切换到方案 "${schemes[id].name}"。`, '成功');
                        }
                    } else if (btn.classList.contains('btn-scheme-export')) {
                        this.exportScheme(id);
                    } else if (btn.classList.contains('btn-scheme-delete')) {
                        const schemes = this.getAllSchemes();
                        const name = schemes[id] ? schemes[id].name : '';
                        App.modal.showConfirmDialog(
                            `确定要删除方案 "${name}" 吗？`,
                            () => {
                                if (this.deleteScheme(id)) {
                                    this.renderSchemeList();
                                    App.modal.showAlert('方案已删除。', '成功');
                                }
                            },
                            () => {}
                        );
                    }
                });
            }

            // 导出方案按钮（导出当前激活方案）
            if (dom.btnSchemeExport) {
                dom.btnSchemeExport.addEventListener('click', () => {
                    this.exportScheme(this.getActiveSchemeId());
                });
            }

            // 导入方案按钮
            if (dom.btnSchemeImport) {
                dom.btnSchemeImport.addEventListener('click', () => {
                    const fileInput = document.getElementById('schemeImportFile');
                    if (fileInput) fileInput.click();
                });
            }
            const fileInput = document.getElementById('schemeImportFile');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.importSchemeFile(e.target.files[0]);
                        e.target.value = '';
                    }
                });
            }
        }
    };

})(window.App = window.App || {});