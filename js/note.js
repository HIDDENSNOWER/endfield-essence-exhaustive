/**
 * note.js - 单元格备注功能
 * 包含：备注数据读写、备注输入面板交互、图片上传、悬浮框显示与拖拽调整
 */

// ========== 状态变量 ==========
let currentNoteCell = null;          // 当前编辑的单元格坐标 {r, c}
let pendingCellNoteText = '';        // 暂存备注文本
let pendingNoteImages = [];          // 暂存备注图片（base64）

let noteShowTimer = null;            // 悬浮框显示定时器
let noteHideTimer = null;            // 悬浮框隐藏定时器
let noteTooltipVisible = false;      // 悬浮框是否可见

let noteDragState = null;            // 拖拽状态
let noteResizeState = null;          // 调整大小状态

// ========== 备注数据操作 ==========
/**
 * 获取指定单元格的备注对象
 * @param {number} rowIdx - 行索引
 * @param {number} colIdx - 列索引
 * @returns {{text: string, images: string[]}}
 */
function getCellNote(rowIdx, colIdx) {
    const cell = normalizeCell(state.rows[rowIdx].data[colIdx]);
    return cell.note || { text: '', images: [] };
}

/**
 * 设置指定单元格的备注对象
 * @param {number} rowIdx
 * @param {number} colIdx
 * @param {{text: string, images: string[]}} note
 */
function setCellNote(rowIdx, colIdx, note) {
    const cell = normalizeCell(state.rows[rowIdx].data[colIdx]);
    cell.note = note;
    state.rows[rowIdx].data[colIdx] = cell;
    saveData();
    renderAllTables();
}

// ========== 备注输入面板 ==========
/**
 * 更新备注显示区/输入框的可见状态
 * @param {string} text - 当前备注文本
 */
function updateCellNoteDisplay(text) {
    const display = dom.cellNoteDisplay;
    const textarea = dom.cellNoteText;
    const charCount = dom.cellNoteCharCount;

    if (!display || !textarea) return;

    if (text && text.length > 0) {
        display.textContent = text;
        display.style.display = 'block';
        textarea.style.display = 'none';
        if (charCount) charCount.textContent = text.length;
    } else {
        display.style.display = 'none';
        textarea.style.display = 'block';
        textarea.value = '';
        if (charCount) charCount.textContent = '0';
    }
}

/**
 * 加载备注到输入面板
 * @param {number} rowIdx
 * @param {number} colIdx
 */
function loadNoteIntoPanel(rowIdx, colIdx) {
    currentNoteCell = { r: rowIdx, c: colIdx };
    const note = getCellNote(rowIdx, colIdx);
    pendingCellNoteText = note.text || '';
    pendingNoteImages = (note.images || []).slice();
    updateCellNoteDisplay(pendingCellNoteText);
    renderNoteImageList();
}

/**
 * 渲染备注图片列表
 */
function renderNoteImageList() {
    if (!dom.noteImageList) return;
    dom.noteImageList.innerHTML = '';
    pendingNoteImages.forEach((imgSrc, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'note-image-thumb';

        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '备注图片';
        wrapper.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'note-image-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            pendingNoteImages.splice(idx, 1);
            renderNoteImageList();
        });
        wrapper.appendChild(removeBtn);

        wrapper.addEventListener('click', function () {
            window.open(imgSrc, '_blank');
        });

        dom.noteImageList.appendChild(wrapper);
    });
}

/**
 * 提交备注文本（退出编辑状态）
 * @returns {string} 提交的文本
 */
function commitCellNoteText() {
    const textarea = dom.cellNoteText;
    let val = textarea.value.trim();
    if (val.length > 550) {
        val = val.substring(0, 550);
        textarea.value = val;
    }
    pendingCellNoteText = val;
    updateCellNoteDisplay(val);
    autoResizeCellNote();
    return val;
}

/**
 * 自动调整备注输入框高度
 */
