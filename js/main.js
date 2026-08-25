/**
 * main.js - 应用入口
 * 包含：初始化流程、面板切换、数据集备注处理、数据集保护 UI、默认数据集外部数据加载
 */

// ========== 固定备注定义 ==========
const DEFAULT_REMARK = "1-26.07.16 “向渊行”版本完整实装基质列表\n2-“用户新建数据集默认模板”";
const SAMPLE_DATASET_KEY = '数据示例-表格样式参考';
const SAMPLE_REMARK = "1-数据表单元格 数据填充状态预览\n2-每次重新进入时随机刷新填充效果，仅供效果参考";

/**
 * 切换右侧面板
 * @param {string} panelName - 面板名称（input/record/stats）
 */
function switchPanel(panelName) {
    // 非数据表视图时不允许切换右侧面板
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

    // 更新按钮激活样式
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
 * 从 data/data.json 加载默认数据集（兼容 ZIP 解压格式）
 * 图片文件从 data/images/ 中读取，转换为 Data URL
 */
async function loadDefaultDataset() {
    try {
        const response = await fetch('data/data.json');
        if (!response.ok) throw new Error('Failed to load data/data.json');
        const json = await response.json();

        let rows = json.rows || json;
        if (!Array.isArray(rows)) throw new Error('Invalid format');

        // 转换图片引用为 Data URL
        rows = await resolveDefaultImages(rows);

        return rows; // 返回数据，不直接赋值全局
    } catch (e) {
        console.warn('默认数据集加载失败，使用空数据', e);
        return createInitialRows(); // 返回空数据作为兜底
    }
}

/**
 * 将 rows 中 note.images 的文件名转换为 Data URL
 * @param {Array} rows
 * @returns {Promise<Array>}
 */
async function resolveDefaultImages(rows) {
    for (const row of rows) {
        for (const cell of row.data) {
            const note = cell.note;
            if (note && note.images && note.images.length > 0) {
                const newImages = [];
                for (const ref of note.images) {
                    // 如果是 Data URL 直接使用
                    if (typeof ref === 'string' && ref.startsWith('data:')) {
                        newImages.push(ref);
                    } else if (typeof ref === 'string') {
                        // 从 data/images/ 加载
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
                }
                note.images = newImages;
            }
        }
    }
    return rows;
}

/**
 * 应用初始化
 */
async function init() {
    // ========== 第一步：立即执行无需 DEFAULT_ROWS 的初始化 ==========
    // 1. 加载主题
    loadTheme();

    // 2. 恢复上次使用的数据集键
    const lastKey = localStorage.getItem('smarttable_current_dataset');
    if (lastKey && /^[a-zA-Z0-9_]+$/.test(lastKey)) {
        STORAGE_KEY_DATA = lastKey;
    }

    // 3. 获取数据集列表
    const list = getDatasetList();

    // 4. 初始化示例数据集（如果尚未存在）
    if (!list.includes(SAMPLE_DATASET_KEY)) {
        addDatasetKey(SAMPLE_DATASET_KEY);
        localStorage.setItem(SAMPLE_DATASET_KEY, JSON.stringify(createSampleRows()));
    }

    // 5. 更新数据集显示
    updateDatasetDisplay();
    updateDatasetSelect();

    // 6. 加载当前数据集（从 localStorage）
    if (!loadData()) {
        state.rows = createInitialRows();
        saveData();
    }

    // 7. 填充下拉框
    populateDropdowns();

    // 8. 绑定所有事件
    bindEvents();

    // 9. 立即渲染表格（此时表格内容为当前数据集或空数据）
    renderAllTables();
    resetTripleInputs();
    switchPanel('input');
    initSettings();

    // 10. 初始化单元格提示栏
    initCellTooltip();

    // 11. 初始化备注功能
    initNoteFeature();

    // 12. 恢复用户自定义颜色
    applySavedColors();

    // 13. 初始化数据集备注
    updateDatasetRemark();
    bindDatasetRemarkEvents();

    // 14. 左侧侧边栏按钮事件
    dom.leftSidebarBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            switchLeftPanel(this.dataset.leftPanel);
        });
    });

    // 15. 更新保护状态 UI（此时 DEFAULT_ROWS 可能尚未加载，先根据当前状态显示）
    updateLockedUI();

    // 16. 设置当前数据集存储键
    localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
    dom.inputHint.textContent = '准备就绪';

    // 17. 首次访问自动显示“关于”弹窗
    const aboutShown = sessionStorage.getItem('smarttable_about_shown');
    if (!aboutShown && dom.modalVersionInfo) {
        openModal(dom.modalVersionInfo);
        sessionStorage.setItem('smarttable_about_shown', '1');
    }

    // ========== 第二步：异步加载默认数据集，完成后补充初始化 ==========
    loadDefaultDataset().then(defaultRows => {
        // 设置全局 DEFAULT_ROWS
        DEFAULT_ROWS = defaultRows;

        // 如果默认数据集尚未写入 localStorage，则写入
        if (!getDatasetList().includes(DEFAULT_STORAGE_KEY)) {
            addDatasetKey(DEFAULT_STORAGE_KEY);
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(DEFAULT_ROWS));
        }

        // 如果当前数据集是默认数据集，并且之前没有加载过真实数据（例如使用了占位空数据），则更新表格
        if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
            // 判断是否需要用 DEFAULT_ROWS 覆盖当前 state.rows
            // 简单做法：始终用 DEFAULT_ROWS 覆盖，确保显示最新默认数据
            // 但注意不要覆盖用户在加载期间可能进行的操作（极短时间内用户操作概率低，可接受）
            state.rows = DEFAULT_ROWS.map(row => ({
                name: row.name,
                data: row.data.map(normalizeCell)
            }));
            renderAllTables();
            saveData(); // 确保 localStorage 与 DEFAULT_ROWS 一致
        }

        // 保存默认数据集基准（用于保护）
        if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY) {
            saveBaseline();
            updateLockedUI(); // 更新保护状态 UI
        }

        // 可选：如果当前不是默认数据集，但之前因为缺少 DEFAULT_ROWS 未能正确初始化保护逻辑，可以在这里补充
        // 但一般不影响

        // 更新提示
        dom.inputHint.textContent = '默认数据加载完成';
    }).catch(err => {
        console.warn('默认数据集加载失败，使用空数据', err);
        // 如果加载失败，使用空行数据作为兜底
        DEFAULT_ROWS = createInitialRows();
        // 确保默认数据集存在
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
    });
}

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

    // 点击显示区进入编辑（仅普通数据集可编辑）
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

    // 清除相关按钮禁用
    dom.btnClearCell.disabled = locked;
    dom.btnClearAll.disabled = locked;
    dom.btnRecordClear.disabled = locked;

    // “重置同步”按钮：仅在默认数据集时显示
    if (dom.btnResetSync) {
        dom.btnResetSync.style.display = locked ? '' : 'none';
    }

    // 提示文字
    if (locked) {
        dom.inputHint.textContent = '🔒 默认数据集已保护：可增加，不可减少或清除已有数据';
        dom.recordHint.textContent = '🔒 可添加新条目或增加已有实装';
    } else {
        dom.inputHint.textContent = '准备就绪';
        dom.recordHint.textContent = '';
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