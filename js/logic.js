/**
 * logic.js - 数据管理应用、录入面板、撤回/重做、数据集管理、清空/删除确认
 * 包含：数值应用与对比、录入与撤减、历史记录、数据集 CRUD、导入导出（ZIP/JSON）、搜索过滤、示例数据
 */

// ========== 数据管理面板应用 ==========
/**
 * 应用数据输入面板中的数值
 */
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
    const oldVal = cell.v;
    const newVal = combined;
    const groupName = ALL_GROUPS[groupIdx].name;
    const rowName = ROW_NAMES[rowIdx];
    const subName = ALL_GROUPS[groupIdx].sub[subIdx];

    // 如果已有实装基质，则增加获取数
    if (cell.t > 0) {
        if (cell.a >= cell.t) {
            showFullAcquireModal(`当前重复词条组合（${rowName} - ${groupName} - ${subName}）已全部获取，请停止录入。`);
            return;
        }
        const newCell = { v: cell.v, t: cell.t, a: cell.a + 1 };
        if (!isCellOperationAllowed(rowIdx, colIndex, newCell)) {
            showAlert('默认数据集保护：该操作会导致获取数低于基准。', '操作限制');
            return;
        }
        cell.a += 1;
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        dom.inputHint.textContent = `已获取: ${rowName} > ${groupName} > ${subName} (拥有${cell.a}/${cell.t})`;
        resetTripleInputs();
        return;
    }

    // 普通数值处理
    if (oldVal !== '' && parseTriple(oldVal) && parseTriple(newVal)) {
        const tempNewCell = { v: String(newVal), t: cell.t, a: cell.a };
        if (!isCellOperationAllowed(rowIdx, colIndex, tempNewCell)) {
            showAlert('默认数据集保护：不能将原有数值更改为低于基准的值。', '操作限制');
            return;
        }
        showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName);
    } else {
        const newCell = { v: String(newVal), t: cell.t, a: cell.a };
        if (!isCellOperationAllowed(rowIdx, colIndex, newCell)) {
            showAlert('默认数据集保护：不能覆盖或清除已有数值。', '操作限制');
            return;
        }
        cell.v = String(newVal);
        state.rows[rowIdx].data[colIndex] = cell;
        renderAllTables(); saveData();
        dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
        resetTripleInputs();
    }
}

// ========== 数值对比 ==========
/**
 * 比较新旧值，给出建议
 * @param {number[]} oldT - 旧值数字数组
 * @param {number[]} newT - 新值数字数组
 * @returns {{keepOld: boolean, reason: string}}
 */
function getSuggestion(oldT, newT) {
    const oldSum = calcSum(oldT), newSum = calcSum(newT);
    if (oldSum !== newSum) {
        return { keepOld: oldSum > newSum, reason: `总和 ${oldSum > newSum ? '旧值更大' : '新值更大'}（旧${oldSum} vs 新${newSum}）` };
    }
    if (oldT[2] !== newT[2]) {
        return { keepOld: oldT[2] > newT[2], reason: `总和相同，第三位 ${oldT[2] > newT[2] ? '旧值更大' : '新值更大'}（旧${oldT[2]} vs 新${newT[2]}）` };
    }
    const oldMax = Math.max(oldT[0], oldT[1]), newMax = Math.max(newT[0], newT[1]);
    if (oldMax !== newMax) {
        return { keepOld: oldMax > newMax, reason: `总和及第三位相同，前两位最大值 ${oldMax > newMax ? '旧值更大' : '新值更大'}（旧${oldMax} vs 新${newMax}）` };
    }
    return { keepOld: true, reason: '各项完全相同，建议保留原值' };
}

/**
 * 显示数值对比弹窗
 */
function showCompareModal(rowIdx, colIndex, oldVal, newVal, groupName, rowName, subName) {
    const oldT = parseTriple(oldVal), newT = parseTriple(newVal);
    if (!oldT || !newT) {
        applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName);
        return;
    }

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

/**
 * 关闭数值对比弹窗
 */
function closeCompareModal() {
    closeModal(dom.modalCompare);
    pendingApply = null;
}

/**
 * 直接应用新值（无需对比）
 */
