/**
 * storage-manager.js - 存储管理面板
 * 挂载到 App.storageManager
 *
 * 功能：
 * - 显示浏览器存储配额、已用空间、剩余空间
 * - 计算并展示各数据类型（数据集、备注、设置、图片 IndexedDB、其他）的占用
 * - 展示每个数据集的详细统计（名称、大小、图片数量）
 * - 支持自定义配额上限与警示百分比
 * - 点击刷新时展示完整计算过程日志
 * - 刷新具有视觉反馈（按钮状态 + 进度条动画）
 */
(function (App) {
    'use strict';

    // 自定义配额存储键
    const QUOTA_KEY = 'smarttable_custom_quota';
    const WARN_PERCENT_KEY = 'smarttable_quota_warn_percent';
    const DEFAULT_WARN_PERCENT = 80;

    /** 格式化字节数为可读字符串 */
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }

    /** 获取单个 localStorage 键的占用字节数（UTF-16 近似，每个字符 2 字节） */
    function getLocalStorageSize(key) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return 0;
            return value.length * 2;
        } catch (e) {
            return 0;
        }
    }

    /** 获取所有 localStorage 键名数组 */
    function getAllLocalStorageKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i));
        }
        return keys;
    }

    /** 计算各分类占用 */
    function calculateCategorySizes() {
        const datasetList = App.storage.getDatasetList();
        const datasetKeys = new Set(datasetList);
        const remarksKey = App.constants.REMARKS_STORAGE_KEY;
        const settingKeys = [
            App.constants.STORAGE_KEY_THEME,
            App.constants.DATASET_LIST_KEY,
            App.constants.CURRENT_DATASET_KEY,
            App.constants.USER_COLORS_STORAGE_KEY,
            App.constants.INTERFACE_COLORS_STORAGE_KEY,
            App.constants.STYLE_STORAGE_KEY,
            App.constants.TABLE_BG_STORAGE_KEY,
            App.constants.NOTE_TOOLTIP_LAYOUT_KEY,
            App.constants.NOTE_TOOLTIP_POS_KEY,
            App.constants.RIGHT_COLLAPSED_KEY,
            'smarttable_schemes',
            'smarttable_active_scheme',
            'smarttable_state_color_schemes',
            'smarttable_active_state_color_scheme',
            QUOTA_KEY,
            WARN_PERCENT_KEY
        ];

        let datasetsSize = 0;
        let remarksSize = 0;
        let settingsSize = 0;
        let otherLocalStorageSize = 0;

        const allKeys = getAllLocalStorageKeys();
        allKeys.forEach(key => {
            const size = getLocalStorageSize(key);
            if (key === remarksKey) {
                remarksSize += size;
            } else if (datasetKeys.has(key)) {
                datasetsSize += size;
            } else if (settingKeys.includes(key)) {
                settingsSize += size;
            } else {
                otherLocalStorageSize += size;
            }
        });

        return { datasetsSize, remarksSize, settingsSize, otherLocalStorageSize };
    }

    /** 获取 IndexedDB 图片占用（通过 estimate 减去 localStorage 总量） */
    async function getIndexedDBSize() {
        try {
            const estimate = await navigator.storage.estimate();
            const totalUsage = estimate.usage || 0;
            let localStorageTotal = 0;
            const allKeys = getAllLocalStorageKeys();
            allKeys.forEach(key => { localStorageTotal += getLocalStorageSize(key); });
            return Math.max(0, totalUsage - localStorageTotal);
        } catch (e) {
            return 0;
        }
    }

    /** 读取自定义配额（字节），未设置或非法时返回 0 */
    function getCustomQuota() {
        const bytes = parseInt(localStorage.getItem(QUOTA_KEY) || '0', 10);
        return bytes > 0 ? bytes : 0;
    }

    /** 保存自定义配额（字节） */
    function setCustomQuota(bytes) {
        localStorage.setItem(QUOTA_KEY, bytes);
    }

    /** 读取警示百分比 */
    function getWarnPercent() {
        const p = parseInt(localStorage.getItem(WARN_PERCENT_KEY) || DEFAULT_WARN_PERCENT, 10);
        return Math.min(100, Math.max(1, p));
    }

    /** 保存警示百分比 */
    function setWarnPercent(p) {
        localStorage.setItem(WARN_PERCENT_KEY, p);
    }

    /**
     * 计算所有数据集的大小及图片数量
     * @returns {Array<{name: string, size: number, imageCount: number}>}
     */
    function calculateDatasetStats() {
        const datasetList = App.storage.getDatasetList();
        const stats = [];

        datasetList.forEach(name => {
            const raw = localStorage.getItem(name);
            let size = 0;
            let imageCount = 0;

            if (raw !== null) {
                size = raw.length * 2; // UTF-16 近似
                try {
                    const rows = JSON.parse(raw);
                    if (Array.isArray(rows)) {
                        rows.forEach(row => {
                            if (row && row.data) {
                                row.data.forEach(cell => {
                                    const note = cell && cell.note;
                                    if (note && Array.isArray(note.images)) {
                                        imageCount += note.images.length;
                                    }
                                });
                            }
                        });
                    }
                } catch (e) {
                    // 解析失败时忽略图片统计
                }
            }

            stats.push({ name, size, imageCount });
        });

        // 按大小降序排列
        stats.sort((a, b) => b.size - a.size);
        return stats;
    }

    /**
     * 渲染数据集详细列表
     */
    function renderDatasetList() {
        const container = document.getElementById('datasetStorageList');
        if (!container) return;

        const stats = calculateDatasetStats();
        if (stats.length === 0) {
            container.innerHTML = '<div class="storage-empty-hint">暂无数据集</div>';
            return;
        }

        const maxSize = Math.max(...stats.map(s => s.size), 1);
        let html = '';
        stats.forEach(ds => {
            const safeName = App.utils.escapeHtml(ds.name);
            const percent = (ds.size / maxSize) * 100;
            html += `
                <div class="dataset-storage-item">
                    <div class="dataset-storage-header">
                        <span class="dataset-storage-name">${safeName}</span>
                        <span class="dataset-storage-size">${formatBytes(ds.size)}</span>
                    </div>
                    <div class="dataset-storage-meta">
                        <span>图片数量：${ds.imageCount}</span>
                    </div>
                    <div class="detail-bar">
                        <div class="detail-bar-fill" style="width:${percent.toFixed(2)}%"></div>
                    </div>
                </div>`;
        });
        container.innerHTML = html;
    }

    App.storageManager = {
        _isRefreshing: false,
        _logLines: [],

        /** 向日志区域添加一行文本 */
        _addLog(line) {
            this._logLines.push(line);
        },

        /** 渲染日志到 DOM */
        _renderLog() {
            const logContainer = document.getElementById('storageProcessLog');
            if (!logContainer) return;
            if (this._logLines.length === 0) {
                logContainer.style.display = 'none';
                logContainer.innerHTML = '';
                return;
            }
            logContainer.style.display = 'block';
            logContainer.innerHTML = this._logLines
                .map(line => `<div class="storage-log-line">${App.utils.escapeHtml(line)}</div>`)
                .join('');
            logContainer.scrollTop = logContainer.scrollHeight;
        },

        /**
         * 刷新存储使用情况并更新面板
         */
        async refreshUsage() {
            if (this._isRefreshing) return;
            this._isRefreshing = true;
            this._logLines = [];
            this._renderLog();   // ← 立即清空显示（隐藏容器）

            const refreshBtn = document.getElementById('btnRefreshStorage');
            const progressFill = document.getElementById('storageProgressBar');

            // 填充输入框当前值
            const currentQuota = getCustomQuota();
            const currentWarnPercent = getWarnPercent();
            const quotaInput = document.getElementById('customQuotaInput');
            const warnInput = document.getElementById('warnPercentInput');
            if (quotaInput) quotaInput.value = currentQuota > 0 ? currentQuota / (1024 * 1024) : 100;
            if (warnInput) warnInput.value = currentWarnPercent;

            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = '刷新中...';
                refreshBtn.classList.add('btn-refreshing');
            }
            if (progressFill) {
                progressFill.classList.add('storage-progress-fill-refreshing');
            }

            this._addLog('开始存储分析...');
            this._renderLog();

            try {
                // 获取浏览器存储估计
                let quota = 0, usage = 0;
                if (navigator.storage && navigator.storage.estimate) {
                    this._addLog('调用 navigator.storage.estimate() ...');
                    const estimate = await navigator.storage.estimate();
                    quota = estimate.quota || 0;
                    usage = estimate.usage || 0;
                    this._addLog(`  → quota = ${formatBytes(quota)}, usage = ${formatBytes(usage)}`);
                } else {
                    this._addLog('当前浏览器不支持 storage.estimate()，无法获取配额。');
                }
                this._renderLog();

                // 计算 localStorage 分类
                this._addLog('开始扫描 localStorage ...');
                const { datasetsSize, remarksSize, settingsSize, otherLocalStorageSize } = calculateCategorySizes();
                this._addLog(`  数据集占用: ${formatBytes(datasetsSize)}`);
                this._addLog(`  备注占用: ${formatBytes(remarksSize)}`);
                this._addLog(`  设置占用: ${formatBytes(settingsSize)}`);
                this._addLog(`  其他 localStorage 占用: ${formatBytes(otherLocalStorageSize)}`);
                this._renderLog();

                // 估算 IndexedDB 占用
                this._addLog('估算 IndexedDB 图片占用 ...');
                const imagesSize = await getIndexedDBSize();
                this._addLog(`  → 图片占用: ${formatBytes(imagesSize)}`);
                this._renderLog();

                // 渲染数据集详细列表
                this._addLog('渲染数据集详细列表 ...');
                renderDatasetList();
                this._renderLog();

                // 确定有效配额（自定义优先）
                const customQuota = getCustomQuota();
                const effectiveQuota = customQuota > 0 ? customQuota : quota;
                const warnPercent = getWarnPercent();
                const percent = effectiveQuota > 0 ? (usage / effectiveQuota) * 100 : 0;

                this._addLog(`有效配额: ${customQuota > 0 ? formatBytes(customQuota) + ' (自定义)' : formatBytes(quota)}`);
                this._addLog(`使用百分比: ${percent.toFixed(2)}% (警示线: ${warnPercent}%)`);
                this._renderLog();

                // 更新顶部总览
                if (document.getElementById('storageQuota')) {
                    document.getElementById('storageQuota').textContent =
                        customQuota > 0 ? formatBytes(customQuota) + ' (自定义)' : formatBytes(quota);
                    document.getElementById('storageUsage').textContent = formatBytes(usage);
                    document.getElementById('storageRemaining').textContent =
                        customQuota > 0 ? formatBytes(Math.max(0, customQuota - usage)) : formatBytes(Math.max(0, quota - usage));
                    document.getElementById('storageProgressBar').style.width = percent.toFixed(2) + '%';
                }

                // 更新明细
                if (document.getElementById('storageDatasets')) {
                    document.getElementById('storageDatasets').textContent = formatBytes(datasetsSize);
                    document.getElementById('storageRemarks').textContent = formatBytes(remarksSize);
                    document.getElementById('storageSettings').textContent = formatBytes(settingsSize);
                    document.getElementById('storageImages').textContent = formatBytes(imagesSize);
                    document.getElementById('storageOther').textContent = formatBytes(otherLocalStorageSize);

                    const total = usage > 0 ? usage : 1;
                    document.getElementById('barDatasets').style.width = ((datasetsSize / total) * 100).toFixed(2) + '%';
                    document.getElementById('barRemarks').style.width = ((remarksSize / total) * 100).toFixed(2) + '%';
                    document.getElementById('barSettings').style.width = ((settingsSize / total) * 100).toFixed(2) + '%';
                    document.getElementById('barImages').style.width = ((imagesSize / total) * 100).toFixed(2) + '%';
                    document.getElementById('barOther').style.width = ((otherLocalStorageSize / total) * 100).toFixed(2) + '%';
                }

                // 更新警示状态
                const progressBar = document.getElementById('storageProgressBar');
                const quotaStatusMsg = document.getElementById('quotaStatusMessage');
                if (progressBar) {
                    progressBar.classList.remove('storage-progress-warn', 'storage-progress-danger');
                }
                if (quotaStatusMsg) {
                    if (customQuota > 0) {
                        if (percent >= 100) {
                            quotaStatusMsg.innerHTML = '<span style="color:var(--danger-primary);">⚠️ 已超过自定义配额！</span>';
                            if (progressBar) progressBar.classList.add('storage-progress-danger');
                        } else if (percent >= warnPercent) {
                            quotaStatusMsg.innerHTML = `<span style="color:#f0ad4e;">⚠️ 已使用 ${percent.toFixed(1)}%，接近或达到警示线 ${warnPercent}%</span>`;
                            if (progressBar) progressBar.classList.add('storage-progress-warn');
                        } else {
                            quotaStatusMsg.innerHTML = `<span style="color:var(--success-primary);">✅ 使用正常 (${percent.toFixed(1)}%)</span>`;
                        }
                    } else {
                        quotaStatusMsg.innerHTML = '<span style="color:var(--text-tertiary);">未设置自定义配额，使用浏览器默认配额</span>';
                    }
                }

                this._addLog('计算完成。');
                this._renderLog();

                // 短暂延迟保证视觉反馈
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
                console.warn('刷新存储信息失败:', err);
                this._addLog('错误：' + (err && err.message ? err.message : err));
                if (document.getElementById('storageQuota')) {
                    document.getElementById('storageQuota').textContent = '不可用';
                    document.getElementById('storageUsage').textContent = '不可用';
                    document.getElementById('storageRemaining').textContent = '不可用';
                }
                this._renderLog();
            } finally {
                this._isRefreshing = false;
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = '刷新';
                    refreshBtn.classList.remove('btn-refreshing');
                }
                if (progressFill) {
                    progressFill.classList.remove('storage-progress-fill-refreshing');
                }
            }
        },

        /**
         * 渲染存储管理面板（首次打开时调用）
         */
        renderPanel(container) {
            if (!container) return;
            this.refreshUsage();
        },

        /**
         * 绑定存储管理事件（刷新按钮、保存配额按钮）
         */
        bindStorageEvents() {
            const refreshBtn = document.getElementById('btnRefreshStorage');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refreshUsage());
            }

            const saveBtn = document.getElementById('btnSaveQuota');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const quotaMB = parseInt(document.getElementById('customQuotaInput').value, 10);
                    const warnPercent = parseInt(document.getElementById('warnPercentInput').value, 10);
                    if (isNaN(quotaMB) || quotaMB < 1) {
                        App.modal.showAlert('配额必须大于 0 MB', '错误');
                        return;
                    }
                    if (isNaN(warnPercent) || warnPercent < 1 || warnPercent > 100) {
                        App.modal.showAlert('警示百分比必须在 1-100 之间', '错误');
                        return;
                    }
                    setCustomQuota(quotaMB * 1024 * 1024);
                    setWarnPercent(warnPercent);
                    this.refreshUsage();
                    App.modal.showAlert('配额设置已保存', '成功');
                });
            }
        }
    };
})(window.App = window.App || {});