function autoResizeCellNote() {
    const textarea = dom.cellNoteText;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

/**
 * 保存当前备注
 */
function saveNoteFromPanel() {
    if (!currentNoteCell) {
        showAlert('请先在数据输入面板中选择单元格。', '提示');
        return;
    }
    // 如果正在编辑，先提交文本
    if (dom.cellNoteText.style.display !== 'none') {
        commitCellNoteText();
    }
    const note = { text: pendingCellNoteText, images: pendingNoteImages.slice() };
    setCellNote(currentNoteCell.r, currentNoteCell.c, note);
    dom.inputHint.textContent = '备注已保存';
    updateCellNoteDisplay(pendingCellNoteText);
}

/**
 * 清除当前备注
 */
function clearNoteFromPanel() {
    if (!currentNoteCell) {
        showAlert('请先在数据输入面板中选择单元格。', '提示');
        return;
    }
    pendingCellNoteText = '';
    pendingNoteImages = [];
    updateCellNoteDisplay('');
    renderNoteImageList();
    setCellNote(currentNoteCell.r, currentNoteCell.c, { text: '', images: [] });
    dom.inputHint.textContent = '备注已清除';
}

// ========== 图片上传 ==========
/**
 * 处理图片上传
 * @param {FileList} files
 */
function handleNoteImageUpload(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            pendingNoteImages.push(e.target.result);
            renderNoteImageList();
        };
        reader.readAsDataURL(file);
    });
}

// ========== 悬浮框显示与隐藏 ==========
/**
 * 显示悬浮框
 * @param {number} rowIdx
 * @param {number} colIdx
 * @param {number} x - 鼠标 X 坐标
 * @param {number} y - 鼠标 Y 坐标
 */
function showNoteTooltip(rowIdx, colIdx, x, y) {
    const note = getCellNote(rowIdx, colIdx);
    if (!note.text && (!note.images || note.images.length === 0)) return;

    // 构建内容
    let html = '';
    if (note.text) {
        html += `<div class="note-text">${escapeHtml(note.text)}</div>`;
    }
    if (note.images && note.images.length > 0) {
        html += '<div class="note-image-gallery">';
        note.images.forEach(src => {
            html += `<img src="${src}" alt="备注图片">`;
        });
        html += '</div>';
    }
    dom.noteTooltipBody.innerHTML = html;

    // 应用保存的布局
    const layout = localStorage.getItem('smarttable_note_layout') || 'text-top';
    dom.noteTooltip.className = `note-tooltip layout-${layout}`;

    // 显示并定位
    dom.noteTooltip.style.display = 'flex';
    positionNoteTooltip(x, y);
    noteTooltipVisible = true;
}

/**
 * 定位悬浮框，防止超出视口
 * @param {number} x
 * @param {number} y
 */
