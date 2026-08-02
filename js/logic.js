// logic.js - 数据管理应用、录入面板、撤回/重做、数据集管理、清空/删除确认

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

// ========== 数值对比 ==========
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
    resetTripleInputs();
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

// ========== 撤回/重做 ==========
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
    showAlert(`已撤回：${names.rowName} > ${names.groupName} > ${names.subName} (重复${newT} → ${oldT}, 拥有${newA} → ${oldA})`, '撤回成功');
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
    showAlert(`已重做：${names.rowName} > ${names.groupName} > ${names.subName} (重复${oldT} → ${newT}, 拥有${oldA} → ${newA})`, '重做成功');
}

function updateUndoRedoButtons() {
    dom.btnUndo.disabled = state.historyIndex < 0;
    dom.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
}

// ========== 清除单元格 ==========
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

// ========== 数据集管理 ==========
function getDatasetList() { try { return JSON.parse(localStorage.getItem(DATASET_LIST_KEY)) || []; } catch(e) { return []; } }
function saveDatasetList(list) { localStorage.setItem(DATASET_LIST_KEY, JSON.stringify(list)); }
function addDatasetKey(key) { const list = getDatasetList(); if (!list.includes(key)) { list.push(key); saveDatasetList(list); } }
function removeDatasetKey(key) { const list = getDatasetList().filter(k => k !== key); saveDatasetList(list); }

