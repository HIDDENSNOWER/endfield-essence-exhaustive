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
        history: [],
        historyIndex: -1
    };
    let pendingApply = null;
    let confirmCallback = null;
    let clearAllTimer = null;
    let clearErrorTimer = null;
    let deleteConfirmTimer = null;
    let deleteErrorTimer = null;
    let highlightedCellElement = null;
    let statsSortBy = 'totalMatrix';
    let statsSortOrder = 'desc';

    const dom = {
        tableHead1: document.getElementById('tableHead1'),
        tableBody1: document.getElementById('tableBody1'),
        tableHead2: document.getElementById('tableHead2'),
        tableBody2: document.getElementById('tableBody2'),
        searchInput: document.getElementById('searchInput'),
        btnToggleTheme: document.getElementById('btnToggleTheme'),
        iconSun: document.getElementById('icon-sun'),
        iconMoon: document.getElementById('icon-moon'),

        inputVal1: document.getElementById('inputVal1'),
        inputVal2: document.getElementById('inputVal2'),
        inputVal3: document.getElementById('inputVal3'),

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
        previewHasValue: document.getElementById('previewHasValue'),
        pickerHasValue: document.getElementById('pickerHasValue'),
        inputHasValue: document.getElementById('inputHasValue'),
        previewStatusNone: document.getElementById('previewStatusNone'),
        pickerStatusNone: document.getElementById('pickerStatusNone'),
        inputStatusNone: document.getElementById('inputStatusNone'),
        previewStatusPartial: document.getElementById('previewStatusPartial'),
        pickerStatusPartial: document.getElementById('pickerStatusPartial'),
        inputStatusPartial: document.getElementById('inputStatusPartial'),
        previewStatusFull: document.getElementById('previewStatusFull'),
        pickerStatusFull: document.getElementById('pickerStatusFull'),
        inputStatusFull: document.getElementById('inputStatusFull'),
        btnResetColors: document.getElementById('btnResetColors'),
        previewTextLight: document.getElementById('previewTextLight'),
        pickerTextLight: document.getElementById('pickerTextLight'),
        inputTextLight: document.getElementById('inputTextLight'),
        previewTextDark: document.getElementById('previewTextDark'),
        pickerTextDark: document.getElementById('pickerTextDark'),
        inputTextDark: document.getElementById('inputTextDark'),
        fontSizeSlider: document.getElementById('fontSizeSlider'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        modalClearAll: document.getElementById('modalClearAll'),
        clearAllCountdown: document.getElementById('clearAllCountdown'),
        clearAllInput: document.getElementById('clearAllInput'),
        btnCancelClearAll: document.getElementById('btnCancelClearAll'),
        btnConfirmClearAll: document.getElementById('btnConfirmClearAll'),
        btnCloseClearAll: document.getElementById('btnCloseClearAll'),
        modalClearError: document.getElementById('modalClearError'),
        errorCountdown: document.getElementById('errorCountdown'),
        btnCloseClearError: document.getElementById('btnCloseClearError'),
        btnForceCloseError: document.getElementById('btnForceCloseError'),
        modalDeleteConfirm: document.getElementById('modalDeleteConfirm'),
        deleteConfirmBody: document.getElementById('deleteConfirmBody'),
        deleteConfirmDatasetName: document.getElementById('deleteConfirmDatasetName'),
        deleteConfirmCountdown: document.getElementById('deleteConfirmCountdown'),
        deleteConfirmInput: document.getElementById('deleteConfirmInput'),
        btnCancelDeleteConfirm: document.getElementById('btnCancelDeleteConfirm'),
        btnConfirmDeleteAction: document.getElementById('btnConfirmDeleteAction'),
        btnCloseDeleteConfirm: document.getElementById('btnCloseDeleteConfirm'),
        modalDeleteError: document.getElementById('modalDeleteError'),
        deleteErrorCountdown: document.getElementById('deleteErrorCountdown'),
        btnCloseDeleteError: document.getElementById('btnCloseDeleteError'),
        btnForceCloseDeleteError: document.getElementById('btnForceCloseDeleteError'),
        modalExport: document.getElementById('modalExport'),
        exportFileName: document.getElementById('exportFileName'),
        btnCancelExport: document.getElementById('btnCancelExport'),
        btnConfirmExport: document.getElementById('btnConfirmExport'),
        btnCloseExport: document.getElementById('btnCloseExport'),
        btnForceRefresh: document.getElementById('btnForceRefresh'),
        btnOpenSettings: document.getElementById('btnOpenSettings'),
    };

    function normalizeCell(cell) {
        if (typeof cell === 'object' && cell !== null && 'v' in cell && 't' in cell && 'a' in cell) return cell;
        if (typeof cell === 'string' || typeof cell === 'number') return { v: cell === '' ? '' : String(cell), t: 0, a: 0 };
        return defaultCellMeta();
    }

    const COLOR_MAP = {
        hasValue: { var: '--has-value-bg', defaultLight: '#c8e6c9', defaultDark: '#2a4a35', preview: 'previewHasValue', picker: 'pickerHasValue', input: 'inputHasValue' },
        statusNone: { var: '--status-none-bg', defaultLight: '#cfd8dc', defaultDark: '#3a3f47', preview: 'previewStatusNone', picker: 'pickerStatusNone', input: 'inputStatusNone' },
        statusPartial: { var: '--status-partial-bg', defaultLight: '#ffe0b2', defaultDark: '#5a4a28', preview: 'previewStatusPartial', picker: 'pickerStatusPartial', input: 'inputStatusPartial' },
        statusFull: { var: '--status-full-bg', defaultLight: '#a5d6a7', defaultDark: '#2e5a3b', preview: 'previewStatusFull', picker: 'pickerStatusFull', input: 'inputStatusFull' },
    };

    const TEXT_COLOR_MAP = {
        textLight: { var: '--text-cell', defaultLight: '#1f2328', defaultDark: '#1f2328', preview: 'previewTextLight', picker: 'pickerTextLight', input: 'inputTextLight', theme: 'light' },
        textDark:  { var: '--text-cell', defaultLight: '#e6edf3', defaultDark: '#e6edf3', preview: 'previewTextDark', picker: 'pickerTextDark', input: 'inputTextDark', theme: 'dark' }
    };
    
    const STORAGE_KEY_COLORS = 'smarttable_user_colors';
    let userColorData = { light: {}, dark: {} };

    // ========== 主题 ==========
    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        dom.iconSun.style.display = theme === 'dark' ? 'none' : '';
        dom.iconMoon.style.display = theme === 'dark' ? '' : 'none';
        localStorage.setItem(STORAGE_KEY_THEME, theme);
        syncColorUI();
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
            const originalIndex = state.rows.indexOf(row);
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

                    td.dataset.rowindex = originalIndex;
                    td.dataset.colindex = colIndex;

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
        updateHighlightedCell();
    }

    function updateHighlightedCell() {
        if (highlightedCellElement) {
            highlightedCellElement.classList.remove('cell-highlight-blink');
            highlightedCellElement = null;
        }
        let subSelect, rowSelect, groupSelect;
        if (state.activePanel === 'input') {
            subSelect = dom.inputSubCol;
            rowSelect = dom.inputRow;
            groupSelect = dom.inputGroup;
        } else if (state.activePanel === 'record') {
            subSelect = dom.recordSubCol;
            rowSelect = dom.recordRow;
            groupSelect = dom.recordGroup;
        } else {
            return;
        }
        const subIdx = parseInt(subSelect.value);
        const rowIdx = parseInt(rowSelect.value);
        const groupIdx = parseInt(groupSelect.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;
        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = document.querySelector(`td[data-rowindex="${rowIdx}"][data-colindex="${colIndex}"]`);
        if (cell) {
            cell.classList.add('cell-highlight-blink');
            highlightedCellElement = cell;
        }
    }

    // ========== 统计面板 ==========
    function renderStats() {
        const stats = ALL_GROUPS.map(group => ({
            name: group.name,
            totalMatrix: 0,
            totalT: 0,
            totalA: 0
        }));
        state.rows.forEach(row => {
            row.data.forEach((cell, colIndex) => {
                const c = normalizeCell(cell);
                let groupIdx = 0;
                let remaining = colIndex;
                for (let i = 0; i < ALL_GROUPS.length; i++) {
                    const subLen = ALL_GROUPS[i].sub.length;
                    if (remaining < subLen) {
                        groupIdx = i;
                        break;
                    }
                    remaining -= subLen;
                }
                if (c.v !== '' && c.v !== null && c.v !== undefined) {
                    stats[groupIdx].totalMatrix += 1;
                } else if (c.t > 0) {
                    stats[groupIdx].totalMatrix += (c.a || 0);
                }
                stats[groupIdx].totalT += c.t || 0;
                stats[groupIdx].totalA += c.a || 0;
            });
        });
        stats.forEach(s => s.unacquired = s.totalT - s.totalA);

        const totals = {
            totalMatrix: stats.reduce((sum, s) => sum + s.totalMatrix, 0),
            totalT: stats.reduce((sum, s) => sum + s.totalT, 0),
            totalA: stats.reduce((sum, s) => sum + s.totalA, 0),
            unacquired: stats.reduce((sum, s) => sum + s.unacquired, 0)
        };

        stats.sort((a, b) => {
            let valA, valB;
            switch (statsSortBy) {
                case 'totalT': valA = a.totalT; valB = b.totalT; break;
                case 'totalA': valA = a.totalA; valB = b.totalA; break;
                case 'unacquired': valA = a.unacquired; valB = b.unacquired; break;
                default: valA = a.totalMatrix; valB = b.totalMatrix;
            }
            return statsSortOrder === 'asc' ? valA - valB : valB - valA;
        });

        let html = `
        <div class="stats-summary">
            <table class="summary-table">
                <tr><td>总基质数</td><td>${totals.totalMatrix}</td></tr>
                <tr><td>总实装基质数</td><td>${totals.totalT}</td></tr>
                <tr><td>总获取实装基质数</td><td>${totals.totalA}</td></tr>
                <tr><td>未获取实装基质数</td><td>${totals.unacquired}</td></tr>
            </table>
        </div>
        <div class="stats-sort-controls">
            <div>
                <label>排序依据</label>
                <select id="statsSortBy">
                    <option value="totalMatrix" ${statsSortBy === 'totalMatrix' ? 'selected' : ''}>总基质数</option>
                    <option value="totalT" ${statsSortBy === 'totalT' ? 'selected' : ''}>总实装基质</option>
                    <option value="totalA" ${statsSortBy === 'totalA' ? 'selected' : ''}>已获取实装</option>
                    <option value="unacquired" ${statsSortBy === 'unacquired' ? 'selected' : ''}>未获取实装</option>
                </select>
            </div>
            <div>
                <label>排序方式</label>
                <select id="statsSortOrder">
                    <option value="desc" ${statsSortOrder === 'desc' ? 'selected' : ''}>降序</option>
                    <option value="asc" ${statsSortOrder === 'asc' ? 'selected' : ''}>升序</option>
                </select>
            </div>
        </div>`;

        stats.forEach(s => {
            const highlight = statsSortBy;
            html += `
            <div class="stat-card">
                <table>
                    <tr><th colspan="4">${s.name}</th></tr>
                    <tr>
                        <td class="data-label">未获取实装</td>
                        <td class="data-value${highlight === 'unacquired' ? ' highlight-value' : ''}">${s.unacquired}</td>
                        <td class="data-label">总实装基质</td>
                        <td class="data-value${highlight === 'totalT' ? ' highlight-value' : ''}">${s.totalT}</td>
                    </tr>
                    <tr>
                        <td class="data-label">已获取实装</td>
                        <td class="data-value${highlight === 'totalA' ? ' highlight-value' : ''}">${s.totalA}</td>
                        <td class="data-label">总基质数</td>
                        <td class="data-value${highlight === 'totalMatrix' ? ' highlight-value' : ''}">${s.totalMatrix}</td>
                    </tr>
                </table>
            </div>`;
        });

        dom.statsContent.innerHTML = html;

        const sortBySelect = document.getElementById('statsSortBy');
        const sortOrderSelect = document.getElementById('statsSortOrder');
        if (sortBySelect && sortOrderSelect) {
            sortBySelect.addEventListener('change', function () {
                statsSortBy = this.value;
                renderStats();
            });
            sortOrderSelect.addEventListener('change', function () {
                statsSortOrder = this.value;
                renderStats();
            });
            enableWheelSelect(sortBySelect);
            enableWheelSelect(sortOrderSelect);
        }
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
        updateHighlightedCell();
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
        const defaultName = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0,10)}.json`;
        dom.exportFileName.value = defaultName;
        openModal(dom.modalExport);
        setTimeout(() => dom.exportFileName.focus(), 100);
    }

    function doExport() {
        let fileName = dom.exportFileName.value.trim();
        if (!fileName) {
            fileName = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0,10)}.json`;
        }
        if (!fileName.endsWith('.json')) {
            fileName += '.json';
        }
        const dataStr = JSON.stringify(state.rows, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        closeModal(dom.modalExport);
        dom.inputHint.textContent = `已导出：${fileName}`;
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
        openDeleteConfirmModal();
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
        const v1 = dom.inputVal1.value.trim();
        const v2 = dom.inputVal2.value.trim();
        const v3 = dom.inputVal3.value.trim();
        if (v1 === '' && v2 === '' && v3 === '') {
            dom.inputHint.textContent = '输入为空，未做更改。';
            return;
        }
        const combined = v1 + v2 + v3;
        if (!/^\d{3}$/.test(combined)) {
            showIllegalModal('非法输入：每个输入框必须填入一位数字（0‑9），不能有空或其它字符。');
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
            resetTripleInputs();
            return;
        }
        const oldVal = cell.v;
        const newVal = combined;
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];
        if (oldVal !== '' && parseTriple(oldVal) && parseTriple(newVal)) {
            showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName);
        } else {
            cell.v = String(newVal);
            state.rows[rowIdx].data[colIndex] = cell;
            renderAllTables(); saveData();
            dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
            resetTripleInputs();
        }
    }
    function applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName) {
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
        cell.v = newVal === '' ? '' : String(newVal);
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
        resetTripleInputs();
    }

    // ========== 录入面板 ==========
    function applyRecord() {
        const subIdx = parseInt(dom.recordSubCol.value);
        const rowIdx = parseInt(dom.recordRow.value);
        const groupIdx = parseInt(dom.recordGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;
        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
        const oldCell = JSON.parse(JSON.stringify(cell));
        if (cell.t === 0) {
            if (cell.v !== '') {
                cell.t = 1;
                cell.a = 1;
                cell.v = '';
            } else {
                cell.t = 1;
                cell.a = 0;
            }
        } else {
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

        dom.btnApplyValue.addEventListener('click', applyValue);
        dom.btnClearAll.addEventListener('click', openClearAllModal);
        dom.btnRecordApply.addEventListener('click', applyRecord);

        dom.sidebarBtns.forEach(btn => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));

        dom.datasetSelect.addEventListener('change', () => switchDataset(dom.datasetSelect.value));
        dom.btnExport.addEventListener('click', exportData);
        dom.btnImport.addEventListener('click', triggerImport);
        dom.importFile.addEventListener('change', e => { if(e.target.files[0]){ importData(e.target.files[0]); e.target.value=''; } });

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

        dom.btnKeepOld.addEventListener('click', executeKeepOld);
        dom.btnReplaceNew.addEventListener('click', executeReplaceNew);
        dom.btnCloseCompare.addEventListener('click', () => { closeCompareModal(); dom.inputHint.textContent = '已取消'; });
        dom.modalCompare.addEventListener('click', function(e) { if(e.target === this) closeCompareModal(); });

        dom.btnCancelConfirm.addEventListener('click', () => { closeConfirmModal(); openModal(dom.modalCompare); });
        dom.btnConfirmAction.addEventListener('click', executeConfirmedAction);
        dom.btnCloseConfirm.addEventListener('click', () => { closeConfirmModal(); openModal(dom.modalCompare); });
        dom.modalConfirm.addEventListener('click', function(e) { if(e.target === this) { closeConfirmModal(); openModal(dom.modalCompare); } });

        dom.btnConfirmFullAcquire.addEventListener('click', closeFullAcquireModal);
        dom.btnCloseFullAcquire.addEventListener('click', closeFullAcquireModal);
        dom.modalFullAcquire.addEventListener('click', function(e) { if(e.target === this) closeFullAcquireModal(); });

        dom.btnConfirmIllegal.addEventListener('click', closeIllegalModal);
        dom.btnCloseIllegal.addEventListener('click', closeIllegalModal);
        dom.modalIllegalInput.addEventListener('click', function(e) { if(e.target === this) closeIllegalModal(); });

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
        dom.btnClearCell.addEventListener('click', clearCurrentCell);

        enableTripleInputScroll(dom.inputVal1);
        enableTripleInputScroll(dom.inputVal2);
        enableTripleInputScroll(dom.inputVal3);

        const colorKeys = ['hasValue', 'statusNone', 'statusPartial', 'statusFull'];
        colorKeys.forEach(key => {
            const cfg = COLOR_MAP[key];
            dom[cfg.picker].addEventListener('input', (e) => {
                handleColorChange(key, e.target.value);
            });
            dom[cfg.input].addEventListener('change', (e) => {
                handleColorChange(key, e.target.value.trim());
            });
            const modeBtns = document.querySelectorAll(`.mode-toggle[data-target="${key}"]`);
            modeBtns.forEach(btn => {
                btn.addEventListener('click', () => toggleColorMode(key));
            });
        });

        dom.btnResetColors.addEventListener('click', resetAllColors);

        const originalToggleTheme = toggleTheme;
        toggleTheme = function() {
            originalToggleTheme();
            syncColorUI();
        };

        loadUserColors();
        syncColorUI();

        ['textLight', 'textDark'].forEach(key => {
            const cfg = TEXT_COLOR_MAP[key];
            dom[cfg.picker].addEventListener('input', (e) => {
                handleTextColorChange(key, e.target.value);
            });
            dom[cfg.input].addEventListener('change', (e) => {
                handleTextColorChange(key, e.target.value.trim());
            });
            const modeBtns = document.querySelectorAll(`.mode-toggle[data-target="${key}"]`);
            modeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const inputEl = dom[cfg.input];
                    const currentVal = inputEl.value.trim();
                    const isHex = currentVal.startsWith('#');
                    if (isHex) {
                        inputEl.value = hexToRgbString(currentVal);
                    } else {
                        const hex = rgbStringToHex(currentVal);
                        if (hex) inputEl.value = hex;
                    }
                });
            });
        });

        dom.fontSizeSlider.addEventListener('input', applyFontStyle);

        dom.btnCancelClearAll.addEventListener('click', closeClearAllModal);
        dom.btnCloseClearAll.addEventListener('click', closeClearAllModal);
        dom.modalClearAll.addEventListener('click', function(e) {
            if (e.target === this) closeClearAllModal();
        });
        dom.btnConfirmClearAll.addEventListener('click', executeClearAll);
        dom.clearAllInput.addEventListener('input', checkClearAllButton);

        dom.btnForceCloseError.addEventListener('click', closeClearErrorModal);
        dom.btnCloseClearError.addEventListener('click', closeClearErrorModal);
        dom.modalClearError.addEventListener('click', function(e) {
            if (e.target === this) closeClearErrorModal();
        });

        dom.btnCancelDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
        dom.btnCloseDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
        dom.modalDeleteConfirm.addEventListener('click', function(e) {
            if (e.target === this) closeDeleteConfirmModal();
        });
        dom.btnConfirmDeleteAction.addEventListener('click', executeDeleteAction);

        dom.btnForceCloseDeleteError.addEventListener('click', closeDeleteErrorModal);
        dom.btnCloseDeleteError.addEventListener('click', closeDeleteErrorModal);
        dom.modalDeleteError.addEventListener('click', function(e) {
            if (e.target === this) closeDeleteErrorModal();
        });

        dom.deleteConfirmInput.addEventListener('input', function() {});

        dom.btnCancelExport.addEventListener('click', () => closeModal(dom.modalExport));
        dom.btnCloseExport.addEventListener('click', () => closeModal(dom.modalExport));
        dom.modalExport.addEventListener('click', function(e) {
            if (e.target === this) closeModal(dom.modalExport);
        });
        dom.btnConfirmExport.addEventListener('click', doExport);
        dom.exportFileName.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doExport();
        });

        dom.inputSubCol.addEventListener('change', updateHighlightedCell);
        dom.inputRow.addEventListener('change', updateHighlightedCell);
        dom.inputGroup.addEventListener('change', updateHighlightedCell);

        [dom.inputSubCol, dom.inputRow, dom.inputGroup, dom.recordSubCol, dom.recordRow, dom.recordGroup].forEach(select => {
            select.addEventListener('change', updateHighlightedCell);
        });

        dom.btnForceRefresh.addEventListener('click', () => {
            window.location.reload(true);
        });

        dom.btnOpenSettings.addEventListener('click', () => {
            switchPanel('settings');
        });
    }

    // 保存操作记录（仅用于录入面板的基质变化）
    function pushHistory(rowIdx, colIndex, oldCell, newCell) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ rowIdx, colIndex, oldCell: JSON.parse(JSON.stringify(oldCell)), newCell: JSON.parse(JSON.stringify(newCell)) });
        if (state.history.length > 20) {
            state.history.shift();
        } else {
            state.historyIndex++;
        }
        updateUndoRedoButtons();
    }

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

    function undo() {
        if (state.historyIndex < 0) return;
        const record = state.history[state.historyIndex];
        state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.oldCell));
        state.historyIndex--;
        renderAllTables(); saveData();
        updateUndoRedoButtons();
        const names = getCellNames(record.rowIdx, record.colIndex);
        const oldT = record.oldCell.t, oldA = record.oldCell.a;
        const newT = record.newCell.t, newA = record.newCell.a;
        showAlert(
            `已撤回：${names.rowName} > ${names.groupName} > ${names.subName} (重复${newT} → ${oldT}, 拥有${newA} → ${oldA})`,
            '撤回成功'
        );
    }

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

    function updateUndoRedoButtons() {
        dom.btnUndo.disabled = state.historyIndex < 0;
        dom.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
    }

    function clearCellRecord() {
        const subIdx = parseInt(dom.recordSubCol.value);
        const rowIdx = parseInt(dom.recordRow.value);
        const groupIdx = parseInt(dom.recordGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;
        const colIndex = getColumnIndex(groupIdx, subIdx);
        const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
        const oldCell = JSON.parse(JSON.stringify(cell));
        state.rows[rowIdx].data[colIndex] = defaultCellMeta();
        renderAllTables(); saveData();
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
        if (cell.t > 0) {
            showAlert('该单元格存在基质记录（重复数>0），无法清除数值。', '操作阻止');
            return;
        }
        if (cell.v === '') {
            showAlert('当前单元格无数值，无需清除。', '提示');
            return;
        }
        cell.v = '';
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];
        showAlert(`已清除单元格：${rowName} > ${groupName} > ${subName} 的数值。`, '清除成功');
        dom.inputHint.textContent = '当前单元格数值已清除';
    }

    function resetTripleInputs() {
        dom.inputVal1.value = '1';
        dom.inputVal2.value = '1';
        dom.inputVal3.value = '1';
    }

    function enableTripleInputScroll(inputEl) {
        inputEl.addEventListener('wheel', function(e) {
            e.preventDefault();
            const cur = this.value.trim();
            let num = parseInt(cur);
            if (cur === '' || isNaN(num) || num === 0) {
                num = e.deltaY > 0 ? 9 : 1;
            } else {
                if (e.deltaY > 0) {
                    num = num === 1 ? 9 : num - 1;
                } else {
                    num = num === 9 ? 1 : num + 1;
                }
            }
            this.value = num;
            this.dispatchEvent(new Event('input', { bubbles: true }));
        }, { passive: false });
        inputEl.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 1);
        });
    }

    function isDarkTheme() { return state.theme === 'dark'; }

    function getDefaultColor(key) {
        const cfg = COLOR_MAP[key];
        return isDarkTheme() ? cfg.defaultDark : cfg.defaultLight;
    }

    function getCurrentCSSColor(varName) {
        const rootStyle = getComputedStyle(document.documentElement);
        return rootStyle.getPropertyValue(varName).trim() || '';
    }

    function hexToRgbString(hex) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return `rgb(${r}, ${g}, ${b})`;
    }

    function rgbStringToHex(rgb) {
        const match = rgb.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
        if (!match) return null;
        const toHex = (n) => {
            const num = parseInt(n);
            if (num < 0 || num > 255) return null;
            return num.toString(16).padStart(2, '0');
        };
        const r = toHex(match[1]), g = toHex(match[2]), b = toHex(match[3]);
        return r && g && b ? `#${r}${g}{b}` : null;
    }

    function saveUserColors() {
        localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(userColorData));
    }
    
    function loadUserColors() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COLORS);
            if (saved) {
                userColorData = JSON.parse(saved);
            }
        } catch(e) {}
    }
    
    function applyColorVariable(key, value) {
        document.documentElement.style.setProperty(COLOR_MAP[key].var, value);
        const cfg = COLOR_MAP[key];
        const preview = dom[cfg.preview];
        const input = dom[cfg.input];
        const picker = dom[cfg.picker];
        preview.style.backgroundColor = value;
        picker.value = value;
        input.value = value;
    }
    
    function syncColorUI() {
        const currentTheme = isDarkTheme() ? 'dark' : 'light';
        Object.keys(COLOR_MAP).forEach(key => {
            const savedColor = userColorData[currentTheme]?.[key];
            const currentColor = savedColor || getDefaultColor(key);
            applyColorVariable(key, currentColor);
        });
        const textKey = currentTheme === 'dark' ? 'textDark' : 'textLight';
        const textColor = userColorData[currentTheme]?.[textKey] || (currentTheme === 'dark' ? '#e6edf3' : '#1f2328');
        applyColorVariableForText(textKey, textColor);
        loadFontStyle();
    }

    function toggleColorMode(targetKey) {
        const cfg = COLOR_MAP[targetKey];
        const inputEl = dom[cfg.input];
        const currentVal = inputEl.value.trim();
        const isHex = currentVal.startsWith('#');
        if (isHex) {
            const rgb = hexToRgbString(currentVal);
            inputEl.value = rgb;
        } else {
            const hex = rgbStringToHex(currentVal);
            if (hex) {
                inputEl.value = hex;
            }
        }
    }

    function handleColorChange(key, newColor) {
        let hex = newColor;
        if (newColor.startsWith('rgb')) {
            const converted = rgbStringToHex(newColor);
            if (converted) hex = converted;
        }
        applyColorVariable(key, hex);
        const currentTheme = isDarkTheme() ? 'dark' : 'light';
        if (!userColorData[currentTheme]) userColorData[currentTheme] = {};
        userColorData[currentTheme][key] = hex;
        saveUserColors();
    }

    function resetAllColors() {
        const currentTheme = isDarkTheme() ? 'dark' : 'light';
        userColorData[currentTheme] = {};
        saveUserColors();
        syncColorUI();
        showAlert('颜色已恢复为默认值', '设置已重置');
    }

    function applyColorVariableForText(key, value) {
        document.documentElement.style.setProperty('--text-cell', value);
        const cfg = TEXT_COLOR_MAP[key];
        const preview = dom[cfg.preview];
        const input = dom[cfg.input];
        const picker = dom[cfg.picker];
        preview.style.backgroundColor = value;
        picker.value = value;
        input.value = value;
    }

    function handleTextColorChange(key, newColor) {
        let hex = newColor;
        if (newColor.startsWith('rgb')) {
            const converted = rgbStringToHex(newColor);
            if (converted) hex = converted;
        }
        applyColorVariableForText(key, hex);
        const currentTheme = isDarkTheme() ? 'dark' : 'light';
        if (!userColorData[currentTheme]) userColorData[currentTheme] = {};
        userColorData[currentTheme][key] = hex;
        saveUserColors();
    }

    function applyFontStyle() {
        const root = document.documentElement;
        const size = dom.fontSizeSlider.value + 'px';
        root.style.setProperty('--cell-font-size', size);
        dom.fontSizeValue.textContent = dom.fontSizeSlider.value;
        const currentTheme = isDarkTheme() ? 'dark' : 'light';
        if (!userColorData[currentTheme]) userColorData[currentTheme] = {};
        userColorData[currentTheme].fontSize = size;
        saveUserColors();
    }

    function loadFontStyle() {
        const currentTheme = isDarkTheme() ? 'dark' : 'light';
        const saved = userColorData[currentTheme] || {};
        const fontSize = saved.fontSize || '12px';
        dom.fontSizeSlider.value = parseInt(fontSize);
        dom.fontSizeValue.textContent = parseInt(fontSize);
        applyFontStyle();
    }

    function openClearAllModal() {
        dom.clearAllInput.value = '';
        dom.clearAllCountdown.textContent = '15';
        dom.btnConfirmClearAll.disabled = true;
        openModal(dom.modalClearAll);
        if (clearAllTimer) clearInterval(clearAllTimer);
        let seconds = 15;
        clearAllTimer = setInterval(() => {
            seconds--;
            dom.clearAllCountdown.textContent = seconds;
            checkClearAllButton();
            if (seconds <= 0) {
                clearInterval(clearAllTimer);
                clearAllTimer = null;
                checkClearAllButton();
            }
        }, 1000);
    }
    
    function checkClearAllButton() {
        const timeUp = parseInt(dom.clearAllCountdown.textContent) <= 0;
        dom.btnConfirmClearAll.disabled = !timeUp;
    }
    
    function closeClearAllModal() {
        if (clearAllTimer) {
            clearInterval(clearAllTimer);
            clearAllTimer = null;
        }
        closeModal(dom.modalClearAll);
    }
    
    function executeClearAll() {
        if (dom.clearAllInput.value.trim() !== '我确认清空') {
            closeClearAllModal();
            openClearErrorModal();
            return;
        }
        closeClearAllModal();
        clearAllData();
    }

    function openClearErrorModal() {
        dom.errorCountdown.textContent = '5';
        openModal(dom.modalClearError);
        if (clearErrorTimer) clearInterval(clearErrorTimer);
        let seconds = 5;
        clearErrorTimer = setInterval(() => {
            seconds--;
            dom.errorCountdown.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(clearErrorTimer);
                clearErrorTimer = null;
                closeModal(dom.modalClearError);
            }
        }, 1000);
    }
    
    function closeClearErrorModal() {
        if (clearErrorTimer) {
            clearInterval(clearErrorTimer);
            clearErrorTimer = null;
        }
        closeModal(dom.modalClearError);
    }

    function openDeleteConfirmModal() {
        dom.deleteConfirmDatasetName.textContent = STORAGE_KEY_DATA;
        dom.deleteConfirmInput.value = '';
        dom.deleteConfirmCountdown.textContent = '15';
        dom.btnConfirmDeleteAction.disabled = true;
        openModal(dom.modalDeleteConfirm);
        if (deleteConfirmTimer) clearInterval(deleteConfirmTimer);
        let seconds = 15;
        deleteConfirmTimer = setInterval(() => {
            seconds--;
            dom.deleteConfirmCountdown.textContent = seconds;
            checkDeleteConfirmButton();
            if (seconds <= 0) {
                clearInterval(deleteConfirmTimer);
                deleteConfirmTimer = null;
                checkDeleteConfirmButton();
            }
        }, 1000);
    }

    function checkDeleteConfirmButton() {
        const timeUp = parseInt(dom.deleteConfirmCountdown.textContent) <= 0;
        dom.btnConfirmDeleteAction.disabled = !timeUp;
    }

    function closeDeleteConfirmModal() {
        if (deleteConfirmTimer) {
            clearInterval(deleteConfirmTimer);
            deleteConfirmTimer = null;
        }
        closeModal(dom.modalDeleteConfirm);
    }

    function executeDeleteAction() {
        if (dom.deleteConfirmInput.value.trim() !== '我确认删除') {
            closeDeleteConfirmModal();
            openDeleteErrorModal();
            return;
        }
        closeDeleteConfirmModal();
        confirmDeleteDataset();
    }

    function openDeleteErrorModal() {
        dom.deleteErrorCountdown.textContent = '5';
        openModal(dom.modalDeleteError);
        if (deleteErrorTimer) clearInterval(deleteErrorTimer);
        let seconds = 5;
        deleteErrorTimer = setInterval(() => {
            seconds--;
            dom.deleteErrorCountdown.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(deleteErrorTimer);
                deleteErrorTimer = null;
                closeModal(dom.modalDeleteError);
            }
        }, 1000);
    }

    function closeDeleteErrorModal() {
        if (deleteErrorTimer) {
            clearInterval(deleteErrorTimer);
            deleteErrorTimer = null;
        }
        closeModal(dom.modalDeleteError);
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
        resetTripleInputs();
        switchPanel('input');
        initSettings();
        localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
        dom.inputHint.textContent = '准备就绪';
    }
    init();
})();