function applyNewValue(rowIdx, colIndex, newVal, groupName, rowName, subName) {
    const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
    const newCell = { v: String(newVal), t: cell.t, a: cell.a };
    if (!isCellOperationAllowed(rowIdx, colIndex, newCell)) {
        showAlert('默认数据集保护：不能替换为低于基准的数据。', '操作限制');
        return;
    }
    cell.v = String(newVal);
    state.rows[rowIdx].data[colIndex] = cell;
    renderAllTables(); saveData();
    dom.inputHint.textContent = `已更新: ${rowName} > ${groupName} > ${subName} = ${newVal}`;
    resetTripleInputs();
}

/**
 * 显示二次确认弹窗
 * @param {string} message
 * @param {string} reason
 * @param {Function} onConfirm
 */
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

/**
 * 关闭二次确认弹窗
 */
function closeConfirmModal() {
    closeModal(dom.modalConfirm);
    confirmCallback = null;
}

/**
 * 执行二次确认的回调
 */
function executeConfirmedAction() {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
}

/**
 * 用户选择保留旧值
 */
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

/**
 * 用户选择替换为新值
 */
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
/**
 * 录入实装基质
 */
function applyRecord() {
    const subIdx = parseInt(dom.recordSubCol.value);
    const rowIdx = parseInt(dom.recordRow.value);
    const groupIdx = parseInt(dom.recordGroup.value);
    if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

    const colIndex = getColumnIndex(groupIdx, subIdx);
    const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
    const oldCell = JSON.parse(JSON.stringify(cell));

    let newCell;
    if (cell.t === 0) {
        if (cell.v !== '') {
            newCell = { v: '', t: 1, a: 1 };
        } else {
            newCell = { v: '', t: 1, a: 0 };
        }
    } else {
        newCell = { v: cell.v, t: cell.t + 1, a: cell.a };
    }

    if (!isCellOperationAllowed(rowIdx, colIndex, newCell)) {
        showAlert('默认数据集保护：该录入会导致数据低于基准状态。', '操作限制');
        return;
    }

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

// ========== 撤减实装基质 ==========
/**
 * 撤减一个实装基质（减少重复数）
 */
function decrementRecord() {
    const subIdx = parseInt(dom.recordSubCol.value);
    const rowIdx = parseInt(dom.recordRow.value);
    const groupIdx = parseInt(dom.recordGroup.value);
    if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

    const colIndex = getColumnIndex(groupIdx, subIdx);
    const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);

    if (cell.t === 0) {
        showAlert('当前单元格无实装基质记录，无法撤减。', '提示');
        return;
    }

    const oldCell = JSON.parse(JSON.stringify(cell));
    const newT = cell.t - 1;
    const newA = Math.min(cell.a, newT);
    const newV = (newT === 0) ? '' : cell.v;
    const newCell = { v: newV, t: newT, a: newA };

    if (!isCellOperationAllowed(rowIdx, colIndex, newCell)) {
        showAlert('默认数据集保护：撤减后将低于基准数据，操作被阻止。', '操作限制');
        return;
    }

    cell.t = newT;
    cell.a = newA;
    cell.v = newV;
    state.rows[rowIdx].data[colIndex] = cell;
    renderAllTables(); saveData();
    pushHistory(rowIdx, colIndex, oldCell, JSON.parse(JSON.stringify(cell)));

    const groupName = ALL_GROUPS[groupIdx].name;
    const rowName = ROW_NAMES[rowIdx];
    const subName = ALL_GROUPS[groupIdx].sub[subIdx];
    dom.recordHint.textContent = `已撤减：${rowName} > ${groupName} > ${subName} (重复${oldCell.t} → ${cell.t}, 拥有${oldCell.a} → ${cell.a})`;
    updateUndoRedoButtons();
}

// ========== 撤回/重做 ==========
/**
 * 将操作记录推入历史
 * @param {number} rowIdx
 * @param {number} colIndex
 * @param {Object} oldCell
 * @param {Object} newCell
 */
function pushHistory(rowIdx, colIndex, oldCell, newCell) {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push({
        rowIdx,
        colIndex,
        oldCell: JSON.parse(JSON.stringify(oldCell)),
        newCell: JSON.parse(JSON.stringify(newCell))
    });
    if (state.history.length > 20) {
        state.history.shift();
    } else {
        state.historyIndex++;
    }
    updateUndoRedoButtons();
}

/**
 * 撤回上一步操作
 */
