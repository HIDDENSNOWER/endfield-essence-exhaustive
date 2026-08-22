// note.js - 单元格备注功能

// 当前正在编辑的单元格坐标（由选择面板确定）
var pendingCellNoteText = '';
var currentNoteCell = null;


// 悬浮框定时器
var noteShowTimer = null;
var noteHideTimer = null;
var noteTooltipVisible = false;

// 临时图片存储
var pendingNoteImages = [];

// 悬浮框拖拽与调整状态
var noteDragState = null;
var noteResizeState = null;

// ========== 工具函数 ==========
function getCellNote(rowIdx, colIdx) {
    var cell = normalizeCell(state.rows[rowIdx].data[colIdx]);
    return cell.note || { text: '', images: [] };
}

function setCellNote(rowIdx, colIdx, note) {
    var cell = normalizeCell(state.rows[rowIdx].data[colIdx]);
    cell.note = note;
    state.rows[rowIdx].data[colIdx] = cell;
    saveData();
    renderAllTables();
}

function updateCellNoteDisplay(text) {
    var display = dom.cellNoteDisplay;
    var textarea = dom.cellNoteText;
    var charCount = dom.cellNoteCharCount;

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

// ========== 加载备注到输入面板 ==========
function loadNoteIntoPanel(rowIdx, colIdx) {
    currentNoteCell = { r: rowIdx, c: colIdx };
    var note = getCellNote(rowIdx, colIdx);
    pendingCellNoteText = note.text || '';
    pendingNoteImages = (note.images || []).slice();
    updateCellNoteDisplay(pendingCellNoteText);
    renderNoteImageList();
}

function renderNoteImageList() {
    dom.noteImageList.innerHTML = '';
    pendingNoteImages.forEach(function(imgSrc, idx) {
        var wrapper = document.createElement('div');
        wrapper.className = 'note-image-thumb';
        var img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '备注图片';
        wrapper.appendChild(img);
        var removeBtn = document.createElement('button');
        removeBtn.className = 'note-image-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            pendingNoteImages.splice(idx, 1);
            renderNoteImageList();
        });
        wrapper.appendChild(removeBtn);
        wrapper.addEventListener('click', function() {
            window.open(imgSrc, '_blank');
        });
        dom.noteImageList.appendChild(wrapper);
    });
}

function commitCellNoteText() {
    var textarea = dom.cellNoteText;
    var val = textarea.value.trim();
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
    var textarea = dom.cellNoteText;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// ========== 保存/清除备注 ==========
function saveNoteFromPanel() {
    if (!currentNoteCell) {
        showAlert('请先在数据输入面板中选择单元格。', '提示');
        return;
    }
    // 如果当前正处于编辑状态，先提交
    if (dom.cellNoteText.style.display !== 'none') {
        commitCellNoteText();
    }
    var note = { text: pendingCellNoteText, images: pendingNoteImages.slice() };
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
    Array.from(files).forEach(function(file) {
        if (!file.type.startsWith('image/')) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            pendingNoteImages.push(e.target.result);
            renderNoteImageList();
        };
        reader.readAsDataURL(file);
    });
}

// ========== 悬浮框显示与隐藏 ==========
function showNoteTooltip(rowIdx, colIdx, x, y) {
    var note = getCellNote(rowIdx, colIdx);
    if (!note.text && (!note.images || note.images.length === 0)) return;

    // 填充内容
    var html = '';
    if (note.text) {
        html += '<div class="note-text">' + escapeHtml(note.text) + '</div>';
    }
    if (note.images && note.images.length > 0) {
        html += '<div class="note-image-gallery">';
        note.images.forEach(function(src) {
            html += '<img src="' + src + '" alt="备注图片">';
        });
        html += '</div>';
    }
    dom.noteTooltipBody.innerHTML = html;

    // 应用保存的布局
    var layout = localStorage.getItem('smarttable_note_layout') || 'text-top';
    dom.noteTooltip.className = 'note-tooltip layout-' + layout;

    // 定位悬浮框
    dom.noteTooltip.style.display = 'flex';
    positionNoteTooltip(x, y);
    noteTooltipVisible = true;
}

