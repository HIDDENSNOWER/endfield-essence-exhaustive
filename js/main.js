/**
 * main.js - 应用入口
 * 包含：初始化流程、面板切换、数据集备注处理、数据集保护 UI、默认数据集外部数据加载
 */

// ========== 固定备注定义 ==========
const DEFAULT_REMARK = "1-26.07.16 “向渊行”版本完整实装基质列表\n2-“用户新建数据集默认模板”";
const SAMPLE_DATASET_KEY = '数据示例-表格样式参考';
const SAMPLE_REMARK = "1-数据表单元格 数据填充状态预览\n2-每次重新进入时随机刷新填充效果，仅供效果参考";

// ========== 全局状态变量 ==========
let defaultDatasetLoadingStarted = false;

// ========== 轻量提示 Toast ==========
/**
 * 显示短暂提示（非模态，自动消失）
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'info'
 */
function showTemporaryHint(message, type = 'info') {
    const hint = document.createElement('div');
    hint.className = `temp-hint temp-hint-${type}`;
    hint.textContent = message;
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add('show'), 10);
    setTimeout(() => {
        hint.classList.remove('show');
        setTimeout(() => hint.remove(), 300);
    }, 3000);
}

// ========== 默认数据集加载指示器 ==========
/**
 * 显示默认数据集加载指示器
 * @param {string} text - 提示文本
 */
function showDefaultDatasetLoading(text = '正在加载默认数据集...') {
    const el = document.getElementById('defaultDatasetLoading');
    if (!el) return;
    document.getElementById('defaultDatasetLoadingText').textContent = text;
    document.getElementById('defaultDatasetProgress').style.width = '0%';
    el.style.display = 'flex';
}

/**
 * 更新默认数据集加载进度
 * @param {number} percent - 0~100
 * @param {string} [text] - 可选提示文本
 */
function updateDefaultDatasetProgress(percent, text) {
    const el = document.getElementById('defaultDatasetLoading');
    if (!el || el.style.display === 'none') return;
    if (percent !== undefined) {
        document.getElementById('defaultDatasetProgress').style.width = Math.min(100, Math.max(0, percent)) + '%';
    }
    if (text) {
        document.getElementById('defaultDatasetLoadingText').textContent = text;
    }
}

/**
 * 隐藏默认数据集加载指示器
 */
function hideDefaultDatasetLoading() {
    const el = document.getElementById('defaultDatasetLoading');
    if (el) el.style.display = 'none';
}

// ========== 默认数据集加载 ==========
/**
 * 从 data/data.json 加载默认数据集（支持进度回调）
 * @param {Function} onProgress - 进度回调 (percent, message)
 * @returns {Promise<Array>}
 */
async function loadDefaultDataset(onProgress) {
    if (typeof onProgress !== 'function') onProgress = () => {};
    
    try {
        onProgress(5, '正在获取 data.json ...');
        const response = await fetch('data/data.json');
        if (!response.ok) throw new Error('Failed to load data/data.json');
        const json = await response.json();

        let rows = json.rows || json;
        if (!Array.isArray(rows)) throw new Error('Invalid format');

        // 统计需要转换的图片总数
        let totalImages = 0;
        for (const row of rows) {
            for (const cell of row.data) {
                const note = cell.note;
                if (note && note.images && note.images.length > 0) {
                    totalImages += note.images.length;
                }
            }
        }
        let processedImages = 0;

        onProgress(15, `正在转换图片 (0/${totalImages}) ...`);

        // 转换图片引用为 Data URL
        rows = await resolveDefaultImages(rows, (imgDone, imgTotal) => {
            processedImages = imgDone;
            const percent = 15 + Math.floor((processedImages / totalImages) * 80); // 15%~95%
            onProgress(percent, `正在转换图片 (${processedImages}/${totalImages}) ...`);
        });

        onProgress(100, '默认数据加载完成');
        return rows;
    } catch (e) {
        console.warn('默认数据集加载失败，使用空数据', e);
        onProgress(0, '加载失败，使用空数据');
        return createInitialRows();
    }
}

/**
 * 将 rows 中 note.images 的文件名转换为 Data URL（支持进度回调）
 * @param {Array} rows
 * @param {Function} onImageProcessed - 每处理完一张图片回调 (doneCount, totalCount)
 * @returns {Promise<Array>}
 */