function undo() {
    if (state.historyIndex < 0) return;
    const record = state.history[state.historyIndex];
    if (!isCellOperationAllowed(record.rowIdx, record.colIndex, record.oldCell)) {
        showAlert('该撤回操作会导致数据低于基准状态，已阻止。', '撤回限制');
        return;
    }
    state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.oldCell));
    state.historyIndex--;
    renderAllTables(); saveData();
    updateUndoRedoButtons();

    const names = getCellNames(record.rowIdx, record.colIndex);
    const oldT = record.oldCell.t, oldA = record.oldCell.a;
    const newT = record.newCell.t, newA = record.newCell.a;
    showAlert(`已撤回：${names.rowName} > ${names.groupName} > ${names.subName} (重复${newT} → ${oldT}, 拥有${newA} → ${oldA})`, '撤回成功');
}

/**
 * 重做下一步操作
 */
function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    const record = state.history[state.historyIndex];
    if (!isCellOperationAllowed(record.rowIdx, record.colIndex, record.newCell)) {
        showAlert('该重做操作会导致数据低于基准状态，已阻止。', '重做限制');
        state.historyIndex--;
        return;
    }
    state.rows[record.rowIdx].data[record.colIndex] = JSON.parse(JSON.stringify(record.newCell));
    renderAllTables(); saveData();
    updateUndoRedoButtons();

    const names = getCellNames(record.rowIdx, record.colIndex);
    const oldT = record.oldCell.t, oldA = record.oldCell.a;
    const newT = record.newCell.t, newA = record.newCell.a;
    showAlert(`已重做：${names.rowName} > ${names.groupName} > ${names.subName} (重复${oldT} → ${newT}, 拥有${oldA} → ${newA})`, '重做成功');
}

/**
 * 更新撤回/重做按钮禁用状态
 */
function updateUndoRedoButtons() {
    dom.btnUndo.disabled = state.historyIndex < 0;
    dom.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
}

// ========== 清除单元格 ==========
/**
 * 清除录入面板当前单元格的实装基质属性
 */
function clearCellRecord() {
    const subIdx = parseInt(dom.recordSubCol.value);
    const rowIdx = parseInt(dom.recordRow.value);
    const groupIdx = parseInt(dom.recordGroup.value);
    if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

    const colIndex = getColumnIndex(groupIdx, subIdx);
    const emptyCell = defaultCellMeta();
    if (!isCellOperationAllowed(rowIdx, colIndex, emptyCell)) {
        showAlert('默认数据集保护：不能清除已有数据。', '操作限制');
        return;
    }

    const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);
    const oldCell = JSON.parse(JSON.stringify(cell));
    state.rows[rowIdx].data[colIndex] = emptyCell;
    renderAllTables(); saveData();

    const groupName = ALL_GROUPS[groupIdx].name;
    const rowName = ROW_NAMES[rowIdx];
    const subName = ALL_GROUPS[groupIdx].sub[subIdx];
    showAlert(`已清除：${rowName} > ${groupName} > ${subName} 的全部属性`, '清除成功');
    dom.recordHint.textContent = '已清除所选单元格属性';
}

/**
 * 清除数据输入面板当前单元格的数值
 */
function clearCurrentCell() {
    const subIdx = parseInt(dom.inputSubCol.value);
    const rowIdx = parseInt(dom.inputRow.value);
    const groupIdx = parseInt(dom.inputGroup.value);
    if (isNaN(rowIdx) || isNaN(groupIdx) || isNaN(subIdx)) return;

    const colIndex = getColumnIndex(groupIdx, subIdx);
    const cell = normalizeCell(state.rows[rowIdx].data[colIndex]);

    if (cell.t > 0 && cell.v === '') {
        clearCellRecord();
        return;
    }

    const emptyCell = { v: '', t: 0, a: 0 };
    if (!isCellOperationAllowed(rowIdx, colIndex, emptyCell)) {
        showAlert('默认数据集保护：不能清除已有数值。', '操作限制');
        return;
    }
    if (cell.v === '' && cell.t === 0) {
        showAlert('当前单元格无数值，无需清除。', '提示');
        return;
    }

    cell.v = '';
    cell.t = 0;
    cell.a = 0;
    state.rows[rowIdx].data[colIndex] = cell;
    renderAllTables(); saveData();

    const groupName = ALL_GROUPS[groupIdx].name;
    const rowName = ROW_NAMES[rowIdx];
    const subName = ALL_GROUPS[groupIdx].sub[subIdx];
    showAlert(`已清除单元格：${rowName} > ${groupName} > ${subName} 的数值。`, '清除成功');
    dom.inputHint.textContent = '当前单元格数值已清除';
}

