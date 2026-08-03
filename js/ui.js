// ui.js - 表格渲染、统计面板、弹窗辅助、单元格提示栏（修复版：无变动，与原始一致）

// ========== 表格渲染 ==========
function renderTablePart(thead, tbody, groups, colOffset, totalCols) {
    var table = thead.closest('table');
    var colgroup = table.querySelector('colgroup');
    if (!colgroup) {
        colgroup = document.createElement('colgroup');
        table.insertBefore(colgroup, table.firstChild);
    }
    colgroup.innerHTML = '';
    // 第一列（行标题）
    var colName = document.createElement('col');
    colName.style.width = 'var(--name-col-width)';
    colgroup.appendChild(colName);
    // 创建数据列时
    for (var i = 0; i < totalCols; i++) {
        var col = document.createElement('col');
        col.className = 'data-col';
        col.style.width = '36px';   // 初始默认值，之后 applyStyle 会覆盖
        colgroup.appendChild(col);
    }

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

    var savedStyle = localStorage.getItem('smarttable_style');
    if (savedStyle) {
        try {
            var s = JSON.parse(savedStyle);
            applyStyle(s.colWidth || 36, s.rowHeight || 24);
        } catch(e) {
            applyStyle(36, 24);
        }
    } else {
        applyStyle(36, 24);
    }

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

// ========== 弹窗辅助 ==========
function openModal(el) {
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeModal(el) {
    el.style.display = 'none';
    document.body.style.overflow = '';
}
function showAlert(msg, title = '提示') {
    dom.alertTitle.textContent = title;
    dom.alertBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</p>`;
    openModal(dom.modalAlert);
}
function closeAlert() { closeModal(dom.modalAlert); }
function showConfirmDialog(msg, onConfirm, onCancel, title = '确认') {
    dom.confirmDialogTitle.textContent = title;
    dom.confirmDialogBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</p>`;
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
function showFullAcquireModal(msg) {
    dom.fullAcquireBody.innerHTML = `<p style="font-size:0.9rem; color:var(--text-primary); line-height:1.5;">${msg}</p>`;
    openModal(dom.modalFullAcquire);
}
function closeFullAcquireModal() { closeModal(dom.modalFullAcquire); }

// ========== 单元格悬停提示栏 ==========
function initCellTooltip() {
    const supportsHover = window.matchMedia('(hover: hover)').matches;
    const defaultText = supportsHover ? '鼠标悬停单元格查看详情' : '点击单元格查看详情';
    dom.cellTooltip.textContent = defaultText;

    let hoverTimeout;

    function showCellDetail(td) {
        const rowIndex = td.dataset.rowindex;
        const colIndex = td.dataset.colindex;
        if (rowIndex === undefined || colIndex === undefined) return;

        const ri = parseInt(rowIndex);
        const ci = parseInt(colIndex);
        const cell = normalizeCell(state.rows[ri].data[ci]);
        const names = getCellNames(ri, ci);
        const v = cell.v;
        const t = cell.t || 0;
        const a = cell.a || 0;

        let displayText = '';

        if (t > 0) {
            let status = a < t ? `未全部获取，目前应差 ${t - a} 个` : '已全部获取';
            displayText = `${names.subName} || ${names.rowName} || ${names.groupName} || 已实装基质： 拥有 ${a}/重复 ${t} || ${status}`;
        } else {
            if (v && v.length === 3) {
                displayText = `${names.subName}-${v[0]} || ${names.rowName}-${v[1]} || ${names.groupName}-${v[2]} || 状态：当前为非实装基质`;
            } else if (v !== '') {
                displayText = `${v} || 状态：当前为非实装基质`;
            } else {
                displayText = '无';
            }
        }
        dom.cellTooltip.textContent = displayText;
        clearTimeout(hoverTimeout);
    }

    function resetTooltip() {
        hoverTimeout = setTimeout(() => {
            dom.cellTooltip.textContent = defaultText;
        }, 200);
    }

    dom.tableArea.addEventListener('mouseover', function(e) {
        const td = e.target.closest('td');
        if (!td) return;
        showCellDetail(td);
    });

    dom.tableArea.addEventListener('mouseout', function(e) {
        const td = e.target.closest('td');
        if (!td) return;
        resetTooltip();
    });

    dom.tableArea.addEventListener('click', function(e) {
        const td = e.target.closest('td');
        if (td) {
            showCellDetail(td);
        } else {
            clearTimeout(hoverTimeout);
            dom.cellTooltip.textContent = defaultText;
        }
    });
}