function positionNoteTooltip(x, y) {
    const tooltip = dom.noteTooltip;
    const rect = tooltip.getBoundingClientRect();
    const width = rect.width || 260;
    const height = rect.height || 120;

    let left = x + 15;
    let top = y + 15;

    if (left + width > window.innerWidth - 10) left = x - width - 15;
    if (top + height > window.innerHeight - 10) top = y - height - 15;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

/**
 * 隐藏悬浮框
 * @param {boolean} immediate - 是否立即隐藏
 */
function hideNoteTooltip(immediate) {
    if (immediate) {
        dom.noteTooltip.style.display = 'none';
        noteTooltipVisible = false;
        return;
    }
    clearTimeout(noteHideTimer);
    noteHideTimer = setTimeout(() => {
        dom.noteTooltip.style.display = 'none';
        noteTooltipVisible = false;
    }, 1000);
}

/**
 * HTML 转义
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 悬浮框拖拽与调整大小 ==========
/**
 * 初始化悬浮框的拖拽和调整大小事件
 */
function initNoteTooltipInteractions() {
    // 拖拽
    dom.noteTooltipHeader.addEventListener('mousedown', function (e) {
        if (e.target.closest('.note-tooltip-btn')) return;
        const rect = dom.noteTooltip.getBoundingClientRect();
        noteDragState = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (noteDragState) {
            dom.noteTooltip.style.left = (e.clientX - noteDragState.offsetX) + 'px';
            dom.noteTooltip.style.top = (e.clientY - noteDragState.offsetY) + 'px';
        }
        if (noteResizeState) {
            const startX = noteResizeState.startX;
            const startY = noteResizeState.startY;
            const startW = noteResizeState.startW;
            const startH = noteResizeState.startH;
            const newW = Math.max(200, Math.min(500, startW + (e.clientX - startX)));
            const newH = Math.max(100, Math.min(500, startH + (e.clientY - startY)));
            dom.noteTooltip.style.width = newW + 'px';
            dom.noteTooltip.style.height = newH + 'px';
        }
    });

    document.addEventListener('mouseup', function () {
        noteDragState = null;
        noteResizeState = null;
        // 保存悬浮框位置和大小
        try {
            localStorage.setItem('smarttable_note_tooltip_pos', JSON.stringify({
                left: dom.noteTooltip.style.left,
                top: dom.noteTooltip.style.top,
                width: dom.noteTooltip.style.width,
                height: dom.noteTooltip.style.height
            }));
        } catch (e) {
            // 忽略存储错误
        }
    });

    // 调整大小
    dom.noteTooltipResizer.addEventListener('mousedown', function (e) {
        const rect = dom.noteTooltip.getBoundingClientRect();
        noteResizeState = {
            startX: e.clientX,
            startY: e.clientY,
            startW: rect.width,
            startH: rect.height
        };
        e.preventDefault();
    });

    // 关闭按钮
    dom.btnNoteTooltipClose.addEventListener('click', function () {
        hideNoteTooltip(true);
    });

    // 切换布局
    dom.btnNoteTooltipLayout.addEventListener('click', function () {
        const layouts = ['text-top', 'image-top', 'horizontal'];
        const current = localStorage.getItem('smarttable_note_layout') || 'text-top';
        const idx = layouts.indexOf(current);
        const next = layouts[(idx + 1) % layouts.length];
        localStorage.setItem('smarttable_note_layout', next);
        dom.noteTooltip.className = `note-tooltip layout-${next}`;
    });
}

// ========== 单元格悬停事件 ==========
/**
 * 初始化单元格悬停事件
 */
function initNoteHoverEvents() {
    dom.tableArea.addEventListener('mouseover', function (e) {
        const td = e.target.closest('td');
        if (!td || !td.dataset.rowindex || !td.dataset.colindex) return;

        const rowIdx = parseInt(td.dataset.rowindex);
        const colIdx = parseInt(td.dataset.colindex);
        const note = getCellNote(rowIdx, colIdx);
        if (!note.text && (!note.images || note.images.length === 0)) return;

        clearTimeout(noteShowTimer);
        clearTimeout(noteHideTimer);
        noteShowTimer = setTimeout(() => {
            showNoteTooltip(rowIdx, colIdx, e.clientX, e.clientY);
        }, 1500);
    });

    dom.tableArea.addEventListener('mouseout', function (e) {
        const td = e.target.closest('td');
        if (!td) return;
        clearTimeout(noteShowTimer);
        hideNoteTooltip(false);
    });

    // 悬浮框自身不触发隐藏
    dom.noteTooltip.addEventListener('mouseenter', function () {
        clearTimeout(noteHideTimer);
    });
    dom.noteTooltip.addEventListener('mouseleave', function () {
        hideNoteTooltip(false);
    });
}

// ========== 初始化 ==========
/**
 * 初始化备注功能（绑定事件、恢复状态）
 */
function initNoteFeature() {
    initNoteHoverEvents();
    initNoteTooltipInteractions();

    // 图片上传按钮
    if (dom.btnAddNoteImage) {
        dom.btnAddNoteImage.addEventListener('click', function () {
            dom.noteImageInput.click();
        });
    }
    if (dom.noteImageInput) {
        dom.noteImageInput.addEventListener('change', function (e) {
            handleNoteImageUpload(e.target.files);
            e.target.value = '';
        });
    }
    if (dom.btnClearNoteImages) {
        dom.btnClearNoteImages.addEventListener('click', function () {
            pendingNoteImages = [];
            renderNoteImageList();
        });
    }
    if (dom.btnSaveNote) dom.btnSaveNote.addEventListener('click', saveNoteFromPanel);
    if (dom.btnClearNote) dom.btnClearNote.addEventListener('click', clearNoteFromPanel);

    // 恢复上次悬浮框位置和大小
    try {
        const saved = JSON.parse(localStorage.getItem('smarttable_note_tooltip_pos') || '{}');
        if (saved.left) dom.noteTooltip.style.left = saved.left;
        if (saved.top) dom.noteTooltip.style.top = saved.top;
        if (saved.width) dom.noteTooltip.style.width = saved.width;
        if (saved.height) dom.noteTooltip.style.height = saved.height;
    } catch (e) {
        // 忽略解析错误
    }

    // 点击显示区进入编辑
    if (dom.cellNoteDisplay) {
        dom.cellNoteDisplay.addEventListener('click', function () {
            this.style.display = 'none';
            const textarea = dom.cellNoteText;
            textarea.value = pendingCellNoteText || '';
            textarea.style.display = 'block';
            textarea.focus();
            autoResizeCellNote();
        });
    }

    // 备注文本输入框事件
    if (dom.cellNoteText) {
        dom.cellNoteText.addEventListener('input', function () {
            if (dom.cellNoteCharCount) {
                dom.cellNoteCharCount.textContent = this.value.length;
            }
            autoResizeCellNote();
        });
        dom.cellNoteText.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitCellNoteText();
            }
        });
        dom.cellNoteText.addEventListener('blur', function () {
            commitCellNoteText();
        });
    }
}