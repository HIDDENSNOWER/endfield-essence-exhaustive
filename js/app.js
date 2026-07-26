(function() {
    const STORAGE_KEY_THEME = 'smarttable_theme';
    const DEFAULT_STORAGE_KEY = 'smarttable_data';
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

    function createEmptyRowData() {
        return new Array(70).fill('');
    }

    function createInitialRows() {
        return ROW_NAMES.map(name => ({ name, data: createEmptyRowData() }));
    }

    let state = {
        rows: createInitialRows(),
        searchQuery: '',
        theme: 'light'
    };

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
    };

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
            return row.data.some(cell => String(cell).toLowerCase().includes(q));
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
                if (subIdx === group.sub.length - 1 && groupIdx < groups.length - 1) {
                    th.classList.add('border-group-right');
                }
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
            td.style.textAlign = 'center';
            td.style.padding = '24px';
            td.style.color = 'var(--text-tertiary)';
            tr.appendChild(td);
            tbody.appendChild(tr);
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
                    const val = row.data[colIndex];
                    td.textContent = val === '' ? '—' : val;
                    if (val === '') td.classList.add('empty-value');
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

    // ========== 数据集注册表管理 ==========
    function getDatasetList() {
        try {
            const list = JSON.parse(localStorage.getItem(DATASET_LIST_KEY));
            return Array.isArray(list) ? list : [];
        } catch (e) { return []; }
    }

    function saveDatasetList(list) {
        localStorage.setItem(DATASET_LIST_KEY, JSON.stringify(list));
    }

    function addDatasetKey(key) {
        const list = getDatasetList();
        if (!list.includes(key)) {
            list.push(key);
            saveDatasetList(list);
        }
    }

    function removeDatasetKey(key) {
        let list = getDatasetList().filter(k => k !== key);
        saveDatasetList(list);
    }

    function updateDatasetSelect() {
        const list = getDatasetList();
        if (!list.includes(STORAGE_KEY_DATA)) {
            addDatasetKey(STORAGE_KEY_DATA);
        }
        const options = list.map(key => `<option value="${key}" ${key === STORAGE_KEY_DATA ? 'selected' : ''}>${key}</option>`).join('');
        dom.datasetSelect.innerHTML = options;
    }

    function switchDataset(key) {
        if (key === STORAGE_KEY_DATA) return;
        STORAGE_KEY_DATA = key;
        updateDatasetDisplay();
        if (!loadData()) {
            state.rows = createInitialRows();
            saveData();
        }
        renderAllTables();
        updateDatasetSelect();
        dom.inputHint.textContent = `已切换到数据集: ${key}`;
        localStorage.setItem('smarttable_current_dataset', key);
    }

    function updateDatasetDisplay() {
        dom.datasetName.textContent = STORAGE_KEY_DATA;
    }

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
                    state.rows = parsed;
                    addDatasetKey(STORAGE_KEY_DATA);
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    // ★ 新建数据集
    function createNewDataset() {
        const name = prompt('请输入新数据集名称（只能包含字母、数字和下划线）：');
        if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
            if (name !== null) alert('名称无效，请使用字母、数字或下划线。');
            return;
        }
        if (getDatasetList().includes(name)) {
            alert('此名称已存在，请使用其他名称。');
            return;
        }
        // 创建空白数据
        const emptyRows = createInitialRows();
        localStorage.setItem(name, JSON.stringify(emptyRows));
        addDatasetKey(name);
        STORAGE_KEY_DATA = name;
        state.rows = JSON.parse(JSON.stringify(emptyRows)); // 深拷贝
        updateDatasetDisplay();
        updateDatasetSelect();
        renderAllTables();
        dom.inputHint.textContent = `已创建并切换到新数据集: ${name}`;
        localStorage.setItem('smarttable_current_dataset', name);
    }

    // 导出
    function exportData() {
        const dataStr = JSON.stringify(state.rows, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        dom.inputHint.textContent = '数据集已导出';
    }

    // 导入
    function importData(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data) && data.length > 0 && data[0].name && Array.isArray(data[0].data)) {
                    const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                    const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
                    if (getDatasetList().includes(newKey)) {
                        if (!confirm(`数据集"${newKey}"已存在，是否覆盖？`)) return;
                    }
                    state.rows = data;
                    STORAGE_KEY_DATA = newKey;
                    localStorage.setItem(newKey, JSON.stringify(data));
                    addDatasetKey(newKey);
                    updateDatasetDisplay();
                    updateDatasetSelect();
                    renderAllTables();
                    dom.inputHint.textContent = `已导入并切换到数据集: ${newKey}`;
                    localStorage.setItem('smarttable_current_dataset', newKey);
                } else {
                    alert('文件格式不正确，请导入有效的备份文件。');
                }
            } catch (err) {
                alert('解析文件失败，请检查文件内容。');
            }
        };
        reader.readAsText(file);
    }

    function triggerImport() {
        dom.importFile.click();
    }

    // 重命名
    function renameDataset() {
        const newName = prompt('请输入新数据集名称（只能包含字母、数字和下划线）：', STORAGE_KEY_DATA);
        if (!newName || !/^[a-zA-Z0-9_]+$/.test(newName)) {
            if (newName !== null) alert('名称无效，请使用字母、数字或下划线。');
            return;
        }
        if (newName === STORAGE_KEY_DATA) return;
        if (getDatasetList().includes(newName)) {
            alert('此名称已存在，请使用其他名称。');
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
        dom.inputHint.textContent = `数据集已重命名为: ${newName}`;
        localStorage.setItem('smarttable_current_dataset', newName);
    }

    // 删除
    function deleteDataset() {
        const currentKey = STORAGE_KEY_DATA;
        const list = getDatasetList();
        if (list.length <= 1) {
            alert('至少需要保留一个数据集。');
            return;
        }
        if (!confirm(`确定要删除数据集"${currentKey}"吗？此操作不可撤销。`)) return;
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
        dom.inputHint.textContent = `数据集已删除，已切换至: ${newKey}`;
        localStorage.setItem('smarttable_current_dataset', newKey);
    }

    // 清空内容
    function clearAllData() {
        state.rows.forEach(row => { row.data = createEmptyRowData(); });
        renderAllTables();
        saveData();
        dom.inputHint.textContent = '当前数据集已清空';
    }

    // ========== 下拉框与输入 ==========
    function populateDropdowns() {
        dom.inputRow.innerHTML = ROW_NAMES.map((name, idx) => `<option value="${idx}">${name}</option>`).join('');
        dom.inputGroup.innerHTML = ALL_GROUPS.map((g, idx) => `<option value="${idx}">${g.name}</option>`).join('');
        updateSubColOptions(0);
    }

    function updateSubColOptions(groupIdx) {
        const subs = ALL_GROUPS[groupIdx].sub;
        dom.inputSubCol.innerHTML = subs.map((s, idx) => `<option value="${idx}">${s}</option>`).join('');
    }

    function getColumnIndex(groupIdx, subIdx) {
        let col = 0;
        for (let i = 0; i < groupIdx; i++) col += ALL_GROUPS[i].sub.length;
        return col + subIdx;
    }

    function applyValue() {
        const rowIdx = parseInt(dom.inputRow.value);
        const groupIdx = parseInt(dom.inputGroup.value);
        const subIdx = parseInt(dom.inputSubCol.value);
        const value = dom.inputValue.value;

        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

        const colIndex = getColumnIndex(groupIdx, subIdx);
        const newVal = value === '' ? '' : Number(value);
        state.rows[rowIdx].data[colIndex] = newVal;

        renderAllTables();
        saveData();

        const rowName = ROW_NAMES[rowIdx];
        const groupName = ALL_GROUPS[groupIdx].name;
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal === '' ? '空' : newVal}`;
    }

    function enableWheelSelect(selectEl) {
        selectEl.addEventListener('wheel', function(e) {
            e.preventDefault();
            const opts = this.options;
            if (opts.length === 0) return;
            let newIdx = this.selectedIndex;
            if (e.deltaY > 0) {
                newIdx = (newIdx + 1) % opts.length;
            } else {
                newIdx = (newIdx - 1 + opts.length) % opts.length;
            }
            this.selectedIndex = newIdx;
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }, { passive: false });
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        dom.btnToggleTheme.addEventListener('click', toggleTheme);
        dom.searchInput.addEventListener('input', () => {
            state.searchQuery = dom.searchInput.value;
            renderAllTables();
        });

        dom.inputGroup.addEventListener('change', () => {
            updateSubColOptions(parseInt(dom.inputGroup.value));
        });

        enableWheelSelect(dom.inputRow);
        enableWheelSelect(dom.inputGroup);
        enableWheelSelect(dom.inputSubCol);
        enableWheelSelect(dom.datasetSelect);

        dom.btnApplyValue.addEventListener('click', applyValue);
        dom.btnClearAll.addEventListener('click', () => {
            if (confirm('确定要清空当前数据集的所有数值吗？')) {
                clearAllData();
            }
        });

        dom.datasetSelect.addEventListener('change', () => {
            switchDataset(dom.datasetSelect.value);
        });

        dom.btnExport.addEventListener('click', exportData);
        dom.btnImport.addEventListener('click', triggerImport);
        dom.importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
                e.target.value = '';
            }
        });
        dom.btnNewDataset.addEventListener('click', createNewDataset);
        dom.btnRename.addEventListener('click', renameDataset);
        dom.btnDeleteDataset.addEventListener('click', deleteDataset);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
        });
    }

    // ========== 初始化 ==========
    function init() {
        loadTheme();

        const lastKey = localStorage.getItem('smarttable_current_dataset');
        if (lastKey && /^[a-zA-Z0-9_]+$/.test(lastKey)) {
            STORAGE_KEY_DATA = lastKey;
        }

        if (!getDatasetList().includes(DEFAULT_STORAGE_KEY)) {
            addDatasetKey(DEFAULT_STORAGE_KEY);
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(createInitialRows()));
        }

        updateDatasetDisplay();
        updateDatasetSelect();

        if (!loadData()) {
            state.rows = createInitialRows();
            saveData();
        }

        populateDropdowns();
        bindEvents();
        renderAllTables();
        localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
        dom.inputHint.textContent = '准备就绪';
    }

    init();
})();