/**
 * note.js - 单元格备注功能
 * 包含：备注数据读写、备注输入面板交互、图片上传、悬浮框显示与拖拽调整、悬停查看大图
 */

// ========== 状态变量 ==========
let currentNoteCell = null;          // 当前编辑的单元格坐标 {r, c}
let pendingCellNoteText = '';        // 暂存备注文本
let pendingNoteImages = [];          // 暂存备注图片（base64）

let noteShowTimer = null;            // 悬浮框显示定时器
let noteHideTimer = null;            // 悬浮框/大图框隐藏定时器
let noteTooltipVisible = false;      // 悬浮框是否可见

let noteDragState = null;            // 拖拽状态
let noteResizeState = null;          // 调整大小状态

// 图片查看器相关
let imageViewerModal = null;
let imageViewerImage = null;
let btnCloseImageViewer = null;
let currentImageNaturalSize = { width: 0, height: 0 };
let currentImageScale = 1;

// 新增：鼠标是否悬停在悬浮框或大图框上（用于联动隐藏）
let noteTooltipHover = false;
let imageViewerHover = false;

// ========== 备注数据操作 ==========
function getCellNote(rowIdx, colIdx) {
    const cell = normalizeCell(state.rows[rowIdx].data[colIdx]);
    return cell.note || { text: '', images: [] };
}

function setCellNote(rowIdx, colIdx, note) {
    const cell = normalizeCell(state.rows[rowIdx].data[colIdx]);
    cell.note = note;
    state.rows[rowIdx].data[colIdx] = cell;
    saveData();
    renderAllTables();
}

// ========== 备注输入面板 ==========
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

function loadNoteIntoPanel(rowIdx, colIdx) {
    currentNoteCell = { r: rowIdx, c: colIdx };
    const note = getCellNote(rowIdx, colIdx);
    pendingCellNoteText = note.text || '';
    pendingNoteImages = (note.images || []).slice();
    updateCellNoteDisplay(pendingCellNoteText);
    renderNoteImageList();
}

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

function autoResizeCellNote() {
    const textarea = dom.cellNoteText;
    textarea.style.height = 'auto';
    const minHeight = 60;
    textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
}

function saveNoteFromPanel() {
    if (!currentNoteCell) {
        showAlert('请先在数据输入面板中选择单元格。', '提示');
        return;
    }
    if (dom.cellNoteText.style.display !== 'none') {
        commitCellNoteText();
    }
    const note = { text: pendingCellNoteText, images: pendingNoteImages.slice() };
    setCellNote(currentNoteCell.r, currentNoteCell.c, note);
    dom.inputHint.textContent = '备注已保存';
    updateCellNoteDisplay(pendingCellNoteText);
}

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

// ========== 大图查看（悬停显示，联动悬浮框） ==========
function showImageViewer(src) {
    if (!imageViewerModal || !imageViewerImage) return;

    // 先显示框，再测量尺寸
    imageViewerModal.style.display = 'block';

    const tempImg = new Image();
    tempImg.onload = function () {
        currentImageNaturalSize = {
            width: tempImg.naturalWidth,
            height: tempImg.naturalHeight
        };

        // 初始缩放：确保框体不超出视口
        const margin = 20;
        const paddingAndBorder = 12;
        const maxWidth = window.innerWidth - margin * 2 - paddingAndBorder;
        const maxHeight = window.innerHeight - margin * 2 - paddingAndBorder;
        const scaleX = maxWidth / currentImageNaturalSize.width;
        const scaleY = maxHeight / currentImageNaturalSize.height;
        currentImageScale = Math.min(scaleX, scaleY, 1);

        imageViewerImage.src = src;
        applyImageScale();

        requestAnimationFrame(function () {
            positionImageViewer();
        });
    };

    tempImg.onerror = function () {
        hideImageViewer();
        showAlert('图片加载失败', '错误');
    };

    tempImg.src = src;
}

function applyImageScale() {
    const displayWidth = currentImageNaturalSize.width * currentImageScale;
    const displayHeight = currentImageNaturalSize.height * currentImageScale;

    imageViewerImage.style.width = displayWidth + 'px';
    imageViewerImage.style.height = displayHeight + 'px';

    const paddingX = 5;
    const paddingY = 5;
    const borderWidth = 1;
    imageViewerModal.style.width = (displayWidth + (paddingX + borderWidth) * 2) + 'px';
    imageViewerModal.style.height = (displayHeight + (paddingY + borderWidth) * 2) + 'px';
}