// ========== 数据集管理 ==========
/**
 * 获取数据集列表
 * @returns {string[]}
 */
function getDatasetList() {
    try {
        return JSON.parse(localStorage.getItem(DATASET_LIST_KEY)) || [];
    } catch (e) {
        return [];
    }
}

/**
 * 保存数据集列表
 * @param {string[]} list
 */
function saveDatasetList(list) {
    localStorage.setItem(DATASET_LIST_KEY, JSON.stringify(list));
}

/**
 * 添加数据集键到列表
 * @param {string} key
 */
function addDatasetKey(key) {
    const list = getDatasetList();
    if (!list.includes(key)) {
        list.push(key);
        saveDatasetList(list);
    }
}

/**
 * 从列表移除数据集键
 * @param {string} key
 */
function removeDatasetKey(key) {
    const list = getDatasetList().filter(k => k !== key);
    saveDatasetList(list);
}

/**
 * 更新数据集选择下拉框
 */
function updateDatasetSelect() {
    const list = getDatasetList();
    if (!list.includes(STORAGE_KEY_DATA)) addDatasetKey(STORAGE_KEY_DATA);

    dom.datasetSelect.innerHTML = list.map(k => {
        const label = PROTECTED_DATASETS.includes(k) ? k + ' 🔒' : k;
        return `<option value="${k}" ${k === STORAGE_KEY_DATA ? 'selected' : ''}>${label}</option>`;
    }).join('');

    if (dom.btnDeleteDataset) {
        dom.btnDeleteDataset.disabled = PROTECTED_DATASETS.includes(STORAGE_KEY_DATA);
    }
}

/**
 * 切换数据集
 * @param {string} key
 */
function switchDataset(key) {
    if (key === STORAGE_KEY_DATA) return;

    STORAGE_KEY_DATA = key;
    updateDatasetDisplay();

    const list = getDatasetList();
    if (!list.includes(key)) {
        if (key === SAMPLE_DATASET_KEY) {
            localStorage.setItem(key, JSON.stringify(createSampleRows()));
        } else {
            localStorage.setItem(key, JSON.stringify(createInitialRows()));
        }
        addDatasetKey(key);
    }

    if (!loadData()) {
        state.rows = createInitialRows();
        saveData();
    }

    if (key === SAMPLE_DATASET_KEY) {
        state.rows = createSampleRows();
        renderAllTables();
    }

    if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY && !baselineRows) {
        saveBaseline();
    }

    renderAllTables();
    updateDatasetSelect();
    dom.inputHint.textContent = '已切换到数据集: ' + key;
    localStorage.setItem('smarttable_current_dataset', key);

    if (typeof updateDatasetRemark === 'function') updateDatasetRemark();
    if (typeof updateLockedUI === 'function') updateLockedUI();
}

/**
 * 更新数据集名称显示
 */
function updateDatasetDisplay() {
    dom.datasetName.textContent = STORAGE_KEY_DATA;
}

/**
 * 保存当前数据到 localStorage
 */
function saveData() {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.rows));
    addDatasetKey(STORAGE_KEY_DATA);
    updateDatasetSelect();
}

/**
 * 从 localStorage 加载当前数据集
 * @returns {boolean} 是否成功
 */
function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_DATA);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && Array.isArray(parsed[0].data)) {
                state.rows = parsed.map(row => ({
                    name: row.name,
                    data: row.data.map(normalizeCell)
                }));
                addDatasetKey(STORAGE_KEY_DATA);
                return true;
            }
        }
    } catch (e) {
        // 忽略解析错误
    }
    return false;
}

// ========== 导出功能 ==========
/**
 * 打开导出弹窗
 */
