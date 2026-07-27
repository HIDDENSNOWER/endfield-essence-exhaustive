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

    function createEmptyRowData() { return new Array(70).fill(''); }
    function createInitialRows() { return ROW_NAMES.map(name => ({ name, data: createEmptyRowData() })); }

    let state = {
        rows: createInitialRows(),
        searchQuery: '',
        theme: 'light'
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
                    const val = row.data[colIndex];
                    td.textContent = val === '' ? '—' : val;
                    if (val === '') td.classList.add('empty-value');
                    td.classList.add(globalIdx % 2 === 0 ? 'group-even' : 'group-odd');
                    if (subIdx === group.sub.length - 1 && groupIdx < groups.length - 1) td.classList.add('border-group-right');
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
                    state.rows = parsed; addDatasetKey(STORAGE_KEY_DATA); return true;
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
    function importData(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data) && data.length > 0 && data[0].name && Array.isArray(data[0].data)) {
                    const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                    const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
                    if (getDatasetList().includes(newKey) && !confirm(`数据集"${newKey}"已存在，是否覆盖？`)) return;
                    state.rows = data;
                    STORAGE_KEY_DATA = newKey;
                    localStorage.setItem(newKey, JSON.stringify(data));
                    addDatasetKey(newKey);
                    updateDatasetDisplay(); updateDatasetSelect();
                    renderAllTables();
                    dom.inputHint.textContent = `已导入并切换到数据集: ${newKey}`;
                    localStorage.setItem('smarttable_current_dataset', newKey);
                } else alert('文件格式不正确。');
            } catch(err) { alert('解析文件失败。'); }
        };
        reader.readAsText(file);
    }
    function triggerImport() { dom.importFile.click(); }
    function createNewDataset() {
        const name = prompt('请输入新数据集名称（字母、数字、下划线）：');
        if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) { if(name!==null) alert('名称无效。'); return; }
        if (getDatasetList().includes(name)) { alert('名称已存在。'); return; }
        const empty = createInitialRows();
        localStorage.setItem(name, JSON.stringify(empty));
        addDatasetKey(name);
        STORAGE_KEY_DATA = name;
        state.rows = JSON.parse(JSON.stringify(empty));
        updateDatasetDisplay(); updateDatasetSelect();
        renderAllTables();
        dom.inputHint.textContent = `已创建新数据集: ${name}`;
        localStorage.setItem('smarttable_current_dataset', name);
    }
    function renameDataset() {
        const newName = prompt('新名称（字母、数字、下划线）：', STORAGE_KEY_DATA);
        if (!newName || !/^[a-zA-Z0-9_]+$/.test(newName)) { if(newName!==null) alert('名称无效。'); return; }
        if (newName === STORAGE_KEY_DATA) return;
        if (getDatasetList().includes(newName)) { alert('名称已存在。'); return; }
        const data = localStorage.getItem(STORAGE_KEY_DATA);
        localStorage.setItem(newName, data || '[]');
        removeDatasetKey(STORAGE_KEY_DATA);
        STORAGE_KEY_DATA = newName;
        addDatasetKey(newName);
        saveData();
        updateDatasetDisplay(); updateDatasetSelect();
        dom.inputHint.textContent = `已重命名为: ${newName}`;
        localStorage.setItem('smarttable_current_dataset', newName);
    }
    function deleteDataset() {
        const list = getDatasetList();
        if (list.length <= 1) { alert('至少保留一个数据集。'); return; }
        if (!confirm(`确定删除数据集"${STORAGE_KEY_DATA}"吗？`)) return;
        localStorage.removeItem(STORAGE_KEY_DATA);
        removeDatasetKey(STORAGE_KEY_DATA);
        const newKey = getDatasetList()[0] || DEFAULT_STORAGE_KEY;
        STORAGE_KEY_DATA = newKey;
        if (!loadData()) { state.rows = createInitialRows(); saveData(); }
        updateDatasetDisplay(); updateDatasetSelect();
        renderAllTables();
        dom.inputHint.textContent = `已删除，切换至: ${newKey}`;
        localStorage.setItem('smarttable_current_dataset', newKey);
    }
    function clearAllData() {
        state.rows.forEach(row => row.data = createEmptyRowData());
        renderAllTables(); saveData();
        dom.inputHint.textContent = '当前数据集已清空';
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
        dom.modalCompare.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeCompareModal() {
        dom.modalCompare.style.display = 'none';
        document.body.style.overflow = '';
        pendingApply = null;
    }

    function applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName) {
        state.rows[rowIdx].data[colIndex] = newVal === '' ? '' : Number(newVal);
        renderAllTables(); saveData();
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
    }

    // ========== 二次确认弹窗 ==========
    function showConfirmModal(message, reason, onConfirm) {
        dom.confirmBody.innerHTML = `
            <p style="font-size:0.9rem; color:var(--text-primary); margin-bottom:8px;">${message}</p>
            <div style="background:var(--bg-tertiary); padding:8px; border-radius:6px; font-size:0.8rem; color:var(--text-secondary);">
                ${reason}
            </div>
            <p style="font-size:0.8rem; color:var(--text-tertiary); margin-top:10px;">是否仍要执行此操作？</p>
        `;
        confirmCallback = onConfirm;
        dom.modalCompare.style.display = 'none';
        dom.modalConfirm.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeConfirmModal() {
        dom.modalConfirm.style.display = 'none';
        document.body.style.overflow = '';
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

    // ========== 输入功能 ==========
    function populateDropdowns() {
        dom.inputRow.innerHTML = ROW_NAMES.map((n,i) => `<option value="${i}">${n}</option>`).join('');
        dom.inputGroup.innerHTML = ALL_GROUPS.map((g,i) => `<option value="${i}">${g.name}</option>`).join('');
        updateSubColOptions(0);
    }
    function updateSubColOptions(groupIdx) {
        dom.inputSubCol.innerHTML = ALL_GROUPS[groupIdx].sub.map((s,i) => `<option value="${i}">${s}</option>`).join('');
    }
    function getColumnIndex(groupIdx, subIdx) {
        let col = 0;
        for (let i=0; i<groupIdx; i++) col += ALL_GROUPS[i].sub.length;
        return col + subIdx;
    }

    // ★ 修改：应用前校验
    function applyValue() {
        const value = dom.inputValue.value.trim();
        // 验证：非空时必须为三位数字
        if (value !== '' && !/^\d{3}$/.test(value)) {
            alert('非法输入！请输入三位数字（000-999），不能包含其他字符。');
            dom.inputValue.focus();
            return;
        }
        const subIdx = parseInt(dom.inputSubCol.value);
        const rowIdx = parseInt(dom.inputRow.value);
        const groupIdx = parseInt(dom.inputGroup.value);
        if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

        const colIndex = getColumnIndex(groupIdx, subIdx);
        const oldVal = state.rows[rowIdx].data[colIndex];
        const newVal = value === '' ? '' : Number(value);
        const groupName = ALL_GROUPS[groupIdx].name;
        const rowName = ROW_NAMES[rowIdx];
        const subName = ALL_GROUPS[groupIdx].sub[subIdx];

        if (oldVal !== '' && oldVal !== null && oldVal !== undefined && newVal !== '') {
            if (parseTriple(oldVal) && parseTriple(newVal)) {
                showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName);
                return;
            }
        }
        applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName);
    }

    // ========== 滚轮选择 ==========
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
        enableWheelSelect(dom.inputSubCol);
        enableWheelSelect(dom.inputRow);
        enableWheelSelect(dom.inputGroup);
        enableWheelSelect(dom.datasetSelect);

        // 过滤非数字输入（可选）
        dom.inputValue.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 3);
        });

        dom.btnApplyValue.addEventListener('click', applyValue);
        dom.btnClearAll.addEventListener('click', () => { if(confirm('清空当前数据集？')) clearAllData(); });
        dom.datasetSelect.addEventListener('change', () => switchDataset(dom.datasetSelect.value));
        dom.btnExport.addEventListener('click', exportData);
        dom.btnImport.addEventListener('click', triggerImport);
        dom.importFile.addEventListener('change', e => { if(e.target.files[0]){ importData(e.target.files[0]); e.target.value=''; } });
        dom.btnNewDataset.addEventListener('click', createNewDataset);
        dom.btnRename.addEventListener('click', renameDataset);
        dom.btnDeleteDataset.addEventListener('click', deleteDataset);

        dom.btnKeepOld.addEventListener('click', executeKeepOld);
        dom.btnReplaceNew.addEventListener('click', executeReplaceNew);
        dom.btnCloseCompare.addEventListener('click', () => { closeCompareModal(); dom.inputHint.textContent = '已取消'; });
        dom.modalCompare.addEventListener('click', function(e) { if(e.target === this) closeCompareModal(); });

        dom.btnCancelConfirm.addEventListener('click', () => { closeConfirmModal(); dom.modalCompare.style.display = 'flex'; });
        dom.btnConfirmAction.addEventListener('click', executeConfirmedAction);
        dom.btnCloseConfirm.addEventListener('click', () => { closeConfirmModal(); dom.modalCompare.style.display = 'flex'; });
        dom.modalConfirm.addEventListener('click', function(e) { if(e.target === this) { closeConfirmModal(); dom.modalCompare.style.display = 'flex'; } });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
        });
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
        localStorage.setItem('smarttable_current_dataset', STORAGE_KEY_DATA);
        dom.inputHint.textContent = '准备就绪';
    }
    init();
})();