function updateDatasetSelect() {
    const list = getDatasetList();
    if (!list.includes(STORAGE_KEY_DATA)) addDatasetKey(STORAGE_KEY_DATA);
    dom.datasetSelect.innerHTML = list.map(function(k) {
        var label = k;
        if (PROTECTED_DATASETS.indexOf(k) !== -1) label += ' 🔒';
        return '<option value="' + k + '"' + (k === STORAGE_KEY_DATA ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
}

function switchDataset(key) {
    if (key === STORAGE_KEY_DATA) return;

    STORAGE_KEY_DATA = key;
    updateDatasetDisplay();

    // 特殊处理：切换到示例数据集时重新生成随机数据
    if (key === '数据示例-表格样式参考') {
        state.rows = createSampleRows();
        saveData();               // 持久化新数据
    } else {
        if (!loadData()) {
            state.rows = createInitialRows();
            saveData();
        }
    }

    renderAllTables();
    updateDatasetSelect();
    dom.inputHint.textContent = '已切换到数据集: ' + key;
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
    if (!fileName) fileName = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0,10)}.json`;
    if (!fileName.endsWith('.json')) fileName += '.json';
    const dataStr = JSON.stringify(state.rows, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeModal(dom.modalExport);
    dom.inputHint.textContent = `已导出：${fileName}`;
}

function proceedImport(data, newKey) {
    state.rows = data.map(row => ({ name: row.name, data: row.data.map(cell => normalizeCell(cell)) }));
    STORAGE_KEY_DATA = newKey;
    localStorage.setItem(newKey, JSON.stringify(state.rows));
    addDatasetKey(newKey);
    updateDatasetDisplay(); updateDatasetSelect();
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
                    showConfirmDialog(`数据集 "${newKey}" 已存在，是否覆盖？`, () => proceedImport(data, newKey), null, '覆盖确认');
                } else {
                    proceedImport(data, newKey);
                }
            } else {
                showAlert('文件格式不正确。', '导入失败');
            }
        } catch(err) { showAlert('解析文件失败，请检查文件内容。', '导入失败'); }
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
    if (!name) { showAlert('数据集名称不能为空。'); return; }
    if (getDatasetList().includes(name)) { showAlert('该数据集名称已存在，请使用其他名称。'); return; }
    const empty = createInitialRows();
    localStorage.setItem(name, JSON.stringify(empty));
    addDatasetKey(name);
    STORAGE_KEY_DATA = name;
    state.rows = JSON.parse(JSON.stringify(empty));
    updateDatasetDisplay(); updateDatasetSelect();
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
    if (!newName) { showAlert('新名称不能为空。'); return; }
    if (newName === STORAGE_KEY_DATA) { closeModal(dom.modalRenameDataset); return; }
    if (getDatasetList().includes(newName)) { showAlert('该名称已存在，请使用其他名称。'); return; }
    const data = localStorage.getItem(STORAGE_KEY_DATA);
    localStorage.setItem(newName, data || '[]');
    removeDatasetKey(STORAGE_KEY_DATA);
    STORAGE_KEY_DATA = newName;
    addDatasetKey(newName);
    saveData();
    updateDatasetDisplay(); updateDatasetSelect();
    closeModal(dom.modalRenameDataset);
    dom.inputHint.textContent = `已重命名为: ${newName}`;
    localStorage.setItem('smarttable_current_dataset', newName);
}

function deleteDataset() {
    // 检查是否为系统数据集
    if (PROTECTED_DATASETS.indexOf(STORAGE_KEY_DATA) !== -1) {
        showAlert('系统数据集不可删除。', '操作阻止');
        return;
    }
    var list = getDatasetList();
    if (list.length <= 1) { showAlert('至少需要保留一个数据集。', '无法删除'); return; }
    openDeleteConfirmModal();
}

function confirmDeleteDataset() {
    // 再次校验保护
    if (PROTECTED_DATASETS.indexOf(STORAGE_KEY_DATA) !== -1) {
        showAlert('系统数据集不可删除。', '操作阻止');
        closeModal(dom.modalDeleteDataset);
        return;
    }
    var currentKey = STORAGE_KEY_DATA;
    localStorage.removeItem(currentKey);
    removeDatasetKey(currentKey);
    var remaining = getDatasetList();
    var newKey = remaining[0] || DEFAULT_STORAGE_KEY;
    STORAGE_KEY_DATA = newKey;
    if (!loadData()) { state.rows = createInitialRows(); saveData(); }
    updateDatasetDisplay(); updateDatasetSelect();
    renderAllTables();
    closeModal(dom.modalDeleteDataset);
    dom.inputHint.textContent = '已删除，切换至: ' + newKey;
    localStorage.setItem('smarttable_current_dataset', newKey);
}

function clearAllData() {
    state.rows.forEach(row => row.data = createEmptyRowData());
    renderAllTables(); saveData();
    dom.inputHint.textContent = '当前数据集已清空';
}

function updateDatasetSelect() {
    var list = getDatasetList();
    if (!list.includes(STORAGE_KEY_DATA)) addDatasetKey(STORAGE_KEY_DATA);
    dom.datasetSelect.innerHTML = list.map(function(k) {
        return '<option value="' + k + '"' + (k === STORAGE_KEY_DATA ? ' selected' : '') + '>' + k + '</option>';
    }).join('');

    // 禁用/启用删除按钮
    if (dom.btnDeleteDataset) {
        dom.btnDeleteDataset.disabled = (PROTECTED_DATASETS.indexOf(STORAGE_KEY_DATA) !== -1);
    }
}

// ========== 清空/删除确认弹窗 ==========
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
    if (clearAllTimer) { clearInterval(clearAllTimer); clearAllTimer = null; }
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
    if (clearErrorTimer) { clearInterval(clearErrorTimer); clearErrorTimer = null; }
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
    if (deleteConfirmTimer) { clearInterval(deleteConfirmTimer); deleteConfirmTimer = null; }
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
    if (deleteErrorTimer) { clearInterval(deleteErrorTimer); deleteErrorTimer = null; }
    closeModal(dom.modalDeleteError);
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

function createSampleRows() {
    var rows = createInitialRows();
    var rowCount = rows.length;
    var colCount = rows[0].data.length;
    var fillProbability = 0.4;
    for (var r = 0; r < rowCount; r++) {
        for (var c = 0; c < colCount; c++) {
            if (Math.random() < fillProbability) {
                var cell = rows[r].data[c];
                if (Math.random() < 0.5) {
                    var t = Math.floor(Math.random() * 3) + 1;
                    var a = Math.floor(Math.random() * (t + 1));
                    cell.t = t;
                    cell.a = a;
                    cell.v = '';
                } else {
                    var d1 = Math.floor(Math.random() * 6) + 1;
                    var d2 = Math.floor(Math.random() * 6) + 1;
                    var d3 = Math.floor(Math.random() * 3) + 1;
                    cell.v = '' + d1 + d2 + d3;
                    cell.t = 0;
                    cell.a = 0;
                }
            }
        }
    }
    return rows;
}