async function resolveDefaultImages(rows, onImageProcessed) {
    let total = 0;
    let done = 0;
    for (const row of rows) {
        for (const cell of row.data) {
            const note = cell.note;
            if (note && note.images && note.images.length > 0) {
                total += note.images.length;
            }
        }
    }

    for (const row of rows) {
        for (const cell of row.data) {
            const note = cell.note;
            if (note && note.images && note.images.length > 0) {
                const newImages = [];
                for (const ref of note.images) {
                    if (typeof ref === 'string' && ref.startsWith('data:')) {
                        newImages.push(ref);
                    } else if (typeof ref === 'string') {
                        try {
                            const imgResp = await fetch('data/images/' + ref);
                            if (imgResp.ok) {
                                const blob = await imgResp.blob();
                                const dataUrl = await blobToDataURL(blob);
                                newImages.push(dataUrl);
                            }
                        } catch (e) {
                            console.warn('图片加载失败:', ref, e);
                        }
                    }
                    done++;
                    if (typeof onImageProcessed === 'function') {
                        onImageProcessed(done, total);
                    }
                }
                note.images = newImages;
            }
        }
    }
    return rows;
}

/**
 * 将 Blob 转换为 Data URL
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 开始加载默认数据集（带进度提示，避免重复加载）
 */
function startLoadingDefaultDataset() {
    if (defaultDatasetLoadingStarted) return;
    defaultDatasetLoadingStarted = true;

    showDefaultDatasetLoading('正在加载默认数据集...');
    loadDefaultDataset((percent, message) => {
        updateDefaultDatasetProgress(percent, message);
    }).then(defaultRows => {
        DEFAULT_ROWS = defaultRows;

        if (!getDatasetList().includes(DEFAULT_STORAGE_KEY)) {
            addDatasetKey(DEFAULT_STORAGE_KEY);
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(DEFAULT_ROWS));
        }

        if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
            state.rows = DEFAULT_ROWS.map(row => ({
                name: row.name,
                data: row.data.map(normalizeCell)
            }));
            renderAllTables();
            saveData();
        }

        if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
            saveBaseline();
            updateLockedUI();
        }

        hideDefaultDatasetLoading();
        showTemporaryHint('默认数据集加载完成', 'success');
    }).catch(err => {
        console.warn('默认数据集加载异常', err);
        DEFAULT_ROWS = createInitialRows();
        if (!getDatasetList().includes(DEFAULT_STORAGE_KEY)) {
            addDatasetKey(DEFAULT_STORAGE_KEY);
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(DEFAULT_ROWS));
        }
        if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
            state.rows = DEFAULT_ROWS.map(row => ({ ...row, data: row.data.map(normalizeCell) }));
            renderAllTables();
            saveBaseline();
            updateLockedUI();
        }
        hideDefaultDatasetLoading();
        showTemporaryHint('默认数据集加载失败，已使用空数据', 'error');
    });
}

// ========== 面板切换 ==========
/**
 * 切换右侧面板
 * @param {string} panelName - 面板名称（input/record/stats）
 */
function switchPanel(panelName) {
    if (state.leftPanel !== 'table') return;

    state.activePanel = panelName;
    dom.sidebarBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.panel === panelName);
    });
    dom.inputPanel.classList.toggle('active-panel', panelName === 'input');
    dom.statsPanel.classList.toggle('active-panel', panelName === 'stats');
    dom.recordPanel.classList.toggle('active-panel', panelName === 'record');

    if (panelName === 'stats') renderStats();
    updateHighlightedCell();
}

/**
 * 切换左侧面板（数据表/空白页）
 * @param {string} panelName - 'table' 或 'empty'
 */
function switchLeftPanel(panelName) {
    state.leftPanel = panelName;

    dom.leftSidebarBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.leftPanel === panelName);
    });

    const tableArea = document.getElementById('tableArea');
    const rightSidebar = document.getElementById('sidebar');
    const panelContainer = document.getElementById('panelContainer');
    const emptyPage = document.getElementById('emptyPage');

    if (panelName === 'table') {
        tableArea.style.display = '';
        rightSidebar.style.display = '';
        panelContainer.style.display = '';
        emptyPage.style.display = 'none';
        switchPanel(state.activePanel);
    } else if (panelName === 'empty') {
        tableArea.style.display = 'none';
        rightSidebar.style.display = 'none';
        panelContainer.style.display = 'none';
        emptyPage.style.display = 'flex';
    }
}

