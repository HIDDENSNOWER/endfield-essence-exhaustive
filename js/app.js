(function() {
    const STORAGE_KEY_THEME = 'smarttable_theme';
    const DEFAULT_STORAGE_KEY = '默认数据集';
    const DATASET_LIST_KEY = 'smarttable_dataset_list';
    let STORAGE_KEY_DATA = DEFAULT_STORAGE_KEY;

    const ALL_GROUPS = [
        { name: '强攻', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '压制', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '追袭', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '粉碎', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '昂扬', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '巧技', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '残暴', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '附术', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '医疗', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '切骨', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '迸发', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '夜幕', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '流转', sub: ['敏捷','力量','意志','智识','主能力'] },
        { name: '效益', sub: ['敏捷','力量','意志','智识','主能力'] }
    ];
    const GROUP1 = ALL_GROUPS.slice(0, 7);
    const GROUP2 = ALL_GROUPS.slice(7);
    const COLS1 = GROUP1.reduce((s,g) => s + g.sub.length, 0);
    const COLS2 = GROUP2.reduce((s,g) => s + g.sub.length, 0);
    const ROW_NAMES = [
        '攻击提升', '生命提升', '暴击率提升', '物理伤害提升', '灼热伤害提升',
        '法术伤害提升', '自然伤害提升', '电磁伤害提升', '寒冷伤害提升',
        '源石技艺提升', '治疗效率提升', '终结技效率提升'
    ];

    function defaultCellMeta() { return { v: '', t: 0, a: 0 }; }
    function createEmptyRowData() { return new Array(70).fill(null).map(() => defaultCellMeta()); }
    function createInitialRows() { return ROW_NAMES.map(name => ({ name, data: createEmptyRowData() })); }

    let state = {
        rows: createInitialRows(),
        searchQuery: '',
        theme: 'light',
        activePanel: 'input',
        history: [],         // 操作历史 [{ rowIdx, colIndex, oldCell, newCell }]
        historyIndex: -1     // 当前历史位置
    };
    let pendingApply = null;
    let confirmCallback = null;

    const dom = {
        tableHead1: document.getElementById('tableHead1'),
        tableBody1: document.getElementById('tableBody1'),
        tableHead2: document.getElementById('tableHead2'),
        tableBody2: document.getElementById('tableBody2'),
        searchInput: document.getElementById('searchInput'),
        btnToggleTheme: document.getElementById('btnToggleTheme'),
        iconSun: document.getElementById('icon-sun'),
        iconMoon: document.getElementById('icon-moon'),
        inputValue: document.getElementById('inputValue'),
        btnApplyValue: document.getElementById('btnApplyValue'),
        btnClearAll: document.getElementById('btnClearAll'),
        inputHint: document.getElementById('inputHint'),
        inputRow: document.getElementById('inputRow'),
        inputGroup: document.getElementById('inputGroup'),
        inputSubCol: document.getElementById('inputSubCol'),
        btnExport: document.getElementById('btnExport'),
        btnImport: document.getElementById('btnImport'),
        btnNewDataset: document.getElementById('btnNewDataset'),
        btnRename: document.getElementById('btnRename'),
        btnDeleteDataset: document.getElementById('btnDeleteDataset'),
        importFile: document.getElementById('importFile'),
        datasetName: document.getElementById('datasetName'),
        datasetSelect: document.getElementById('datasetSelect'),
        modalCompare: document.getElementById('modalCompare'),
        compareBody: document.getElementById('compareBody'),
        btnKeepOld: document.getElementById('btnKeepOld'),
        btnReplaceNew: document.getElementById('btnReplaceNew'),
        btnCloseCompare: document.getElementById('btnCloseCompare'),
        modalConfirm: document.getElementById('modalConfirm'),
        confirmBody: document.getElementById('confirmBody'),
        btnCancelConfirm: document.getElementById('btnCancelConfirm'),
        btnConfirmAction: document.getElementById('btnConfirmAction'),
        btnCloseConfirm: document.getElementById('btnCloseConfirm'),
        modalFullAcquire: document.getElementById('modalFullAcquire'),
        fullAcquireBody: document.getElementById('fullAcquireBody'),
        btnCloseFullAcquire: document.getElementById('btnCloseFullAcquire'),
        btnConfirmFullAcquire: document.getElementById('btnConfirmFullAcquire'),
        modalIllegalInput: document.getElementById('modalIllegalInput'),
        illegalBody: document.getElementById('illegalBody'),
        btnCloseIllegal: document.getElementById('btnCloseIllegal'),
        btnConfirmIllegal: document.getElementById('btnConfirmIllegal'),
        modalNewDataset: document.getElementById('modalNewDataset'),
        newDatasetName: document.getElementById('newDatasetName'),
        btnCancelNewDataset: document.getElementById('btnCancelNewDataset'),
        btnConfirmNewDataset: document.getElementById('btnConfirmNewDataset'),
        btnCloseNewDataset: document.getElementById('btnCloseNewDataset'),
        modalRenameDataset: document.getElementById('modalRenameDataset'),
        renameOldName: document.getElementById('renameOldName'),
        renameDatasetName: document.getElementById('renameDatasetName'),
        btnCancelRenameDataset: document.getElementById('btnCancelRenameDataset'),
        btnConfirmRenameDataset: document.getElementById('btnConfirmRenameDataset'),
        btnCloseRenameDataset: document.getElementById('btnCloseRenameDataset'),
        modalDeleteDataset: document.getElementById('modalDeleteDataset'),
        deleteDatasetName: document.getElementById('deleteDatasetName'),
        btnCancelDeleteDataset: document.getElementById('btnCancelDeleteDataset'),
        btnConfirmDeleteDataset: document.getElementById('btnConfirmDeleteDataset'),
        btnCloseDeleteDataset: document.getElementById('btnCloseDeleteDataset'),
        modalAlert: document.getElementById('modalAlert'),
        alertTitle: document.getElementById('alertTitle'),
        alertBody: document.getElementById('alertBody'),
        btnCloseAlert: document.getElementById('btnCloseAlert'),
        btnConfirmAlert: document.getElementById('btnConfirmAlert'),
        modalConfirmDialog: document.getElementById('modalConfirmDialog'),
        confirmDialogTitle: document.getElementById('confirmDialogTitle'),
        confirmDialogBody: document.getElementById('confirmDialogBody'),
        btnCancelConfirmDialog: document.getElementById('btnCancelConfirmDialog'),
        btnConfirmConfirmDialog: document.getElementById('btnConfirmConfirmDialog'),
        btnCloseConfirmDialog: document.getElementById('btnCloseConfirmDialog'),
        sidebarBtns: document.querySelectorAll('.sidebar-btn'),
        inputPanel: document.getElementById('inputPanel'),
        statsPanel: document.getElementById('statsPanel'),
        statsContent: document.getElementById('statsContent'),
        recordPanel: document.getElementById('recordPanel'),
        recordSubCol: document.getElementById('recordSubCol'),
        recordRow: document.getElementById('recordRow'),
        recordGroup: document.getElementById('recordGroup'),
        btnRecordApply: document.getElementById('btnRecordApply'),
        recordHint: document.getElementById('recordHint'),
        settingsPanel: document.getElementById('settingsPanel'),
        colWidthSlider: document.getElementById('colWidthSlider'),
        rowHeightSlider: document.getElementById('rowHeightSlider'),
        colWidthValue: document.getElementById('colWidthValue'),
        rowHeightValue: document.getElementById('rowHeightValue'),
        btnUndo: document.getElementById('btnUndo'),
        btnRedo: document.getElementById('btnRedo'),
        btnRecordClear: document.getElementById('btnRecordClear'),
        btnClearCell: document.getElementById('btnClearCell'),
    };

    function normalizeCell(cell) {
        if (typeof cell === 'object' && cell !== null && 'v' in cell && 't' in cell && 'a' in cell) return cell;
        if (typeof cell === 'string' || typeof cell === 'number') return { v: cell === '' ? '' : String(cell), t: 0, a: 0 };
        return defaultCellMeta();
    }

    // ========== 主题 ==========
    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        dom.iconSun.style.display = theme === 'dark' ? 'none' : '';
        dom.iconMoon.style.display = theme === 'dark' ? '' : 'none';
        localStorage.setItem(STORAGE_KEY_THEME, theme);
    }
    function toggleTheme() { applyTheme(state.theme === 'light' ? 'dark' : 'light'); }
    function loadTheme() {
        const saved = localStorage.getItem(STORAGE_KEY_THEME);
        if (saved) applyTheme(saved);
        else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    // ========== 搜索 ==========
    function getFilteredRows() {
        const q = state.searchQuery.trim().toLowerCase();
        if (!q) return state.rows;
        return state.rows.filter(row => {
            if (row.name.toLowerCase().includes(q)) return true;
            return row.data.some(cell => {
                const c = normalizeCell(cell);
                return String(c.v).toLowerCase().includes(q);
            });
        });
    }

    // ========== 表格渲染 ==========
    function renderTablePart(thead, tbody, groups, colOffset, totalCols) {
        thead.innerHTML = '';
        const row1 = document.createElement('tr');
        const thCorner = document.createElement('th');
        thCorner.textContent = '提升项';
        thCorner.rowSpan = 2;
        row1.appendChild(thCorner);
        groups.forEach((group, groupIdx) => {
            const globalIdx = (groups === GROUP1 ? groupIdx : GROUP1.length + groupIdx);
            const th = document.createElement('th');
            th.textContent = group.name;
            th.colSpan = group.sub.length;
            th.className = 'group-header ' + (globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
            if (groupIdx < groups.length - 1) th.classList.add('border-group-right');
            row1.appendChild(th);
        });
        thead.appendChild(row1);
        const row2 = document.createElement('tr');
        groups.forEach((group, groupIdx) => {
            const globalIdx = (groups === GROUP1 ? groupIdx : GROUP1.length + groupIdx);
            group.sub.forEach((subName, subIdx) => {
                const th = document.createElement('th');
                th.textContent = subName;
                th.style.width = 'var(--col-width)';
                th.classList.add(globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
                if (subIdx === group.sub.length - 1 && groupIdx < groups.length - 1) th.classList.add('border-group-right');
                row2.appendChild(th);
            });
        });
        thead.appendChild(row2);
        tbody.innerHTML = '';
        const filteredRows = getFilteredRows();
        if (filteredRows.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = totalCols + 1;
            td.textContent = '没有匹配的数据';
            td.style.textAlign = 'center'; td.style.padding = '24px'; td.style.color = 'var(--text-tertiary)';
            tr.appendChild(td); tbody.appendChild(tr);
            return;
        }
        filteredRows.forEach(row => {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = row.name;
            tr.appendChild(tdName);
            groups.forEach((group, groupIdx) => {
                const globalIdx = (groups === GROUP1 ? groupIdx : GROUP1.length + groupIdx);
                group.sub.forEach((subName, subIdx) => {
                    const td = document.createElement('td');
                    const colIndex = groups.slice(0, groupIdx).reduce((s,g) => s + g.sub.length, 0) + subIdx + colOffset;
                    const cell = normalizeCell(row.data[colIndex]);
                    const val = cell.v;
                    const total = cell.t || 0;
                    const acq = cell.a || 0;

                    let statusClass = '';
                    if (total === 0) {
                        statusClass = '';
                    } else if (acq === 0) {
                        statusClass = 'status-none';
                    } else if (acq < total) {
                        statusClass = 'status-partial';
                    } else {
                        statusClass = 'status-full';
                    }
                    td.className = '';
                    if (statusClass) td.classList.add(statusClass);

                    if (total === 0 && val !== '') {
                        td.classList.add('has-value');
                    }

                    let text;
                    if (total === 0) {
                        text = val === '' ? '—' : val;
                    } else {
                        text = val === '' ? '' : val;
                        if (total === 1) {
                            text += ` (${acq}/1)`;
                        } else if (total > 1) {
                            text += ` (${acq}/${total})`;
                        }
                    }
                    if (val === '' && total === 0) {
                        td.classList.add('empty-value');
                    }
                    td.textContent = text;
                    td.classList.add(globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
                    if (subIdx === group.sub.length - 1 && groupIdx < groups.length - 1) {
                        td.classList.add('border-group-right');
                    }
                    tr.appendChild(td);
                });
            });
            tbody.appendChild(tr);
        });
    }
    function renderAllTables() {
        renderTablePart(dom.tableHead1, dom.tableBody1, GROUP1, 0, COLS1);
        renderTablePart(dom.tableHead2, dom.tableBody2, GROUP2, COLS1, COLS2);
    }

    // ========== 统计面板 ==========
    function renderStats() {
        const rows = state.rows;
        let html = '<table><thead><tr><th>副属性</th><th>已填单元格</th></tr></thead><tbody>';
        rows.forEach(row => {
            const filled = row.data.filter(cell => {
                const c = normalizeCell(cell);
                return c.v !== '' && c.v !== null;
            }).length;
            html += `<tr><td style="text-align:left;font-weight:500">${row.name}</td><td>${filled}</td></tr>`;
        });
        html += '</tbody></table><p style="margin-top:10px; font-size:0.72rem; color:var(--text-tertiary)">统计当前数据集非空单元格数量。</p>';
        dom.statsContent.innerHTML = html;
    }

    // ========== 面板切换 ==========
    function switchPanel(panelName) {
        state.activePanel = panelName;
        dom.sidebarBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.panel === panelName));
        dom.inputPanel.classList.toggle('active-panel', panelName === 'input');
        dom.statsPanel.classList.toggle('active-panel', panelName === 'stats');
        dom.recordPanel.classList.toggle('active-panel', panelName === 'record');
        dom.settingsPanel.classList.toggle('active-panel', panelName === 'settings');
        if (panelName === 'stats') renderStats();
    }

    // ========== 弹窗辅助 ==========
    function openModal(modalEl) {
        modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeModal(modalEl) {
        modalEl.style.display = 'none';
        document.body.style.overflow = '';
    }
    function showAlert(message, title = '提示') {
        dom.alertTitle.textContent = title;
        dom.alertBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${message}</p>`;
        openModal(dom.modalAlert);
    }
    function closeAlert() { closeModal(dom.modalAlert); }
    function showConfirmDialog(message, onConfirm, onCancel, title = '确认') {
        dom.confirmDialogTitle.textContent = title;
        dom.confirmDialogBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${message}</p>`;
        window.__dialogConfirmCallback = onConfirm;
        window.__dialogCancelCallback = onCancel;
        openModal(dom.modalConfirmDialog);
    }
    function closeConfirmDialog() { closeModal(dom.modalConfirmDialog); }
    function showIllegalModal(reason) {
        dom.illegalBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.6;">${reason}</p>`;
        openModal(dom.modalIllegalInput);
    }
    function closeIllegalModal() { closeModal(dom.modalIllegalInput); }
    function showFullAcquireModal(message) {
        dom.fullAcquireBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${message}</p>`;
        openModal(dom.modalFullAcquire);
    }
    function closeFullAcquireModal() { closeModal(dom.modalFullAcquire); }

    // ========== 数据集管理 ==========
    function getDatasetList() { try { return JSON.parse(localStorage.getItem(DATASET_LIST_KEY)) || []; } catch(e) { return []; } }
    function saveDatasetList(list) { localStorage.setItem(DATASET_LIST_KEY, JSON.stringify(list)); }
    function addDatasetKey(key) { const list = getDatasetList(); if (!list.includes(key)) { list.push(key); saveDatasetList(list); } }
    function removeDatasetKey(key) { const list = getDatasetList().filter(k => k !== key); saveDatasetList(list); }
    function updateDatasetSelect() {
        const list = getDatasetList();
        if (!list.includes(STORAGE_KEY_DATA)) addDatasetKey(STORAGE_KEY_DATA);
        dom.datasetSelect.innerHTML = list.map(k => `<option value="${k}" ${k === STORAGE_KEY_DATA ? 'selected' : ''}>${k}</option>`).join('');
    }
    function switchDataset(key) {
        if (key === STORAGE_KEY_DATA) return;
        STORAGE_KEY_DATA = key;
        updateDatasetDisplay();
        if (!loadData()) { state.rows = createInitialRows(); saveData(); }
        renderAllTables();
        updateDatasetSelect();
        dom.inputHint.textContent = `已切换到数据集: ${key}`;
        localStorage.setItem('smarttable_current_dataset', key);
    }
    function updateDatasetDisplay() { dom.datasetName.textContent = STORAGE_KEY_DATA; }
    function saveData() {
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.rows));
        addDatasetKey(STORAGE_KEY_DATA);
        updateDatasetSelect();
    }
    function loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DATA);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && Array.isArray(parsed[0].data)) {
                    state.rows = parsed.map(row => ({
                        name: row.name,
                        data: row.data.map(cell => normalizeCell(cell))
                    }));
                    addDatasetKey(STORAGE_KEY_DATA);
                    return true;
                }
            }
        } catch(e) {}
        return false;
    }
    function exportData() {
        const dataStr = JSON.stringify(state.rows, null, 2);
        const blob = new Blob([dataStr], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(a.href);
        dom.inputHint.textContent = '数据集已导出';
    }

    function proceedImport(data, newKey) {
        state.rows = data.map(row => ({
            name: row.name,
            data: row.data.map(cell => normalizeCell(cell))
        }));
        STORAGE_KEY_DATA = newKey;
        localStorage.setItem(newKey, JSON.stringify(state.rows));
        addDatasetKey(newKey);
        updateDatasetDisplay();
        updateDatasetSelect();
        renderAllTables();
        dom.inputHint.textContent = `已导入并切换到数据集: ${newKey}`;
        localStorage.setItem('smarttable_current_dataset', newKey);
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data) && data.length > 0 && data[0].name && Array.isArray(data[0].data)) {
                    const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                    const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
                    if (getDatasetList().includes(newKey)) {
                        showConfirmDialog(`数据集 "${newKey}" 已存在，是否覆盖？`, () => {
                            proceedImport(data, newKey);
                        }, null, '覆盖确认');
                    } else {
                        proceedImport(data, newKey);
                    }
                } else {
                    showAlert('文件格式不正确。', '导入失败');
                }
            } catch(err) {
                showAlert('解析文件失败，请检查文件内容。', '导入失败');
            }
        };
        reader.readAsText(file);
    }
    function triggerImport() { dom.importFile.click(); }

    function createNewDataset() {
        dom.newDatasetName.value = '';
        openModal(dom.modalNewDataset);
        setTimeout(() => dom.newDatasetName.focus(), 100);
    }
    function confirmNewDataset() {
        const name = dom.newDatasetName.value.trim();
        if (!name) {
            showAlert('数据集名称不能为空。');
            return;
        }
        if (getDatasetList().includes(name)) {
            showAlert('该数据集名称已存在，请使用其他名称。');
            return;
        }
        const empty = createInitialRows();
        localStorage.setItem(name, JSON.stringify(empty));
        addDatasetKey(name);
        STORAGE_KEY_DATA = name;
        state.rows = JSON.parse(JSON.stringify(empty));
        updateDatasetDisplay();
        updateDatasetSelect();
        renderAllTables();
        closeModal(dom.modalNewDataset);
        dom.inputHint.textContent = `已创建新数据集: ${name}`;
        localStorage.setItem('smarttable_current_dataset', name);
    }

    function renameDataset() {
        dom.renameOldName.textContent = STORAGE_KEY_DATA;
        dom.renameDatasetName.value = '';
        openModal(dom.modalRenameDataset);
        setTimeout(() => dom.renameDatasetName.focus(), 100);
    }
    function confirmRenameDataset() {
        const newName = dom.renameDatasetName.value.trim();
        if (!newName) {
            showAlert('新名称不能为空。');
            return;
        }
        if (newName === STORAGE_KEY_DATA) {
            closeModal(dom.modalRenameDataset);
            return;
        }
        if (getDatasetList().includes(newName)) {
            showAlert('该名称已存在，请使用其他名称。');
            return;
        }
        const data = localStorage.getItem(STORAGE_KEY_DATA);
        localStorage.setItem(newName, data || '[]');
        removeDatasetKey(STORAGE_KEY_DATA);
        STORAGE_KEY_DATA = newName;
        addDatasetKey(newName);
        saveData();
        updateDatasetDisplay();
        updateDatasetSelect();
        closeModal(dom.modalRenameDataset);
        dom.inputHint.textContent = `已重命名为: ${newName}`;
        localStorage.setItem('smarttable_current_dataset', newName);
    }

    function deleteDataset() {
        const list = getDatasetList();
        if (list.length <= 1) {
            showAlert('至少需要保留一个数据集。', '无法删除');
            return;
        }
        dom.deleteDatasetName.textContent = STORAGE_KEY_DATA;
        openModal(dom.modalDeleteDataset);
    }
    function confirmDeleteDataset() {
        const currentKey = STORAGE_KEY_DATA;
        localStorage.removeItem(currentKey);
        removeDatasetKey(currentKey);
        const remaining = getDatasetList();
        const newKey = remaining[0] || DEFAULT_STORAGE_KEY;
        STORAGE_KEY_DATA = newKey;
        if (!loadData()) {
            state.rows = createInitialRows();
            saveData();
        }
        updateDatasetDisplay();
        updateDatasetSelect();
        renderAllTables();
        closeModal(dom.modalDeleteDataset);
        dom.inputHint.textContent = `已删除，切换至: ${newKey}`;
        localStorage.setItem('smarttable_current_dataset', newKey);
    }

    function clearAllData() {
        state.rows.forEach(row => row.data = createEmptyRowData());
        renderAllTables(); saveData();
        dom.inputHint.textContent = '当前数据集已清空';
    }

    // ========== 设置面板 ==========
    function initSettings() {
        const savedStyle = localStorage.getItem('smarttable_style');
        let colWidth = 36, rowHeight = 24;
        if (savedStyle) {
            try {
                const parsed = JSON.parse(savedStyle);
                if (parsed.colWidth) colWidth = parsed.colWidth;
                if (parsed.rowHeight) rowHeight = parsed.rowHeight;
            } catch(e) {}
        }
        dom.colWidthSlider.value = colWidth;
        dom.rowHeightSlider.value = rowHeight;
        dom.colWidthValue.textContent = colWidth;
        dom.rowHeightValue.textContent = rowHeight;
        applyStyle(colWidth, rowHeight);
    }

    function applyStyle(colWidth, rowHeight) {
        document.documentElement.style.setProperty('--col-width', colWidth + 'px');
        document.documentElement.style.setProperty('--row-height', rowHeight + 'px');
        localStorage.setItem('smarttable_style', JSON.stringify({ colWidth, rowHeight }));
    }

    // ========== 数值对比 ==========
    function parseTriple(val) { const s = String(val).trim(); return /^\d{3}$/.test(s) ? s.split('').map(Number) : null; }
    function calcSum(arr) { return arr.reduce((a,b)=>a+b,0); }
    function getSuggestion(oldT, newT) {
        const oldSum = calcSum(oldT), newSum = calcSum(newT);
        if (oldSum !== newSum) return { keepOld: oldSum > newSum, reason: `总和 ${oldSum>newSum?'旧值更大':'新值更大'}（旧${oldSum} vs 新${newSum}）` };
        if (oldT[2] !== newT[2]) return { keepOld: oldT[2] > newT[2], reason: `总和相同，第三位 ${oldT[2]>newT[2]?'旧值更大':'新值更大'}（旧${oldT[2]} vs 新${newT[2]}）` };
        const oldMax = Math.max(oldT[0], oldT[1]), newMax = Math.max(newT[0], newT[1]);
        if (oldMax !== newMax) return { keepOld: oldMax > newMax, reason: `总和及第三位相同，前两位最大值 ${oldMax>newMax?'旧值更大':'新值更大'}（旧${oldMax} vs 新${newMax}）` };
        return { keepOld: true, reason: '各项完全相同，建议保留原值' };
    }

    function showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName) {
        const oldT = parseTriple(oldVal), newT = parseTriple(newVal);
        if (!oldT || !newT) { applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName); return; }
        const sug = getSuggestion(oldT, newT);
        const btnKeep = dom.btnKeepOld;
        const btnReplace = dom.btnReplaceNew;
        btnKeep.className = 'btn';
        btnReplace.className = 'btn';
        if (sug.keepOld) {
            btnKeep.classList.add('btn-success');
            btnReplace.classList.add('btn-outline-gray');
        } else {
            btnReplace.classList.add('btn-success');
            btnKeep.classList.add('btn-outline-gray');
        }
        dom.compareBody.innerHTML = `
            <div style="display:flex; justify-content:space-around; margin-bottom:12px;">
                <div style="text-align:center">
                    <div style="font-weight:600; color:var(--text-secondary)">旧值</div>
                    <div style="font-size:1.4rem; font-weight:700">${oldVal}</div>
                    <div style="font-size:0.8rem">${subName}${oldT[0]} | ${rowName}${oldT[1]} | ${groupName}${oldT[2]}</div>
                    <div style="font-size:0.8rem; color:var(--text-tertiary)">总和 ${calcSum(oldT)}</div>
                </div>
                <div style="text-align:center">
                    <div style="font-weight:600; color:var(--text-secondary)">新值</div>
                    <div style="font-size:1.4rem; font-weight:700">${newVal}</div>
                    <div style="font-size:0.8rem">${subName}${newT[0]} | ${rowName}${newT[1]} | ${groupName}${newT[2]}</div>
                    <div style="font-size:0.8rem; color:var(--text-tertiary)">总和 ${calcSum(newT)}</div>
                </div>
            </div>
            <div style="background:var(--bg-tertiary); padding:8px; border-radius:6px; text-align:center; font-size:0.85rem; color:var(--accent-primary)">
                💡 建议：${sug.reason} → ${sug.keepOld ? '保留旧值' : '替换为新值'}
            </div>`;
        pendingApply = { rowIdx, colIndex, newVal, groupName, rowName, subName, suggestion: sug };
        openModal(dom.modalCompare);
    }

    function closeCompareModal() {
        closeModal(dom.modalCompare);
        pendingApply = null;
    }

    function applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName) {
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
        cell.v = newVal === '' ? '' : String(newVal);
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
    }

    function showConfirmModal(message, reason, onConfirm) {
        dom.confirmBody.innerHTML = `
            <p style="font-size:0.9rem; color:var(--text-primary); margin-bottom:8px;">${message}</p>
            <div style="background:var(--bg-tertiary); padding:8px; border-radius:6px; font-size:0.8rem; color:var(--text-secondary);">${reason}</div>
            <p style="font-size:0.8rem; color:var(--text-tertiary); margin-top:10px;">是否仍要执行此操作？</p>
        `;
        confirmCallback = onConfirm;
        closeModal(dom.modalCompare);
        openModal(dom.modalConfirm);
    }

    function closeConfirmModal() {
        closeModal(dom.modalConfirm);
        confirmCallback = null;
    }

    function executeConfirmedAction() {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    }

    function executeKeepOld() {
        if (!pendingApply) return;
        const sug = pendingApply.suggestion;
        if (sug && !sug.keepOld) {
            showConfirmModal('系统建议“替换为新值”，您选择了保留旧值。', `原因：${sug.reason}`, () => {
                closeCompareModal();
                dom.inputHint.textContent = '已保留旧值';
            });
        } else {
            closeCompareModal();
            dom.inputHint.textContent = '已保留旧值';
        }
    }

    function executeReplaceNew() {
        if (!pendingApply) return;
        const sug = pendingApply.suggestion;
        if (sug && sug.keepOld) {
            showConfirmModal('系统建议“保留旧值”，您选择了替换为新值。', `原因：${sug.reason}`, () => {
                if (pendingApply) {
                    applyNewValue(pendingApply.rowIdx, pendingApply.colIndex, pendingApply.newVal,
                                 pendingApply.groupName, pendingApply.rowName, pendingApply.subName);
                }
                closeCompareModal();
            });
        } else {
            if (pendingApply) {
                applyNewValue(pendingApply.rowIdx, pendingApply.colIndex, pendingApply.newVal,
                             pendingApply.groupName, pendingApply.rowName, pendingApply.subName);
            }
            closeCompareModal();
        }
    }

    // ========== 下拉框填充与联动 ==========
    function populateDropdowns() {
        const rowOpts = ROW_NAMES.map((n,i) => `<option value="${i}">${n}</option>`).join('');
        const groupOpts = ALL_GROUPS.map((g,i) => `<option value="${i}">${g.name}</option>`).join('');
        dom.inputRow.innerHTML = rowOpts;
        dom.inputGroup.innerHTML = groupOpts;
        dom.recordRow.innerHTML = rowOpts;
        dom.recordGroup.innerHTML = groupOpts;
        updateSubColOptions(0);
        updateRecordSubColOptions(0);
    }
    function updateSubColOptions(groupIdx) {
        dom.inputSubCol.innerHTML = ALL_GROUPS[groupIdx].sub.map((s,i) => `<option value="${i}">${s}</option>`).join('');
    }
    function updateRecordSubColOptions(groupIdx) {
        dom.recordSubCol.innerHTML = ALL_GROUPS[groupIdx].sub.map((s,i) => `<option value="${i}">${s}</option>`).join('');
    }
    function getColumnIndex(groupIdx, subIdx) {
        let col = 0;
        for (let i=0; i<groupIdx; i++) col += ALL_GROUPS[i].sub.length;
        return col + subIdx;
    }

    // ========== 数据管理面板应用 ==========
    function applyValue() {
        const value = dom.inputValue.value.trim();
        if (value === '') {
            dom.inputHint.textContent = '输入为空，未做更改。';
            return;
        }
        if (!/^\d{3}$/.test(value)) {
            showIllegalModal('非法输入：请输入恰好三位数字（000-999）。<br>原因：数值只能为三位纯数字，且不能为空。');
            dom.inputValue.focus();
            return;
        }

        const subIdx = parseInt(dom.inputSubCol.value);
        const rowIdx = parseInt(dom.inputRow.value);
        const groupIdx = parseInt(dom.inputGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);

        if (cell.t > 0) {
            if (cell.a >= cell.t) {
                const groupName = ALL_GROUPS[groupIdx].name;
                const rowName = ROW_NAMES[rowIdx];
                const subName = ALL_GROUPS[groupIdx].sub[subIdx];
                showFullAcquireModal(`当前重复词条组合（${rowName} - ${groupName} - ${subName}）已全部获取，请停止录入。`);
                return;
            }
            cell.a += 1;
            state.rows[rowIdx].data[colIndex] = cell;
            renderAllTables(); saveData();
            const groupName = ALL_GROUPS[groupIdx].name;
            const rowName = ROW_NAMES[rowIdx];
            const subName = ALL_GROUPS[groupIdx].sub[subIdx];
            dom.inputHint.textContent = `已获取: ${rowName} > ${groupName} > ${subName} (拥有${cell.a}/${cell.t})`;
            return;
        }

        const oldVal = cell.v;
        const newVal = value;
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];

        if (oldVal !== '' && parseTriple(oldVal) && parseTriple(newVal)) {
            showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName);
            return;
        }
        cell.v = String(newVal);
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
    }

    // ========== 录入面板 ==========
    function applyRecord() {
        const subIdx = parseInt(dom.recordSubCol.value);
        const rowIdx = parseInt(dom.recordRow.value);
        const groupIdx = parseInt(dom.recordGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;
    
        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
        const oldCell = JSON.parse(JSON.stringify(cell)); // 用于撤回
    
        if (cell.t === 0) {
            // 新增逻辑：若原本存在数值，视为已获取一次
            if (cell.v !== '') {
                cell.t = 1;
                cell.a = 1;
                cell.v = '';   // 清除数值
            } else {
                cell.t = 1;
                cell.a = 0;
            }
        } else {
            // 已有基质记录，仅增加重复数
            cell.t += 1;
        }
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        pushHistory(rowIdx, colIndex, oldCell, JSON.parse(JSON.stringify(cell)));
    
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];
        dom.recordHint.textContent = `已录入：${rowName} > ${groupName} > ${subName} (重复${cell.t}, 拥有${cell.a})`;
        updateUndoRedoButtons();
    }

    // 滚轮切换
    function enableWheelSelect(el) {
        el.addEventListener('wheel', function(e) {
            e.preventDefault();
            const opts = this.options;
            if (!opts.length) return;
            let idx = this.selectedIndex + (e.deltaY > 0 ? 1 : -1);
            if (idx < 0) idx = opts.length - 1;
            else if (idx >= opts.length) idx = 0;
            this.selectedIndex = idx;
            this.dispatchEvent(new Event('change', {bubbles:true}));
        }, {passive:false});
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        dom.btnToggleTheme.addEventListener('click', toggleTheme);
        dom.searchInput.addEventListener('input', () => { state.searchQuery = dom.searchInput.value; renderAllTables(); });
        dom.inputGroup.addEventListener('change', () => updateSubColOptions(parseInt(dom.inputGroup.value)));
        dom.recordGroup.addEventListener('change', () => updateRecordSubColOptions(parseInt(dom.recordGroup.value)));

        [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup, dom.datasetSelect].forEach(enableWheelSelect);

        dom.inputValue.addEventListener('input', function() { this.value = this.value.replace(/\D/g, '').slice(0,3); });

        dom.btnApplyValue.addEventListener('click', applyValue);
        dom.btnClearAll.addEventListener('click', () => {
            showConfirmDialog('确定要清空当前数据集的所有数值吗？', clearAllData, null, '清空确认');
        });
        dom.btnRecordApply.addEventListener('click', applyRecord);

        dom.sidebarBtns.forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));

        dom.datasetSelect.addEventListener('change', () => switchDataset(dom.datasetSelect.value));
        dom.btnExport.addEventListener('click', exportData);
        dom.btnImport.addEventListener('click', triggerImport);
        dom.importFile.addEventListener('change', e => { if(e.target.files[0]){ importData(e.target.files[0]); e.target.value=''; } });

        // 数据集操作弹窗事件
        dom.btnNewDataset.addEventListener('click', createNewDataset);
        dom.btnConfirmNewDataset.addEventListener('click', confirmNewDataset);
        dom.btnCancelNewDataset.addEventListener('click', () => closeModal(dom.modalNewDataset));
        dom.btnCloseNewDataset.addEventListener('click', () => closeModal(dom.modalNewDataset));
        dom.modalNewDataset.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalNewDataset); });
        dom.newDatasetName.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmNewDataset(); });

        dom.btnRename.addEventListener('click', renameDataset);
        dom.btnConfirmRenameDataset.addEventListener('click', confirmRenameDataset);
        dom.btnCancelRenameDataset.addEventListener('click', () => closeModal(dom.modalRenameDataset));
        dom.btnCloseRenameDataset.addEventListener('click', () => closeModal(dom.modalRenameDataset));
        dom.modalRenameDataset.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalRenameDataset); });
        dom.renameDatasetName.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmRenameDataset(); });

        dom.btnDeleteDataset.addEventListener('click', deleteDataset);
        dom.btnConfirmDeleteDataset.addEventListener('click', confirmDeleteDataset);
        dom.btnCancelDeleteDataset.addEventListener('click', () => closeModal(dom.modalDeleteDataset));
        dom.btnCloseDeleteDataset.addEventListener('click', () => closeModal(dom.modalDeleteDataset));
        dom.modalDeleteDataset.addEventListener('click', function(e) { if (e.target === this) closeModal(dom.modalDeleteDataset); });

        // 数值对比与二次确认
        dom.btnKeepOld.addEventListener('click', executeKeepOld);
        dom.btnReplaceNew.addEventListener('click', executeReplaceNew);
        dom.btnCloseCompare.addEventListener('click', () => { closeCompareModal(); dom.inputHint.textContent = '已取消'; });
        dom.modalCompare.addEventListener('click', function(e) { if(e.target === this) closeCompareModal(); });

        dom.btnCancelConfirm.addEventListener('click', () => { closeConfirmModal(); openModal(dom.modalCompare); });
        dom.btnConfirmAction.addEventListener('click', executeConfirmedAction);
        dom.btnCloseConfirm.addEventListener('click', () => { closeConfirmModal(); openModal(dom.modalCompare); });
        dom.modalConfirm.addEventListener('click', function(e) { if(e.target === this) { closeConfirmModal(); openModal(dom.modalCompare); } });

        // 全获取提示
        dom.btnConfirmFullAcquire.addEventListener('click', closeFullAcquireModal);
        dom.btnCloseFullAcquire.addEventListener('click', closeFullAcquireModal);
        dom.modalFullAcquire.addEventListener('click', function(e) { if(e.target === this) closeFullAcquireModal(); });

        // 非法输入
        dom.btnConfirmIllegal.addEventListener('click', closeIllegalModal);
        dom.btnCloseIllegal.addEventListener('click', closeIllegalModal);
        dom.modalIllegalInput.addEventListener('click', function(e) { if(e.target === this) closeIllegalModal(); });

        // 通用弹窗
        dom.btnConfirmAlert.addEventListener('click', closeAlert);
        dom.btnCloseAlert.addEventListener('click', closeAlert);
        dom.modalAlert.addEventListener('click', function(e) { if(e.target === this) closeAlert(); });

        dom.btnConfirmConfirmDialog.addEventListener('click', () => {
            closeConfirmDialog();
            if (typeof window.__dialogConfirmCallback === 'function') window.__dialogConfirmCallback();
        });
        dom.btnCancelConfirmDialog.addEventListener('click', () => {
            closeConfirmDialog();
            if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
        });
        dom.btnCloseConfirmDialog.addEventListener('click', () => {
            closeConfirmDialog();
            if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
        });
        dom.modalConfirmDialog.addEventListener('click', function(e) {
            if (e.target === this) {
                closeConfirmDialog();
                if (typeof window.__dialogCancelCallback === 'function') window.__dialogCancelCallback();
            }
        });

        dom.btnRecordClear.addEventListener('click', clearCellRecord);

        // 设置事件
        dom.colWidthSlider.addEventListener('input', function() {
            const val = parseInt(this.value);
            dom.colWidthValue.textContent = val;
            applyStyle(val, parseInt(dom.rowHeightSlider.value));
        });
        dom.rowHeightSlider.addEventListener('input', function() {
            const val = parseInt(this.value);
            dom.rowHeightValue.textContent = val;
            applyStyle(parseInt(dom.colWidthSlider.value), val);
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
        });

        dom.btnUndo.addEventListener('click', undo);
        dom.btnRedo.addEventListener('click', redo);

        
    }

    // 保存操作记录（仅用于录入面板的基质变化）
    function pushHistory(rowIdx, colIndex, oldCell, newCell) {
        // 清除当前位置之后的历史（如果之前有重做再操作新的，则丢弃后续）
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ rowIdx, colIndex, oldCell: JSON.parse(JSON.stringify(oldCell)), newCell: JSON.parse(JSON.stringify(newCell)) });
        // 只保留最近20条
        if (state.history.length > 20) {
            state.history.shift();
        } else {
            state.historyIndex++;
        }
        updateUndoRedoButtons();
    }

    // 获取单元格对应的名称
    function getCellNames(rowIdx, colIndex) {
        let groupIdx = 0, remaining = colIndex;
        for (let i = 0; i < ALL_GROUPS.length; i++) {
            const subLen = ALL_GROUPS[i].sub.length;
            if (remaining < subLen) {
                return {
                    rowName: ROW_NAMES[rowIdx],
                    groupName: ALL_GROUPS[i].name,
                    subName: ALL_GROUPS[i].sub[remaining]
                };
            }
            remaining -= subLen;
        }
        return { rowName: '?', groupName: '?', subName: '?' };
    }

    // 执行撤回
    function undo() {
        if (state.historyIndex < 0) return;
        const record = state.history[state.historyIndex];
        // 恢复旧状态
        state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.oldCell));
        state.historyIndex--;
        renderAllTables(); saveData();
        updateUndoRedoButtons();
        // 显示撤回弹窗
        const names = getCellNames(record.rowIdx, record.colIndex);
        const oldT = record.oldCell.t, oldA = record.oldCell.a;
        const newT = record.newCell.t, newA = record.newCell.a;
        showAlert(
            `已撤回：${names.rowName} > ${names.groupName} > ${names.subName} (重复${newT} → ${oldT}, 拥有${newA} → ${oldA})`,
            '撤回成功'
        );
    }

    // 执行重做
    function redo() {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex++;
        const record = state.history[state.historyIndex];
        state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.newCell));
        renderAllTables(); saveData();
        updateUndoRedoButtons();
        const names = getCellNames(record.rowIdx, record.colIndex);
        const oldT = record.oldCell.t, oldA = record.oldCell.a;
        const newT = record.newCell.t, newA = record.newCell.a;
        showAlert(
            `已重做：${names.rowName} > ${names.groupName} > ${names.subName} (重复${oldT} → ${newT}, 拥有${oldA} → ${newA})`,
            '重做成功'
        );
    }

    // 更新按钮状态
    function updateUndoRedoButtons() {
        dom.btnUndo.disabled = state.historyIndex < 0;
        dom.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
    }

    // 清除指定词条组单元格的全部属性
    function clearCellRecord() {
        const subIdx = parseInt(dom.recordSubCol.value);
        const rowIdx = parseInt(dom.recordRow.value);
        const groupIdx = parseInt(dom.recordGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);

        // 保存旧状态用于撤回（如果已启用撤回功能）
        const oldCell = JSON.parse(JSON.stringify(cell));

        // 重置为默认空状态
        state.rows[rowIdx].data[colIndex] = defaultCellMeta();
        renderAllTables(); saveData();

        // 如果已有撤回历史功能，可调用 pushHistory(rowIdx, colIndex, oldCell, defaultCellMeta());
        // 此处直接提示
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];
        showAlert(`已清除：${rowName} > ${groupName} > ${subName} 的全部属性`, '清除成功');
        dom.recordHint.textContent = '已清除所选单元格属性';
    }

    function clearCurrentCell() {
        const subIdx = parseInt(dom.inputSubCol.value);
        const rowIdx = parseInt(dom.inputRow.value);
        const groupIdx = parseInt(dom.inputGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;
    
        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
    
        // 如果存在基质记录，禁止清除
        if (cell.t > 0) {
            showAlert('该单元格存在基质记录（重复数>0），无法清除数值。', '操作阻止');
            return;
        }
    
        // 如果已经为空，提示无变化
        if (cell.v === '') {
            showAlert('当前单元格无数值，无需清除。', '提示');
            return;
        }
    
        // 清空数值
        cell.v = '';
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];
        showAlert(`已清除单元格：${rowName} > ${groupName} > ${subName} 的数值。`, '清除成功');
        dom.inputHint.textContent = '当前单元格数值已清除';
    }

    // ========== 初始化 ==========
    function init() {
        loadTheme();
        const lastKey = localStorage.getItem('smarttable_current_dataset');
        if (lastKey && /^[a-zA-Z0-9_]+$/.test(lastKey)) STORAGE_KEY_DATA = lastKey;
        if (!getDatasetList().includes(DEFAULT_STORAGE_KEY)) {
            addDatasetKey(DEFAULT_STORAGE_KEY);
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(createInitialRows()));
        }
        updateDatasetDisplay();
        updateDatasetSelect();
        if (!loadData()) { state.rows = createInitialRows(); saveData(); }
        populateDropdowns();
        bindEvents();
        renderAllTables();
        switchPanel('input');
        initSettings(); // 初始化设置值
        localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
        dom.inputHint.textContent = '准备就绪';
    }
    init();
})();