function exportData() {
    const defaultName = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0, 10)}.zip`;
    dom.exportFileName.value = defaultName;
    openModal(dom.modalExport);
    setTimeout(() => dom.exportFileName.focus(), 100);
}

/**
 * 执行导出操作（根据文件扩展名决定 ZIP 或 JSON）
 */
async function doExport() {
    let fileName = dom.exportFileName.value.trim();
    if (!fileName) fileName = `${STORAGE_KEY_DATA}_${new Date().toISOString().slice(0, 10)}`;
    if (fileName.endsWith('.json')) {
        doExportJSON(fileName);
    } else {
        if (!fileName.endsWith('.zip')) fileName += '.zip';
        await doExportZip(fileName);
    }
}

/**
 * 导出为 ZIP 文件（JSON + 图片分离）
 * @param {string} fileName - 下载文件名
 */
async function doExportZip(fileName) {
    // 1. 获取当前数据集备注
    let remark = '';
    if (dom.datasetRemarkDisplay.style.display !== 'none') {
        remark = dom.datasetRemarkDisplay.textContent;
    } else if (dom.datasetRemarkInput.style.display !== 'none') {
        remark = dom.datasetRemarkInput.value.trim();
    }

    // 2. 深拷贝 rows，提取图片
    const rowsCopy = JSON.parse(JSON.stringify(state.rows));
    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    const imageMap = {}; // { base64: fileName }
    let imageCounter = 0;

    rowsCopy.forEach((row, rowIdx) => {
        row.data.forEach((cell, colIdx) => {
            const note = cell.note;
            if (note && note.images && note.images.length > 0) {
                const newImageRefs = [];
                note.images.forEach((base64, imgIdx) => {
                    if (!imageMap[base64]) {
                        const ext = getImageExtension(base64);
                        const imageFileName = `cell_${rowIdx}_${colIdx}_${imgIdx}.${ext}`;
                        imageMap[base64] = imageFileName;
                        const blob = base64ToBlob(base64);
                        imagesFolder.file(imageFileName, blob);
                    }
                    newImageRefs.push(imageMap[base64]);
                });
                note.images = newImageRefs;
            }
        });
    });

    // 3. 构建导出数据对象
    const exportObj = {
        rows: rowsCopy,
        remark: remark,
        version: '2.0',
        exportedAt: new Date().toISOString()
    };

    // 4. 将 JSON 加入 zip
    zip.file('data.json', JSON.stringify(exportObj, null, 2));

    // 5. 生成 zip 并下载
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
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

/**
 * 导出为纯 JSON 文件（备用）
 * @param {string} fileName
 */
function doExportJSON(fileName) {
    let remark = '';
    if (dom.datasetRemarkDisplay.style.display !== 'none') {
        remark = dom.datasetRemarkDisplay.textContent;
    } else if (dom.datasetRemarkInput.style.display !== 'none') {
        remark = dom.datasetRemarkInput.value.trim();
    }

    const exportObj = { rows: state.rows, remark };
    const dataStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.json') ? fileName : fileName + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    closeModal(dom.modalExport);
    dom.inputHint.textContent = `已导出：${fileName}`;
}

/**
 * 将 base64 数据转换为 Blob
 * @param {string} base64 - Data URL 或纯 base64
 * @returns {Blob}
 */
function base64ToBlob(base64) {
    const parts = base64.split(',');
    const contentType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const raw = atob(parts[1] || parts[0]);
    const array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return new Blob([array], { type: contentType });
}

/**
 * 从 base64 Data URL 获取图片扩展名
 * @param {string} base64
 * @returns {string} 扩展名（如 'png'）
 */
function getImageExtension(base64) {
    const match = base64.match(/^data:image\/(\w+);base64,/);
    return match ? match[1] : 'png';
}

// ========== 导入功能 ==========
/**
 * 处理导入文件（支持 ZIP 和 JSON）
 * @param {File} file
 */
function importData(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'zip') {
        importZipData(file);
    } else if (ext === 'json') {
        importJSONData(file);
    } else {
        showAlert('不支持的文件格式，请选择 .zip 或 .json 文件。', '导入失败');
    }
}

/**
 * 导入 ZIP 文件
 * @param {File} file
 */
async function importZipData(file) {
    try {
        const zip = await JSZip.loadAsync(file);

        // 读取 data.json
        const dataFile = zip.file('data.json');
        if (!dataFile) {
            showAlert('ZIP 中未找到 data.json。', '导入失败');
            return;
        }
        const dataText = await dataFile.async('string');
        const parsed = JSON.parse(dataText);

        let rows, remark;
        if (parsed && parsed.rows && Array.isArray(parsed.rows)) {
            rows = parsed.rows;
            remark = parsed.remark || '';
        } else if (Array.isArray(parsed)) {
            rows = parsed;
            remark = '';
        } else {
            showAlert('文件格式不正确。', '导入失败');
            return;
        }

        if (!(rows.length > 0 && rows[0].name && Array.isArray(rows[0].data))) {
            showAlert('文件格式不正确。', '导入失败');
            return;
        }

        // 还原图片
        rows = await restoreImagesFromZip(rows, zip);

        // 确定数据集名称
        const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
        const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');

        proceedImportWithConflict(rows, newKey, remark);

    } catch (err) {
        console.error(err);
        showAlert('解析 ZIP 文件失败，请检查文件内容。', '导入失败');
    }
}

/**
 * 从 ZIP 中还原图片为 Data URL
 * @param {Array} rows
 * @param {JSZip} zip
 * @returns {Promise<Array>}
 */
async function restoreImagesFromZip(rows, zip) {
    const imageFolder = zip.folder('images');
    for (const row of rows) {
        for (const cell of row.data) {
            const note = cell.note;
            if (note && note.images && note.images.length > 0) {
                const restoredImages = [];
                for (const ref of note.images) {
                    if (typeof ref === 'string' && ref.startsWith('data:')) {
                        restoredImages.push(ref);
                    } else if (typeof ref === 'string' && imageFolder) {
                        const imageFile = imageFolder.file(ref);
                        if (imageFile) {
                            const blob = await imageFile.async('blob');
                            const dataUrl = await blobToDataURL(blob);
                            restoredImages.push(dataUrl);
                        }
                    }
                }
                note.images = restoredImages;
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
 * 导入 JSON 文件（原有逻辑）
 * @param {File} file
 */
function importJSONData(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            var rows, remark;
            if (Array.isArray(parsed)) {
                rows = parsed;
                remark = '';
            } else if (parsed && parsed.rows && Array.isArray(parsed.rows)) {
                rows = parsed.rows;
                remark = parsed.remark || '';
            } else {
                showAlert('文件格式不正确。', '导入失败');
                return;
            }

            if (rows.length > 0 && rows[0].name && Array.isArray(rows[0].data)) {
                const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
                proceedImportWithConflict(rows, newKey, remark);
            } else {
                showAlert('文件格式不正确。', '导入失败');
            }
        } catch (err) {
            showAlert('解析文件失败，请检查文件内容。', '导入失败');
        }
    };
    reader.readAsText(file);
}

/**
 * 处理导入时的重名冲突与受保护数据集
 * @param {Array} rows
 * @param {string} newKey
 * @param {string} remark
 */
function proceedImportWithConflict(rows, newKey, remark) {
    const existing = getDatasetList();

    // 如果名称与受保护数据集重名，自动改名
    if (PROTECTED_DATASETS.includes(newKey)) {
        newKey = newKey + '_导入';
    }

    if (existing.includes(newKey)) {
        showImportConflictDialog(rows, newKey, remark);
    } else {
        proceedImport(rows, newKey, remark);
    }
}

/**
 * 显示导入冲突弹窗
 */
function showImportConflictDialog(rows, newKey, remark) {
    const message = `数据集 "${newKey}" 已存在，请选择操作：`;
    dom.confirmDialogTitle.textContent = '导入冲突';
    dom.confirmDialogBody.innerHTML = `
        <p>${message}</p>
        <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="btn btn-danger" id="btnOverwrite">覆盖</button>
            <button class="btn btn-primary" id="btnSaveAs">另存为</button>
            <button class="btn" id="btnCancelImport">取消</button>
        </div>
    `;
    openModal(dom.modalConfirmDialog);

    document.getElementById('btnOverwrite').addEventListener('click', function () {
        closeConfirmDialog();
        proceedImport(rows, newKey, remark);
    });
    document.getElementById('btnSaveAs').addEventListener('click', function () {
        closeConfirmDialog();
        const altKey = newKey + '_' + Date.now();
        proceedImport(rows, altKey, remark);
    });
    document.getElementById('btnCancelImport').addEventListener('click', function () {
        closeConfirmDialog();
    });
}

/**
 * 导入数据并创建新数据集（原 proceedImport）
 * @param {Array} data - 行数据
 * @param {string} newKey - 新数据集键
 * @param {string} remark - 备注
 */
function proceedImport(data, newKey, remark) {
    state.rows = data.map(row => ({ name: row.name, data: row.data.map(normalizeCell) }));
    STORAGE_KEY_DATA = newKey;
    localStorage.setItem(newKey, JSON.stringify(state.rows));
    addDatasetKey(newKey);

    const remarks = getDatasetRemarks();
    if (remark) {
        remarks[newKey] = remark;
    } else {
        delete remarks[newKey];
    }
    saveDatasetRemarks(remarks);

    updateDatasetDisplay();
    updateDatasetSelect();
    renderAllTables();
    dom.inputHint.textContent = `已导入并切换到数据集: ${newKey}`;
    localStorage.setItem('smarttable_current_dataset', newKey);

    if (typeof updateDatasetRemark === 'function') updateDatasetRemark();
    if (typeof updateLockedUI === 'function') updateLockedUI();
}

/**
 * 触发导入文件选择
 */
function triggerImport() {
    dom.importFile.click();
}

// ========== 新建/重命名/删除数据集 ==========
/**
 * 打开新建数据集弹窗
 */
function createNewDataset() {
    dom.newDatasetName.value = '';
    openModal(dom.modalNewDataset);
    setTimeout(() => dom.newDatasetName.focus(), 100);
}

/**
 * 确认新建数据集
 */
function confirmNewDataset() {
    const name = dom.newDatasetName.value.trim();
    if (!name) { showAlert('数据集名称不能为空。'); return; }
    if (getDatasetList().includes(name)) { showAlert('该数据集名称已存在，请使用其他名称。'); return; }

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

/**
 * 打开重命名弹窗
 */
function renameDataset() {
    dom.renameOldName.textContent = STORAGE_KEY_DATA;
    dom.renameDatasetName.value = '';
    openModal(dom.modalRenameDataset);
    setTimeout(() => dom.renameDatasetName.focus(), 100);
}

/**
 * 确认重命名数据集
 */
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
    updateDatasetDisplay();
    updateDatasetSelect();
    closeModal(dom.modalRenameDataset);
    dom.inputHint.textContent = `已重命名为: ${newName}`;
    localStorage.setItem('smarttable_current_dataset', newName);
}

/**
 * 删除数据集流程入口
 */
function deleteDataset() {
    if (PROTECTED_DATASETS.includes(STORAGE_KEY_DATA)) {
        showAlert('系统数据集不可删除。', '操作阻止');
        return;
    }
    const list = getDatasetList();
    if (list.length <= 1) { showAlert('至少需要保留一个数据集。', '无法删除'); return; }
    openDeleteConfirmModal();
}

/**
 * 确认删除数据集
 */
function confirmDeleteDataset() {
    if (PROTECTED_DATASETS.includes(STORAGE_KEY_DATA)) {
        showAlert('系统数据集不可删除。', '操作阻止');
        closeModal(dom.modalDeleteDataset);
        return;
    }

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
    dom.inputHint.textContent = '已删除，切换至: ' + newKey;
    localStorage.setItem('smarttable_current_dataset', newKey);
}

// ========== 清空数据 ==========
/**
 * 清空当前数据集
 */
function clearAllData() {
    if (STORAGE_KEY_DATA === DEFAULT_STORAGE_KEY && baselineRows) {
        for (let r = 0; r < baselineRows.length; r++) {
            for (let c = 0; c < baselineRows[r].data.length; c++) {
                if (baselineRows[r].data[c].v !== '' || baselineRows[r].data[c].t > 0) {
                    showAlert('默认数据集包含初始数据，不能清空。', '操作限制');
                    return;
                }
            }
        }
    }

    state.rows.forEach(row => row.data = createEmptyRowData());
    renderAllTables();
    saveData();
    dom.inputHint.textContent = '当前数据集已清空';
}

/**
 * 重置默认数据集
 */
function resetDefaultDataset() {
    if (STORAGE_KEY_DATA !== DEFAULT_STORAGE_KEY) {
        showAlert('当前不是默认数据集，无需重置。', '提示');
        return;
    }
    if (typeof DEFAULT_ROWS === 'undefined' || !Array.isArray(DEFAULT_ROWS)) {
        showAlert('默认数据模板缺失，无法重置。', '错误');
        return;
    }

    showConfirmDialog(
        '将默认数据集重置为初始数据，所有用户添加或修改的数据都将丢失，确定继续吗？',
        () => {
            state.rows = DEFAULT_ROWS.map(row => ({
                name: row.name,
                data: row.data.map(normalizeCell)
            }));
            saveData();
            renderAllTables();
            saveBaseline();
            updateLockedUI();
            dom.inputHint.textContent = '默认数据集已重置为初始数据。';
        },
        () => {
            dom.inputHint.textContent = '已取消重置。';
        },
        '重置默认数据集'
    );
}

// ========== 清空/删除确认弹窗 ==========
/**
 * 打开清空确认弹窗，启动倒计时
 */
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

/**
 * 检查清空确认按钮是否可点击
 */
function checkClearAllButton() {
    const timeUp = parseInt(dom.clearAllCountdown.textContent) <= 0;
    dom.btnConfirmClearAll.disabled = !timeUp;
}

/**
 * 关闭清空确认弹窗
 */
function closeClearAllModal() {
    if (clearAllTimer) {
        clearInterval(clearAllTimer);
        clearAllTimer = null;
    }
    closeModal(dom.modalClearAll);
}

/**
 * 执行清空操作
 */
function executeClearAll() {
    if (dom.clearAllInput.value.trim() !== '我确认清空') {
        closeClearAllModal();
        openClearErrorModal();
        return;
    }
    closeClearAllModal();
    clearAllData();
}

/**
 * 打开清空错误提示弹窗
 */
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

/**
 * 关闭清空错误提示弹窗
 */
function closeClearErrorModal() {
    if (clearErrorTimer) {
        clearInterval(clearErrorTimer);
        clearErrorTimer = null;
    }
    closeModal(dom.modalClearError);
}

/**
 * 打开删除确认弹窗
 */
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

/**
 * 检查删除确认按钮是否可点击
 */
function checkDeleteConfirmButton() {
    const timeUp = parseInt(dom.deleteConfirmCountdown.textContent) <= 0;
    dom.btnConfirmDeleteAction.disabled = !timeUp;
}

/**
 * 关闭删除确认弹窗
 */
function closeDeleteConfirmModal() {
    if (deleteConfirmTimer) {
        clearInterval(deleteConfirmTimer);
        deleteConfirmTimer = null;
    }
    closeModal(dom.modalDeleteConfirm);
}

/**
 * 执行删除操作
 */
function executeDeleteAction() {
    if (dom.deleteConfirmInput.value.trim() !== '我确认删除') {
        closeDeleteConfirmModal();
        openDeleteErrorModal();
        return;
    }
    closeDeleteConfirmModal();
    confirmDeleteDataset();
}

/**
 * 打开删除错误提示弹窗
 */
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

/**
 * 关闭删除错误提示弹窗
 */
function closeDeleteErrorModal() {
    if (deleteErrorTimer) {
        clearInterval(deleteErrorTimer);
        deleteErrorTimer = null;
    }
    closeModal(dom.modalDeleteError);
}

// ========== 行筛选 ==========
/**
 * 获取当前筛选后的行数据
 * @returns {Array}
 */
function getFilteredRows() {
    const selected = new Set(state.selectedRows);
    return state.rows.filter(row => selected.has(row.name));
}

// ========== 示例数据生成 ==========
/**
 * 生成示例数据（随机填充）
 * @returns {Array}
 */
function createSampleRows() {
    const rows = createInitialRows();
    const rowCount = rows.length;
    const colCount = rows[0].data.length;
    const fillProbability = 0.4;

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
            if (Math.random() < fillProbability) {
                const cell = rows[r].data[c];
                if (Math.random() < 0.5) {
                    const t = Math.floor(Math.random() * 3) + 1;
                    const a = Math.floor(Math.random() * (t + 1));
                    cell.t = t;
                    cell.a = a;
                    cell.v = '';
                } else {
                    const d1 = Math.floor(Math.random() * 6) + 1;
                    const d2 = Math.floor(Math.random() * 6) + 1;
                    const d3 = Math.floor(Math.random() * 3) + 1;
                    cell.v = `${d1}${d2}${d3}`;
                    cell.t = 0;
                    cell.a = 0;
                }
            }
        }
    }
    return rows;
}