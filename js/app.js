(function() {
    const STORAGE_KEY_THEME = 'smarttable_theme';
    const STORAGE_KEY_STYLE = 'smarttable_style';
    const STORAGE_KEY_DATA = 'smarttable_data';

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
        theme: 'light',
        style: { colWidth: 48, rowHeight: 32, hAlign: 'center', vAlign: 'middle' }
    };

    let selectedRowIdx = 0;
    let selectedGroupIdx = 0;
    let selectedSubIdx = 0;

    const dom = {
        tableHead1: document.getElementById('tableHead1'),
        tableBody1: document.getElementById('tableBody1'),
        tableHead2: document.getElementById('tableHead2'),
        tableBody2: document.getElementById('tableBody2'),
        searchInput: document.getElementById('searchInput'),
        btnToggleTheme: document.getElementById('btnToggleTheme'),
        iconSun: document.getElementById('icon-sun'),
        iconMoon: document.getElementById('icon-moon'),
        colWidth: document.getElementById('colWidth'),
        rowHeight: document.getElementById('rowHeight'),
        hAlign: document.getElementById('hAlign'),
        vAlign: document.getElementById('vAlign'),
        btnResetStyle: document.getElementById('btnResetStyle'),
        inputValue: document.getElementById('inputValue'),
        btnApplyValue: document.getElementById('btnApplyValue'),
        inputHint: document.getElementById('inputHint'),
        btnRow: document.getElementById('btnRow'),
        btnGroup: document.getElementById('btnGroup'),
        btnSubCol: document.getElementById('btnSubCol'),
        btnClearAll: document.getElementById('btnClearAll'),
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

    // ========== 样式 ==========
    function applyStyle() {
        const root = document.documentElement;
        root.style.setProperty('--col-width', state.style.colWidth + 'px');
        root.style.setProperty('--row-height', state.style.rowHeight + 'px');
        root.style.setProperty('--cell-h-align', state.style.hAlign);
        root.style.setProperty('--cell-v-align', state.style.vAlign);
        dom.colWidth.value = state.style.colWidth;
        dom.rowHeight.value = state.style.rowHeight;
        dom.hAlign.value = state.style.hAlign;
        dom.vAlign.value = state.style.vAlign;
        localStorage.setItem(STORAGE_KEY_STYLE, JSON.stringify(state.style));
    }
    function loadStyle() {
        const saved = localStorage.getItem(STORAGE_KEY_STYLE);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.colWidth === 'number') state.style = parsed;
        }
        applyStyle();
    }
    function resetStyle() {
        state.style = { colWidth: 48, rowHeight: 32, hAlign: 'center', vAlign: 'middle' };
        applyStyle();
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

    // ========== 选择器按钮 ==========
    function updateButtonLabels() {
        dom.btnRow.textContent = ROW_NAMES[selectedRowIdx];
        dom.btnGroup.textContent = ALL_GROUPS[selectedGroupIdx].name;
        dom.btnSubCol.textContent = ALL_GROUPS[selectedGroupIdx].sub[selectedSubIdx];
    }

    function cycleRow(delta) {
        selectedRowIdx = (selectedRowIdx + (delta > 0 ? 1 : -1) + ROW_NAMES.length) % ROW_NAMES.length;
        updateButtonLabels();
    }

    function cycleGroup(delta) {
        selectedGroupIdx = (selectedGroupIdx + (delta > 0 ? 1 : -1) + ALL_GROUPS.length) % ALL_GROUPS.length;
        selectedSubIdx = 0;
        updateButtonLabels();
    }

    function cycleSubCol(delta) {
        const subs = ALL_GROUPS[selectedGroupIdx].sub;
        selectedSubIdx = (selectedSubIdx + (delta > 0 ? 1 : -1) + subs.length) % subs.length;
        updateButtonLabels();
    }

    function getColumnIndex(groupIdx, subIdx) {
        let col = 0;
        for (let i = 0; i < groupIdx; i++) col += ALL_GROUPS[i].sub.length;
        return col + subIdx;
    }

    function applyValue() {
        const value = dom.inputValue.value;
        const colIndex = getColumnIndex(selectedGroupIdx, selectedSubIdx);
        const newVal = value === '' ? '' : Number(value);
        state.rows[selectedRowIdx].data[colIndex] = newVal;

        renderAllTables();

        const rowName = ROW_NAMES[selectedRowIdx];
        const groupName = ALL_GROUPS[selectedGroupIdx].name;
        const subName = ALL_GROUPS[selectedGroupIdx].sub[selectedSubIdx];
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal === '' ? '空' : newVal}`;

        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.rows));
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        dom.btnToggleTheme.addEventListener('click', toggleTheme);
        dom.searchInput.addEventListener('input', () => {
            state.searchQuery = dom.searchInput.value;
            renderAllTables();
        });

        dom.colWidth.addEventListener('input', () => {
            state.style.colWidth = Math.max(30, Math.min(200, parseInt(dom.colWidth.value) || 48));
            applyStyle();
        });
        dom.rowHeight.addEventListener('input', () => {
            state.style.rowHeight = Math.max(20, Math.min(80, parseInt(dom.rowHeight.value) || 32));
            applyStyle();
        });
        dom.hAlign.addEventListener('change', () => { state.style.hAlign = dom.hAlign.value; applyStyle(); });
        dom.vAlign.addEventListener('change', () => { state.style.vAlign = dom.vAlign.value; applyStyle(); });
        dom.btnResetStyle.addEventListener('click', resetStyle);

        // ★ 仅保留滚轮切换，移除点击事件
        [dom.btnRow, dom.btnGroup, dom.btnSubCol].forEach(btn => {
            btn.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 1 : -1;
                if (btn === dom.btnRow) cycleRow(delta);
                else if (btn === dom.btnGroup) cycleGroup(delta);
                else if (btn === dom.btnSubCol) cycleSubCol(delta);
            }, { passive: false });
        });

        dom.btnApplyValue.addEventListener('click', applyValue);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(STORAGE_KEY_THEME)) applyTheme(e.matches ? 'dark' : 'light');
        });
        dom.btnClearAll.addEventListener('click', () => {
            if (confirm('确定要清空全部数据吗？此操作不可撤销，所有数值将变为空。')) {
                clearAllData();
            }
        });
    }
    // 新增清空函数：
    function clearAllData() {
        state.rows.forEach(row => {
            row.data = createEmptyRowData();
        });
        renderAllTables();
        dom.inputHint.textContent = '已清空全部数据';
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.rows));
    }

    // ========== 初始化 ==========
    function init() {
        loadTheme();
        loadStyle();

        try {
            const saved = localStorage.getItem(STORAGE_KEY_DATA);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) state.rows = parsed;
            }
        } catch (e) {}

        updateButtonLabels();
        bindEvents();
        renderAllTables();
    }

    init();
})();