// ========== 数据集备注处理 ==========
/**
 * 更新数据集备注显示/编辑状态
 */
function updateDatasetRemark() {
    const textarea = dom.datasetRemarkInput;
    const display = dom.datasetRemarkDisplay;
    const charCount = dom.remarkCharCount;

    display.classList.remove('editable');
    display.style.display = 'none';
    textarea.style.display = 'none';

    let fixedRemark = '';
    if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY && typeof DEFAULT_REMARK !== 'undefined') {
        fixedRemark = DEFAULT_REMARK;
    } else if (STORAGE_KEY_DATA === SAMPLE_DATASET_KEY && typeof SAMPLE_REMARK !== 'undefined') {
        fixedRemark = SAMPLE_REMARK;
    }

    if (fixedRemark) {
        display.textContent = fixedRemark;
        display.style.display = 'block';
        if (charCount) charCount.textContent = fixedRemark.length;
        return;
    }

    const storedRemark = getCurrentDatasetRemark();
    if (storedRemark) {
        display.textContent = storedRemark;
        display.classList.add('editable');
        display.style.display = 'block';
        if (charCount) charCount.textContent = storedRemark.length;
    } else {
        textarea.value = '';
        textarea.style.display = 'block';
        if (charCount) charCount.textContent = '0';
    }
}

/**
 * 绑定数据集备注编辑事件
 */
function bindDatasetRemarkEvents() {
    dom.datasetRemarkInput.addEventListener('blur', saveRemarkFromInput);
    dom.datasetRemarkInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.blur();
        }
    });
    dom.datasetRemarkInput.addEventListener('input', function () {
        if (dom.remarkCharCount) {
            dom.remarkCharCount.textContent = this.value.length;
        }
        autoResizeRemark();
    });

    dom.datasetRemarkDisplay.addEventListener('click', function () {
        if (!this.classList.contains('editable')) return;
        this.style.display = 'none';
        const textarea = dom.datasetRemarkInput;
        textarea.value = this.textContent;
        textarea.style.display = 'block';
        textarea.focus();
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });
}

/**
 * 从输入框保存数据集备注
 */
function saveRemarkFromInput() {
    const textarea = dom.datasetRemarkInput;
    let val = textarea.value.trim();
    if (val.length > 550) {
        val = val.substring(0, 550);
        textarea.value = val;
    }

    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY && STORAGE_KEY_DATA !== SAMPLE_DATASET_KEY) {
        const remarks = getDatasetRemarks();
        if (val) {
            remarks[STORAGE_KEY_DATA] = val;
        } else {
            delete remarks[STORAGE_KEY_DATA];
        }
        saveDatasetRemarks(remarks);
    }
    updateDatasetRemark();
}

/**
 * 自动调整数据集备注输入框高度
 */