function positionImageViewer() {
    const tooltipRect = dom.noteTooltip.getBoundingClientRect();
    const viewerRect = imageViewerModal.getBoundingClientRect();
    const viewerWidth = viewerRect.width;
    const viewerHeight = viewerRect.height;
    const margin = 20;

    // 水平：选择左右空间更充足的一侧
    const leftSpace = tooltipRect.left - margin;
    const rightSpace = window.innerWidth - tooltipRect.right - margin;
    let left = rightSpace >= leftSpace
        ? tooltipRect.right + margin
        : tooltipRect.left - viewerWidth - margin;

    // 垂直：与悬浮框顶部对齐，边界保护
    let top = tooltipRect.top;
    if (top + viewerHeight > window.innerHeight - margin) {
        top = window.innerHeight - viewerHeight - margin;
    }
    if (top < margin) top = margin;

    left = Math.max(margin, Math.min(left, window.innerWidth - viewerWidth - margin));

    imageViewerModal.style.left = left + 'px';
    imageViewerModal.style.top = top + 'px';
}

function hideImageViewer() {
    if (imageViewerModal) imageViewerModal.style.display = 'none';
    currentImageScale = 1;
    currentImageNaturalSize = { width: 0, height: 0 };
    imageViewerHover = false;
}

// ========== 悬浮框显示与隐藏 ==========
function showNoteTooltip(rowIdx, colIdx, x, y) {
    const note = getCellNote(rowIdx, colIdx);
    if (!note.text && (!note.images || note.images.length === 0)) return;

    let html = '';
    if (note.text) {
        html += `<div class="note-text">${escapeHtml(note.text)}</div>`;
    }
    if (note.images && note.images.length > 0) {
        html += '<div class="note-image-gallery">';
        note.images.forEach(src => {
            html += `<img src="${src}" alt="备注图片" class="note-tooltip-image">`;
        });
        html += '</div>';
    }
    dom.noteTooltipBody.innerHTML = html;

    const layout = localStorage.getItem('smarttable_note_layout') || 'text-top';
    dom.noteTooltip.className = `note-tooltip layout-${layout}`;

    dom.noteTooltip.style.display = 'flex';
    positionNoteTooltip(x, y);
    noteTooltipVisible = true;
}

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
 * 隐藏备注悬浮框（同时隐藏大图框）
 */
function hideNoteTooltip(immediate) {
    if (immediate) {
        dom.noteTooltip.style.display = 'none';
        hideImageViewer();
        noteTooltipVisible = false;
        return;
    }
    clearTimeout(noteHideTimer);
    noteHideTimer = setTimeout(() => {
        // 如果鼠标仍在悬浮框或大图框上，则不隐藏
        if (noteTooltipHover || imageViewerHover) return;
        dom.noteTooltip.style.display = 'none';
        hideImageViewer();
        noteTooltipVisible = false;
    }, 1000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 悬浮框拖拽与调整大小 ==========
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
        try {
            localStorage.setItem('smarttable_note_tooltip_pos', JSON.stringify({
                left: dom.noteTooltip.style.left,
                top: dom.noteTooltip.style.top,
                width: dom.noteTooltip.style.width,
                height: dom.noteTooltip.style.height
            }));
        } catch (e) {}
    });

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

    dom.btnNoteTooltipClose.addEventListener('click', function () {
        hideNoteTooltip(true);
    });

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

    // 悬浮框自身 hover 管理
    dom.noteTooltip.addEventListener('mouseenter', function () {
        noteTooltipHover = true;
        clearTimeout(noteHideTimer);
    });
    dom.noteTooltip.addEventListener('mouseleave', function () {
        noteTooltipHover = false;
        hideNoteTooltip(false);
    });

    // 大图框 hover 管理
    imageViewerModal.addEventListener('mouseenter', function () {
        imageViewerHover = true;
        clearTimeout(noteHideTimer);
    });
    imageViewerModal.addEventListener('mouseleave', function () {
        imageViewerHover = false;
        hideNoteTooltip(false);
    });

    // 悬浮框内图片悬停放大
    dom.noteTooltip.addEventListener('mouseover', function (e) {
        const img = e.target.closest('.note-tooltip-image');
        if (img) {
            showImageViewer(img.src);
        }
    });
}

// ========== 初始化 ==========
function initNoteFeature() {
    imageViewerModal = document.getElementById('imageViewerModal');
    imageViewerImage = document.getElementById('imageViewerImage');
    btnCloseImageViewer = document.getElementById('btnCloseImageViewer');

    initNoteHoverEvents();
    initNoteTooltipInteractions();

    if (btnCloseImageViewer) {
        btnCloseImageViewer.addEventListener('click', hideImageViewer);
    }

    if (imageViewerModal) {
        imageViewerModal.addEventListener('wheel', function (e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            currentImageScale = Math.max(0.1, Math.min(5, currentImageScale + delta));
            applyImageScale();
            positionImageViewer();
        }, { passive: false });
    }

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

    try {
        const saved = JSON.parse(localStorage.getItem('smarttable_note_tooltip_pos') || '{}');
        if (saved.left) dom.noteTooltip.style.left = saved.left;
        if (saved.top) dom.noteTooltip.style.top = saved.top;
        if (saved.width) dom.noteTooltip.style.width = saved.width;
        if (saved.height) dom.noteTooltip.style.height = saved.height;
    } catch (e) {}

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