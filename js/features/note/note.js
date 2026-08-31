/**
 * note.js - 单元格备注、图片、悬浮框
 * 挂载到 App.note
 *
 * 本模块负责单元格备注的完整功能：
 * - 备注数据读写（文本 + 图片）
 * - 备注输入面板的交互
 * - 图片上传、缩略图管理
 * - 鼠标悬停显示备注悬浮框，支持拖拽、调整大小、切换布局
 * - 悬浮框内图片的悬停放大查看（图片查看器）
 *
 * 模块内部维护多个状态变量，用于协调悬浮框的显示/隐藏、拖拽/缩放、
 * 图片查看器与悬浮框之间的联动隐藏。
 */
(function (App) {
    'use strict';

    // ==================== 模块内部状态 ====================
    let currentNoteCell = null;            // 当前正在编辑备注的单元格坐标 {r, c}
    let pendingCellNoteText = '';          // 暂存的备注文本（编辑中尚未保存）
    let pendingNoteImages = [];            // 暂存的备注图片数组（base64 Data URL）
    let noteShowTimer = null;              // 悬浮框显示定时器（延迟显示）
    let noteHideTimer = null;              // 悬浮框隐藏定时器（延迟隐藏）
    let noteDragState = null;              // 悬浮框拖拽状态（偏移量）
    let noteResizeState = null;            // 悬浮框调整大小状态（起始位置和尺寸）
    let noteTooltipHover = false;          // 鼠标是否悬停在悬浮框上
    let imageViewerHover = false;          // 鼠标是否悬停在图片查看器上
    let imageViewerModal = null;           // 图片查看器容器元素
    let imageViewerImage = null;           // 图片查看器中的 img 元素
    let btnCloseImageViewer = null;        // 图片查看器关闭按钮
    let currentImageNaturalSize = { width: 0, height: 0 }; // 当前查看图片的自然尺寸
    let currentImageScale = 1;             // 当前查看图片的缩放比例

    App.note = {
        // ==================== 数据操作 ====================

        /**
         * 获取指定单元格的备注对象
         * @param {number} rowIdx - 行索引
         * @param {number} colIdx - 全局列索引
         * @returns {{text: string, images: string[]}} 备注对象
         */
        getCellNote(rowIdx, colIdx) {
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIdx]);
            return cell.note || { text: '', images: [] };
        },

        /**
         * 设置指定单元格的备注对象
         * @param {number} rowIdx - 行索引
         * @param {number} colIdx - 全局列索引
         * @param {{text: string, images: string[]}} note - 新的备注对象
         *
         * 更新单元格的 note 字段，保存数据并重新渲染表格。
         */
        setCellNote(rowIdx, colIdx, note) {
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIdx]);
            cell.note = note;
            App.state.rows[rowIdx].data[colIdx] = cell;
            App.datasetManager.saveData();
            App.tableRenderer.renderAllTables();
        },

        // ==================== 备注输入面板 ====================

        /**
         * 更新备注显示/编辑状态
         * @param {string} text - 备注文本
         *
         * 如果文本非空，显示展示区并隐藏输入框，同时更新字符计数；
         * 否则隐藏展示区，显示输入框并清空内容。
         */
        updateCellNoteDisplay(text) {
            const dom = App.dom;
            if (text && text.length > 0) {
                dom.cellNoteDisplay.textContent = text;
                dom.cellNoteDisplay.style.display = 'block';
                dom.cellNoteText.style.display = 'none';
                if (dom.cellNoteCharCount) dom.cellNoteCharCount.textContent = text.length;
            } else {
                dom.cellNoteDisplay.style.display = 'none';
                dom.cellNoteText.style.display = 'block';
                dom.cellNoteText.value = '';
                if (dom.cellNoteCharCount) dom.cellNoteCharCount.textContent = '0';
            }
        },

        /**
         * 将指定单元格的备注加载到输入面板
         * @param {number} rowIdx - 行索引
         * @param {number} colIdx - 全局列索引
         *
         * 设置当前编辑单元格坐标，读取备注内容到暂存变量，
         * 更新显示状态和图片缩略图列表。
         */
        loadNoteIntoPanel(rowIdx, colIdx) {
            currentNoteCell = { r: rowIdx, c: colIdx };
            const note = this.getCellNote(rowIdx, colIdx);
            pendingCellNoteText = note.text || '';
            pendingNoteImages = (note.images || []).slice();
            this.updateCellNoteDisplay(pendingCellNoteText);
            this.renderNoteImageList();
        },

        /**
         * 渲染备注图片缩略图列表
         *
         * 清空现有列表，为 pendingNoteImages 中的每张图片创建缩略图，
         * 并提供删除按钮。点击缩略图可在新标签页打开原图。
         */
        renderNoteImageList() {
            const dom = App.dom;
            if (!dom.noteImageList) return;
            dom.noteImageList.innerHTML = '';

            pendingNoteImages.forEach((imgSrc, idx) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'note-image-thumb';

                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = '备注图片';
                wrapper.appendChild(img);

                // 删除按钮
                const removeBtn = document.createElement('button');
                removeBtn.className = 'note-image-remove';
                removeBtn.textContent = '✕';
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation(); // 防止触发缩略图点击
                    pendingNoteImages.splice(idx, 1);
                    App.note.renderNoteImageList();
                });
                wrapper.appendChild(removeBtn);

                // 点击缩略图打开原图（改用应用内大图查看器，Chrome 会拦截 window.open(Data URL)）
                wrapper.addEventListener('click', function () {
                    App.note.showImageViewer(imgSrc);
                });

                dom.noteImageList.appendChild(wrapper);
            });
        },

        /**
         * 提交备注文本输入（去空格、限制长度）
         * @returns {string} 处理后的文本
         *
         * 从输入框读取文本，去除首尾空格，限制最大长度 550，
         * 更新暂存变量和显示状态，自动调整输入框高度。
         */
        commitCellNoteText() {
            const textarea = App.dom.cellNoteText;
            let val = textarea.value.trim();
            if (val.length > 550) {
                val = val.substring(0, 550);
                textarea.value = val;
            }
            pendingCellNoteText = val;
            this.updateCellNoteDisplay(val);
            this.autoResizeCellNote();
            return val;
        },

        /**
         * 自动调整单元格备注输入框高度
         * 最小高度 60px，高度随内容增长
         */
        autoResizeCellNote() {
            const textarea = App.dom.cellNoteText;
            textarea.style.height = 'auto';
            const minHeight = 60;
            textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
        },

        /**
         * 保存备注（从面板）
         *
         * 如果输入框可见，先提交文本。然后构造备注对象并写入单元格。
         * 提示保存成功。
         */
        saveNoteFromPanel() {
            if (!currentNoteCell) {
                App.modal.showAlert('请先在数据输入面板中选择单元格。', '提示');
                return;
            }
            if (App.dom.cellNoteText.style.display !== 'none') {
                this.commitCellNoteText();
            }
            const note = { text: pendingCellNoteText, images: pendingNoteImages.slice() };
            this.setCellNote(currentNoteCell.r, currentNoteCell.c, note);
            App.dom.inputHint.textContent = '备注已保存';
            this.updateCellNoteDisplay(pendingCellNoteText);
        },

        /**
         * 清除当前备注（从面板）
         *
         * 清空暂存文本和图片，更新显示和缩略图，写入空备注对象。
         */
        clearNoteFromPanel() {
            if (!currentNoteCell) {
                App.modal.showAlert('请先在数据输入面板中选择单元格。', '提示');
                return;
            }
            pendingCellNoteText = '';
            pendingNoteImages = [];
            this.updateCellNoteDisplay('');
            this.renderNoteImageList();
            this.setCellNote(currentNoteCell.r, currentNoteCell.c, { text: '', images: [] });
            App.dom.inputHint.textContent = '备注已清除';
        },

        // ==================== 图片上传 ====================

        /**
         * 处理备注图片上传
         * @param {FileList} files - 选中的图片文件列表
         *
         * 过滤非图片文件，限制单张大小与总数量（防止 localStorage 配额超限导致"假保存"），
         * 使用 FileReader 读取为 Data URL，添加到暂存图片数组并重新渲染缩略图列表。
         */
        handleNoteImageUpload(files) {
            const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 单张最大 1MB
            const MAX_IMAGE_COUNT = 10;             // 单格最多 10 张
            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                if (file.size > MAX_IMAGE_SIZE) {
                    App.modal.showAlert(`图片过大（超过 1MB），已跳过：${file.name}\n请压缩后再上传，避免超出浏览器存储配额。`, '图片上传限制');
                    return;
                }
                if (pendingNoteImages.length >= MAX_IMAGE_COUNT) {
                    App.modal.showAlert(`单个单元格最多上传 ${MAX_IMAGE_COUNT} 张图片，已忽略后续文件。`, '图片上传限制');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (pendingNoteImages.length >= MAX_IMAGE_COUNT) return;
                    pendingNoteImages.push(e.target.result);
                    this.renderNoteImageList();
                };
                reader.readAsDataURL(file);
            });
        },

        // ==================== 大图查看 ====================

        /**
         * 显示图片查看器
         * @param {string} src - 图片 Data URL
         *
         * 先显示查看器容器，然后加载图片获取自然尺寸，
         * 计算合适的初始缩放比例（不超过视口），最后定位到悬浮框旁。
         */
        showImageViewer(src) {
            if (!imageViewerModal || !imageViewerImage) return;
            imageViewerModal.style.display = 'block';

            const tempImg = new Image();
            tempImg.onload = () => {
                currentImageNaturalSize = { width: tempImg.naturalWidth, height: tempImg.naturalHeight };

                // 计算初始缩放：确保不超出视口
                const margin = 20;
                const paddingAndBorder = 12;
                const maxWidth = window.innerWidth - margin * 2 - paddingAndBorder;
                const maxHeight = window.innerHeight - margin * 2 - paddingAndBorder;
                const scaleX = maxWidth / currentImageNaturalSize.width;
                const scaleY = maxHeight / currentImageNaturalSize.height;
                currentImageScale = Math.min(scaleX, scaleY, 1);

                imageViewerImage.src = src;
                this.applyImageScale();
                requestAnimationFrame(() => this.positionImageViewer());
            };
            tempImg.onerror = () => {
                this.hideImageViewer();
                App.modal.showAlert('图片加载失败', '错误');
            };
            tempImg.src = src;
        },

        /**
         * 应用当前缩放比例到图片和查看器容器
         *
         * 根据自然尺寸和缩放比例计算显示尺寸，
         * 设置图片宽高和容器宽高（加上内边距和边框）。
         */
        applyImageScale() {
            const displayWidth = currentImageNaturalSize.width * currentImageScale;
            const displayHeight = currentImageNaturalSize.height * currentImageScale;
            imageViewerImage.style.width = displayWidth + 'px';
            imageViewerImage.style.height = displayHeight + 'px';

            const paddingX = 5;
            const paddingY = 5;
            const borderWidth = 1;
            imageViewerModal.style.width = (displayWidth + (paddingX + borderWidth) * 2) + 'px';
            imageViewerModal.style.height = (displayHeight + (paddingY + borderWidth) * 2) + 'px';
        },

        /**
         * 定位图片查看器（在悬浮框旁）
         *
         * 根据悬浮框位置和查看器尺寸，选择左右空间较大的一侧放置，
         * 垂直方向与悬浮框顶部对齐，并进行边界保护。
         */
        positionImageViewer() {
            const tooltipRect = App.dom.noteTooltip.getBoundingClientRect();
            const viewerRect = imageViewerModal.getBoundingClientRect();
            const viewerWidth = viewerRect.width;
            const viewerHeight = viewerRect.height;
            const margin = 20;

            const leftSpace = tooltipRect.left - margin;
            const rightSpace = window.innerWidth - tooltipRect.right - margin;
            let left = rightSpace >= leftSpace
                ? tooltipRect.right + margin
                : tooltipRect.left - viewerWidth - margin;

            let top = tooltipRect.top;
            if (top + viewerHeight > window.innerHeight - margin) top = window.innerHeight - viewerHeight - margin;
            if (top < margin) top = margin;

            left = Math.max(margin, Math.min(left, window.innerWidth - viewerWidth - margin));

            imageViewerModal.style.left = left + 'px';
            imageViewerModal.style.top = top + 'px';
        },

        /**
         * 隐藏图片查看器
         * 重置缩放和自然尺寸
         */
        hideImageViewer() {
            if (imageViewerModal) imageViewerModal.style.display = 'none';
            currentImageScale = 1;
            currentImageNaturalSize = { width: 0, height: 0 };
            imageViewerHover = false;
        },

        // ==================== 悬浮框显示与隐藏 ====================

        /**
         * 显示备注悬浮框
         * @param {number} rowIdx - 行索引
         * @param {number} colIdx - 全局列索引
         * @param {number} x - 鼠标 X 坐标
         * @param {number} y - 鼠标 Y 坐标
         *
         * 读取单元格备注，构建 HTML 内容，应用保存的布局，
         * 显示悬浮框并定位到鼠标附近。
         */
        showNoteTooltip(rowIdx, colIdx, x, y) {
            const note = this.getCellNote(rowIdx, colIdx);
            if (!note.text && (!note.images || note.images.length === 0)) return;

            let html = '';
            if (note.text) {
                html += `<div class="note-text">${App.utils.escapeHtml(note.text)}</div>`;
            }
            if (note.images && note.images.length > 0) {
                html += '<div class="note-image-gallery">';
                note.images.forEach(src => {
                    // src 可能来自导入文件，属性值必须转义防 XSS
                    const safeSrc = App.utils.escapeHtml(src);
                    html += `<img src="${safeSrc}" alt="备注图片" class="note-tooltip-image">`;
                });
                html += '</div>';
            }
            App.dom.noteTooltipBody.innerHTML = html;

            const layout = App.storage.loadNoteTooltipLayout();
            App.dom.noteTooltip.className = `note-tooltip layout-${layout}`;

            App.dom.noteTooltip.style.display = 'flex';
            this.positionNoteTooltip(x, y);
        },

        /**
         * 定位悬浮框
         * @param {number} x - 鼠标 X 坐标
         * @param {number} y - 鼠标 Y 坐标
         *
         * 默认出现在鼠标右下角，若超出视口则调整到左上角，
         * 并限制在视口内。
         */
        positionNoteTooltip(x, y) {
            const tooltip = App.dom.noteTooltip;
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
        },

        /**
         * 隐藏备注悬浮框
         * @param {boolean} immediate - 是否立即隐藏
         *
         * 如果 immediate 为 true，直接隐藏并关闭图片查看器；
         * 否则延迟 1 秒，若期间鼠标进入悬浮框或图片查看器则取消隐藏。
         */
        hideNoteTooltip(immediate) {
            if (immediate) {
                // 清除显示定时器，防止关闭后"诈尸"重新弹出
                if (noteShowTimer) { clearTimeout(noteShowTimer); noteShowTimer = null; }
                if (noteHideTimer) { clearTimeout(noteHideTimer); noteHideTimer = null; }
                App.dom.noteTooltip.style.display = 'none';
                this.hideImageViewer();
                return;
            }
            clearTimeout(noteHideTimer);
            noteHideTimer = setTimeout(() => {
                if (noteTooltipHover || imageViewerHover) return;
                App.dom.noteTooltip.style.display = 'none';
                this.hideImageViewer();
            }, 1000);
        },

        // ==================== 拖拽与调整大小 ====================

        /**
         * 初始化悬浮框拖拽与调整大小交互
         *
         * - 头部可拖动
         * - 右下角手柄可调整大小
         * - 关闭按钮、布局切换按钮
         * - 拖动/调整结束后保存位置和尺寸到 localStorage
         */
        initNoteTooltipInteractions() {
            const dom = App.dom;

            // 头部按下开始拖拽
            dom.noteTooltipHeader.addEventListener('mousedown', function (e) {
                if (e.target.closest('.note-tooltip-btn')) return; // 点击按钮不拖拽
                const rect = dom.noteTooltip.getBoundingClientRect();
                noteDragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                e.preventDefault();
            });

            // 鼠标移动处理拖拽和调整大小
            document.addEventListener('mousemove', function (e) {
                if (noteDragState) {
                    // 拖拽位置钳制在视口内，防止拖出屏幕后无法找回
                    const rect = dom.noteTooltip.getBoundingClientRect();
                    const maxLeft = Math.max(0, window.innerWidth - rect.width);
                    const maxTop = Math.max(0, window.innerHeight - rect.height);
                    const left = Math.min(maxLeft, Math.max(0, e.clientX - noteDragState.offsetX));
                    const top = Math.min(maxTop, Math.max(0, e.clientY - noteDragState.offsetY));
                    dom.noteTooltip.style.left = left + 'px';
                    dom.noteTooltip.style.top = top + 'px';
                }
                if (noteResizeState) {
                    // 尺寸上限与 CSS max-width/max-height 保持一致（360px）
                    const newW = Math.max(200, Math.min(360, noteResizeState.startW + (e.clientX - noteResizeState.startX)));
                    const newH = Math.max(100, Math.min(360, noteResizeState.startH + (e.clientY - noteResizeState.startY)));
                    dom.noteTooltip.style.width = newW + 'px';
                    dom.noteTooltip.style.height = newH + 'px';
                }
            });

            // 鼠标松开结束拖拽/调整，保存状态
            document.addEventListener('mouseup', function () {
                noteDragState = null;
                noteResizeState = null;
                App.storage.saveNoteTooltipPos({
                    left: dom.noteTooltip.style.left,
                    top: dom.noteTooltip.style.top,
                    width: dom.noteTooltip.style.width,
                    height: dom.noteTooltip.style.height
                });
            });

            // 调整大小手柄按下
            dom.noteTooltipResizer.addEventListener('mousedown', function (e) {
                const rect = dom.noteTooltip.getBoundingClientRect();
                noteResizeState = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height };
                e.preventDefault();
            });

            // 关闭按钮
            dom.btnNoteTooltipClose.addEventListener('click', () => this.hideNoteTooltip(true));

            // 布局切换按钮：循环切换三种布局
            dom.btnNoteTooltipLayout.addEventListener('click', () => {
                const layouts = ['text-top', 'image-top', 'horizontal'];
                const current = App.storage.loadNoteTooltipLayout();
                const idx = layouts.indexOf(current);
                const next = layouts[(idx + 1) % layouts.length];
                App.storage.saveNoteTooltipLayout(next);
                dom.noteTooltip.className = `note-tooltip layout-${next}`;
            });
        },

        // ==================== 悬停事件 ====================

        /**
         * 初始化单元格悬停事件
         *
         * - 鼠标在表格单元格上悬停 1.5 秒后显示备注悬浮框
         * - 鼠标离开单元格后延迟隐藏悬浮框
         * - 鼠标进入悬浮框或图片查看器时保持显示
         * - 悬浮框内图片悬停时显示大图查看器
         */
        initNoteHoverEvents() {
            const dom = App.dom;

            dom.tableArea.addEventListener('mouseover', function (e) {
                const td = e.target.closest('td');
                if (!td || !td.dataset.rowindex || !td.dataset.colindex) return;
                const rowIdx = parseInt(td.dataset.rowindex);
                const colIdx = parseInt(td.dataset.colindex);
                const note = App.note.getCellNote(rowIdx, colIdx);
                if (!note.text && (!note.images || note.images.length === 0)) return;

                clearTimeout(noteShowTimer);
                clearTimeout(noteHideTimer);
                noteShowTimer = setTimeout(() => {
                    App.note.showNoteTooltip(rowIdx, colIdx, e.clientX, e.clientY);
                }, 1500);
            });

            dom.tableArea.addEventListener('mouseout', function (e) {
                const td = e.target.closest('td');
                if (!td) return;
                clearTimeout(noteShowTimer);
                App.note.hideNoteTooltip(false);
            });

            // 鼠标进入悬浮框
            dom.noteTooltip.addEventListener('mouseenter', function () {
                noteTooltipHover = true;
                clearTimeout(noteHideTimer);
            });
            dom.noteTooltip.addEventListener('mouseleave', function () {
                noteTooltipHover = false;
                App.note.hideNoteTooltip(false);
            });

            // 鼠标进入图片查看器
            imageViewerModal.addEventListener('mouseenter', function () {
                imageViewerHover = true;
                clearTimeout(noteHideTimer);
            });
            imageViewerModal.addEventListener('mouseleave', function () {
                imageViewerHover = false;
                App.note.hideNoteTooltip(false);
            });

            // 悬浮框内图片悬停放大
            dom.noteTooltip.addEventListener('mouseover', function (e) {
                const img = e.target.closest('.note-tooltip-image');
                if (img) App.note.showImageViewer(img.src);
            });
        },

        // ==================== 初始化 ====================

        /**
         * 初始化备注功能
         * 由 main.js 在应用初始化时调用
         *
         * - 获取图片查看器相关 DOM 元素
         * - 初始化悬停事件、拖拽/调整大小
         * - 绑定图片上传、保存、清除等按钮
         * - 恢复保存的悬浮框位置和尺寸
         * - 绑定备注展示区点击编辑、输入框事件
         */
        initNoteFeature() {
            imageViewerModal = document.getElementById('imageViewerModal');
            imageViewerImage = document.getElementById('imageViewerImage');
            btnCloseImageViewer = document.getElementById('btnCloseImageViewer');

            this.initNoteHoverEvents();
            this.initNoteTooltipInteractions();

            // 图片查看器关闭按钮
            if (btnCloseImageViewer) btnCloseImageViewer.addEventListener('click', () => this.hideImageViewer());

            // 图片查看器滚轮缩放
            if (imageViewerModal) {
                imageViewerModal.addEventListener('wheel', function (e) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    currentImageScale = Math.max(0.1, Math.min(5, currentImageScale + delta));
                    App.note.applyImageScale();
                    App.note.positionImageViewer();
                }, { passive: false });
            }

            const dom = App.dom;
            // 添加图片按钮
            if (dom.btnAddNoteImage) dom.btnAddNoteImage.addEventListener('click', () => dom.noteImageInput.click());
            // 图片文件选择
            if (dom.noteImageInput) {
                dom.noteImageInput.addEventListener('change', function (e) {
                    App.note.handleNoteImageUpload(e.target.files);
                    e.target.value = '';
                });
            }
            // 清除全部图片
            if (dom.btnClearNoteImages) dom.btnClearNoteImages.addEventListener('click', () => {
                pendingNoteImages = [];
                App.note.renderNoteImageList();
            });
            // 保存备注
            if (dom.btnSaveNote) dom.btnSaveNote.addEventListener('click', () => this.saveNoteFromPanel());
            // 清除备注
            if (dom.btnClearNote) dom.btnClearNote.addEventListener('click', () => this.clearNoteFromPanel());

            // 恢复保存的悬浮框位置和尺寸
            const savedPos = App.storage.loadNoteTooltipPos();
            if (savedPos.left) dom.noteTooltip.style.left = savedPos.left;
            if (savedPos.top) dom.noteTooltip.style.top = savedPos.top;
            if (savedPos.width) dom.noteTooltip.style.width = savedPos.width;
            if (savedPos.height) dom.noteTooltip.style.height = savedPos.height;

            // 备注展示区点击进入编辑模式
            if (dom.cellNoteDisplay) {
                dom.cellNoteDisplay.addEventListener('click', function () {
                    this.style.display = 'none';
                    dom.cellNoteText.value = pendingCellNoteText || '';
                    dom.cellNoteText.style.display = 'block';
                    dom.cellNoteText.focus();
                    App.note.autoResizeCellNote();
                });
            }

            // 备注输入框事件
            if (dom.cellNoteText) {
                dom.cellNoteText.addEventListener('input', function () {
                    if (dom.cellNoteCharCount) dom.cellNoteCharCount.textContent = this.value.length;
                    App.note.autoResizeCellNote();
                });
                dom.cellNoteText.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        App.note.commitCellNoteText();
                    }
                });
                dom.cellNoteText.addEventListener('blur', function () {
                    App.note.commitCellNoteText();
                });
            }
        }
    };

})(window.App = window.App || {});