function autoResizeRemark() {
    const textarea = dom.datasetRemarkInput;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// ========== 数据集保护 UI 更新 ==========
/**
 * 更新默认数据集保护状态下的 UI
 */
function updateLockedUI() {
    const locked = (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY);

    dom.btnClearCell.disabled = locked;
    dom.btnClearAll.disabled = locked;
    dom.btnRecordClear.disabled = locked;

    if (dom.btnResetSync) {
        dom.btnResetSync.style.display = locked ? '' : 'none';
    }

    if (locked) {
        dom.inputHint.textContent = '🔒 默认数据集已保护：可增加，不可减少或清除已有数据';
        dom.recordHint.textContent = '🔒 可添加新条目或增加已有实装';
    } else {
        dom.inputHint.textContent = '准备就绪';
        dom.recordHint.textContent = '';
    }
}

// ========== 恢复用户自定义颜色 ==========
/**
 * 恢复用户自定义状态颜色
 */
function applySavedColors() {
    try {
        const raw = localStorage.getItem('smarttable_user_colors');
        if (!raw) return;
        const data = JSON.parse(raw);
        const theme = isDarkTheme() ? 'dark' : 'light';
        const colors = data[theme];
        if (!colors) return;
        const map = {
            hasValue: '--has-value-bg',
            statusNone: '--status-none-bg',
            statusPartial: '--status-partial-bg',
            statusFull: '--status-full-bg'
        };
        Object.keys(map).forEach(type => {
            if (colors[type]) {
                document.documentElement.style.setProperty(map[type], colors[type]);
            }
        });
    } catch (e) {
        // 忽略解析错误
    }
}

// ========== 应用初始化 ==========
async function init() {
    // 先加载主题
    loadTheme();

    // 恢复上次使用的数据集
    const lastKey = localStorage.getItem('smarttable_current_dataset');
    if (lastKey && /^[a-zA-Z0-9_]+$/.test(lastKey)) {
        STORAGE_KEY_DATA = lastKey;
    }

    const list = getDatasetList();

    // 初始化示例数据集（如果尚未存在）
    if (!list.includes(SAMPLE_DATASET_KEY)) {
        addDatasetKey(SAMPLE_DATASET_KEY);
        localStorage.setItem(SAMPLE_DATASET_KEY, JSON.stringify(createSampleRows()));
    }

    updateDatasetDisplay();
    updateDatasetSelect();

    // 加载当前数据集（从 localStorage）
    if (!loadData()) {
        state.rows = createInitialRows();
        saveData();
    }

    populateDropdowns();
    bindEvents();
    renderAllTables();
    resetTripleInputs();
    switchPanel('input');
    initSettings();

    // 初始化单元格提示栏
    initCellTooltip();
    // 初始化备注功能
    initNoteFeature();

    // 恢复用户自定义颜色
    applySavedColors();

    // 初始化数据集备注
    updateDatasetRemark();
    bindDatasetRemarkEvents();

    // 左侧侧边栏按钮点击
    dom.leftSidebarBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            switchLeftPanel(this.dataset.leftPanel);
        });
    });

    // 更新保护状态 UI（此时 DEFAULT_ROWS 尚未加载，先根据当前状态显示）
    updateLockedUI();

    localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
    dom.inputHint.textContent = '准备就绪';

    // 首次访问自动显示“关于”弹窗
    const aboutShown = sessionStorage.getItem('smarttable_about_shown');
    if (!aboutShown && dom.modalVersionInfo) {
        openModal(dom.modalVersionInfo);
        sessionStorage.setItem('smarttable_about_shown', '1');

        // 等待“关于”弹窗关闭后开始加载默认数据集
        const startOnClose = () => startLoadingDefaultDataset();

        // 按钮关闭
        dom.btnCloseVersionInfo.addEventListener('click', startOnClose);
        dom.btnConfirmVersionInfo.addEventListener('click', startOnClose);

        // 遮罩关闭（捕获阶段，避免被阻止冒泡）
        dom.modalVersionInfo.addEventListener('click', function (e) {
            if (e.target === dom.modalVersionInfo) {
                startLoadingDefaultDataset();
            }
        });
    } else {
        // 无需显示“关于”，立即加载
        startLoadingDefaultDataset();
    }
}

// ========== 恢复右侧面板折叠状态 ==========
(function restoreRightPanelState() {
    const savedCollapsed = localStorage.getItem('smarttable_right_collapsed');
    const collapseIcon = document.getElementById('icon-panel-collapse');
    const expandIcon = document.getElementById('icon-panel-expand');

    if (savedCollapsed === '1') {
        state.rightPanelCollapsed = true;
        document.querySelector('.main-layout').classList.add('right-collapsed');
        if (collapseIcon) collapseIcon.style.display = 'none';
        if (expandIcon) expandIcon.style.display = 'inline';
        if (dom.btnToggleRightPanel) dom.btnToggleRightPanel.title = '展开面板';
    } else {
        if (collapseIcon) collapseIcon.style.display = 'inline';
        if (expandIcon) expandIcon.style.display = 'none';
        if (dom.btnToggleRightPanel) dom.btnToggleRightPanel.title = '折叠面板';
    }
})();

// 启动应用
init();