function positionNoteTooltip(x, y) {
    var tooltip = dom.noteTooltip;
    var rect = tooltip.getBoundingClientRect();
    var width = rect.width || 260;
    var height = rect.height || 120;

    // 默认在鼠标右下方
    var left = x + 15;
    var top = y + 15;

    // 防止超出视口
    if (left + width > window.innerWidth - 10) left = x - width - 15;
    if (top + height > window.innerHeight - 10) top = y - height - 15;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideNoteTooltip(immediate) {
    if (immediate) {
        dom.noteTooltip.style.display = 'none';
        noteTooltipVisible = false;
        return;
    }
    clearTimeout(noteHideTimer);
    noteHideTimer = setTimeout(function() {
        dom.noteTooltip.style.display = 'none';
        noteTooltipVisible = false;
    }, 1000);
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 悬浮框拖拽与调整大小 ==========
function initNoteTooltipInteractions() {
    // 拖拽
    dom.noteTooltipHeader.addEventListener('mousedown', function(e) {
        if (e.target.closest('.note-tooltip-btn')) return;
        var rect = dom.noteTooltip.getBoundingClientRect();
        noteDragState = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (noteDragState) {
            dom.noteTooltip.style.left = (e.clientX - noteDragState.offsetX) + 'px';
            dom.noteTooltip.style.top = (e.clientY - noteDragState.offsetY) + 'px';
        }
        if (noteResizeState) {
            var startX = noteResizeState.startX;
            var startY = noteResizeState.startY;
            var startW = noteResizeState.startW;
            var startH = noteResizeState.startH;
            var newW = Math.max(200, Math.min(500, startW + (e.clientX - startX)));
            var newH = Math.max(100, Math.min(500, startH + (e.clientY - startY)));
            dom.noteTooltip.style.width = newW + 'px';
            dom.noteTooltip.style.height = newH + 'px';
        }
    });

    document.addEventListener('mouseup', function() {
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
        } catch(e) {}
    });

    // 调整大小
    dom.noteTooltipResizer.addEventListener('mousedown', function(e) {
        var rect = dom.noteTooltip.getBoundingClientRect();
        noteResizeState = {
            startX: e.clientX,
            startY: e.clientY,
            startW: rect.width,
            startH: rect.height
        };
        e.preventDefault();
    });

    // 关闭按钮
    dom.btnNoteTooltipClose.addEventListener('click', function() {
        hideNoteTooltip(true);
    });

    // 切换布局
    dom.btnNoteTooltipLayout.addEventListener('click', function() {
        var layouts = ['text-top', 'image-top', 'horizontal'];
        var current = localStorage.getItem('smarttable_note_layout') || 'text-top';
        var idx = layouts.indexOf(current);
        var next = layouts[(idx + 1) % layouts.length];
        localStorage.setItem('smarttable_note_layout', next);
        dom.noteTooltip.className = 'note-tooltip layout-' + next;
    });
}

// ========== 绑定单元格悬停事件 ==========
function initNoteHoverEvents() {
    dom.tableArea.addEventListener('mouseover', function(e) {
        var td = e.target.closest('td');
        if (!td || !td.dataset.rowindex || !td.dataset.colindex) return;
        var rowIdx = parseInt(td.dataset.rowindex);
        var colIdx = parseInt(td.dataset.colindex);
        var note = getCellNote(rowIdx, colIdx);
        if (!note.text && (!note.images || note.images.length === 0)) return;

        clearTimeout(noteShowTimer);
        clearTimeout(noteHideTimer);
        noteShowTimer = setTimeout(function() {
            showNoteTooltip(rowIdx, colIdx, e.clientX, e.clientY);
        }, 1500);
    });

    dom.tableArea.addEventListener('mouseout', function(e) {
        var td = e.target.closest('td');
        if (!td) return;
        clearTimeout(noteShowTimer);
        hideNoteTooltip(false);
    });

    // 悬浮框本身不触发隐藏
    dom.noteTooltip.addEventListener('mouseenter', function() {
        clearTimeout(noteHideTimer);
    });
    dom.noteTooltip.addEventListener('mouseleave', function() {
        hideNoteTooltip(false);
    });
}

// ========== 初始化 ==========
function initNoteFeature() {
    initNoteHoverEvents();
    initNoteTooltipInteractions();

    if (dom.btnAddNoteImage) {
        dom.btnAddNoteImage.addEventListener('click', function() {
            dom.noteImageInput.click();
        });
    }
    if (dom.noteImageInput) {
        dom.noteImageInput.addEventListener('change', function(e) {
            handleNoteImageUpload(e.target.files);
            e.target.value = '';
        });
    }
    if (dom.btnClearNoteImages) {
        dom.btnClearNoteImages.addEventListener('click', function() {
            pendingNoteImages = [];
            renderNoteImageList();
        });
    }
    if (dom.btnSaveNote) {
        dom.btnSaveNote.addEventListener('click', saveNoteFromPanel);
    }
    if (dom.btnClearNote) {
        dom.btnClearNote.addEventListener('click', clearNoteFromPanel);
    }

    // 恢复上次悬浮框位置和大小
    try {
        var saved = JSON.parse(localStorage.getItem('smarttable_note_tooltip_pos') || '{}');
        if (saved.left) dom.noteTooltip.style.left = saved.left;
        if (saved.top) dom.noteTooltip.style.top = saved.top;
        if (saved.width) dom.noteTooltip.style.width = saved.width;
        if (saved.height) dom.noteTooltip.style.height = saved.height;
    } catch(e) {}

    // 点击显示区进入编辑
    if (dom.cellNoteDisplay) {
        dom.cellNoteDisplay.addEventListener('click', function() {
            this.style.display = 'none';
            var textarea = dom.cellNoteText;
            textarea.value = pendingCellNoteText || '';
            textarea.style.display = 'block';
            textarea.focus();
            autoResizeCellNote();
        });
    }

    // textarea 事件：输入计数、自动高度、Enter保存、blur保存
    if (dom.cellNoteText) {
        dom.cellNoteText.addEventListener('input', function() {
            if (dom.cellNoteCharCount) {
                dom.cellNoteCharCount.textContent = this.value.length;
            }
            autoResizeCellNote();
        });
        dom.cellNoteText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitCellNoteText();
            }
        });
        dom.cellNoteText.addEventListener('blur', function() {
            commitCellNoteText();
        });
    }

}