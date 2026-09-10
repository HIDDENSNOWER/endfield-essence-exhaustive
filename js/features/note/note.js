/**
 * note.js - 单元格备注、图片、悬浮框
 * 挂载到 App.note
 *
 * 图片存储已迁移至 IndexedDB：
 *   - 单元格 note.images 中保存图片 ID（字符串）
 *   - 上传、显示、删除时通过 App.imageStore 异步操作
 *   - 兼容旧数据中的 base64 Data URL（显示时自动识别并加载）
 *
 * 主要功能：
 *   - 备注文本编辑（≤550 字，Enter 保存，Shift+Enter 换行）
 *   - 备注图片上传、缩略图管理、清除
 *   - 悬浮框显示备注与图片，支持拖拽、缩放、布局切换
 *   - 应用内大图查看器（悬停放大）
 */
(function (App) {
    'use strict';

    // ==================== 模块内部状态 ====================
    let currentNoteCell = null;            // 当前正在编辑备注的单元格坐标 {r, c}
    let pendingCellNoteText = '';          // 暂存的备注文本（编辑中尚未保存）
    let pendingNoteImages = [];            // 暂存的备注图片 ID 数组
    let originalNoteImages = [];           // 加载备注时的原始图片快照（用于差集删除）
    let noteShowTimer = null;              // 悬浮框显示定时器
    let noteHideTimer = null;              // 悬浮框隐藏定时器
    let noteDragState = null;              // 悬浮框拖拽状态
    let noteResizeState = null;            // 悬浮框调整大小状态
    let noteTooltipHover = false;          // 鼠标是否悬停在悬浮框上
    let imageViewerHover = false;          // 鼠标是否悬停在图片查看器上
    let imageViewerModal = null;           // 图片查看器容器元素
    let imageViewerImage = null;           // 图片查看器中的 img 元素
    let btnCloseImageViewer = null;        // 图片查看器关闭按钮
    let currentImageNaturalSize = { width: 0, height: 0 }; // 当前查看图片的自然尺寸
    let currentImageScale = 1;             // 当前查看图片的缩放比例

    /**
     * 判断图片引用是否为 base64 数据（旧格式兼容）
     * @param {string} ref - 图片引用（ID 或 base64 Data URL）
     * @returns {boolean}
     */
    function isBase64Image(ref) {
        return typeof ref === 'string' && ref.startsWith('data:');
    }

    /**
     * 获取图片显示 URL
     * - 若为 base64（旧数据），直接返回原值
     * - 若为图片 ID，从 IndexedDB 获取 Blob 并创建 Blob URL
     * @param {string} ref - 图片引用
     * @returns {Promise<string>} 可用的图片 URL
     */
    async function resolveImageUrl(ref) {
        if (isBase64Image(ref)) return ref;
        return await App.imageStore.getImageUrl(ref);
    }

    App.note = {
        // ==================== 数据操作 ====================

        /**
         * 获取指定单元格的备注对象
         * @param {number} rowIdx - 行索引
         * @param {number} colIdx - 全局列索引
         * @returns {{text: string, images: string[]}} 备注对象（images 为 ID 或 base64）
         */
        getCellNote(rowIdx, colIdx) {
            const cell = App.utils.normalizeCell(App.state.rows[rowIdx].data[colIdx]);
            return cell.note || { text: '', images: [] };
        },

        /**
         * 设置指定单元格的备注对象
         * @param {number} rowIdx - 行索引
         * @param {number} colIdx - 全局列索引
         * @param {{text: string, images: string[]}} note - 新备注对象
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
         */
        loadNoteIntoPanel(rowIdx, colIdx) {
            // 清理上一次编辑中新增但未保存的图片（避免成为孤儿）
            if (originalNoteImages.length > 0 || pendingNoteImages.length > 0) {
                const originalSet = new Set(originalNoteImages);
                pendingNoteImages.forEach(ref => {
                    if (!originalSet.has(ref) && !isBase64Image(ref)) {
                        App.imageStore.deleteImage(ref).catch(() => {});
                    }
                });
            }

            currentNoteCell = { r: rowIdx, c: colIdx };
            const note = this.getCellNote(rowIdx, colIdx);
            pendingCellNoteText = note.text || '';
            pendingNoteImages = (note.images || []).slice();
            originalNoteImages = (note.images || []).slice();  // ← 快照
            this.updateCellNoteDisplay(pendingCellNoteText);
            this.renderNoteImageList();
        },

        /**
         * 渲染备注图片缩略图列表（异步加载图片）
         */
        renderNoteImageList() {
            const dom = App.dom;
            if (!dom.noteImageList) return;
            dom.noteImageList.innerHTML = '';

            pendingNoteImages.forEach((imgRef, idx) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'note-image-thumb';

                const img = document.createElement('img');
                img.alt = '备注图片';
                // 异步加载图片 URL（ID → Blob URL，base64 → 原值）
                resolveImageUrl(imgRef)
                    .then(url => { img.src = url; })
                    .catch(() => { img.alt = '加载失败'; });
                wrapper.appendChild(img);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'note-image-remove';
                removeBtn.textContent = '✕';
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    // 只从数组移除；图片实际删除延迟到保存/清除备注时执行
                    pendingNoteImages.splice(idx, 1);
                    App.note.renderNoteImageList();
                });
                wrapper.appendChild(removeBtn);

                // 点击缩略图打开大图
                wrapper.addEventListener('click', function () {
                    resolveImageUrl(imgRef)
                        .then(url => App.note.showImageViewer(url));
                });

                dom.noteImageList.appendChild(wrapper);
            });
        },

        /**
         * 提交备注文本输入
         * @returns {string} 处理后的文本
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
         * 自动调整备注输入框高度
         */
        autoResizeCellNote() {
            const textarea = App.dom.cellNoteText;
            textarea.style.height = 'auto';
            const minHeight = 60;
            textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
        },

        /**
         * 保存备注（从面板）
         * 保存成功后将原单元格图片集与当前编辑集做差集，删除不再引用的图片
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

            // 计算差集：原引用中不再使用的图片 → 从 IndexedDB 删除
            const currentSet = new Set(pendingNoteImages);
            originalNoteImages.forEach(ref => {
                if (!currentSet.has(ref) && !isBase64Image(ref)) {
                    App.imageStore.deleteImage(ref).catch(() => {});
                }
            });
            originalNoteImages = pendingNoteImages.slice();  // 更新快照

            App.dom.inputHint.textContent = '备注已保存';
            this.updateCellNoteDisplay(pendingCellNoteText);
        },

        /**
         * 清除当前备注（从面板）
         * 删除原单元格引用的所有图片，以及编辑过程中新增但未保存的图片
         */
        clearNoteFromPanel() {
            if (!currentNoteCell) {
                App.modal.showAlert('请先在数据输入面板中选择单元格。', '提示');
                return;
            }

            // 合并去重后统一删除（原引用 + 编辑期新增未保存）
            const toDelete = new Set([...originalNoteImages, ...pendingNoteImages]);
            toDelete.forEach(ref => {
                if (!isBase64Image(ref)) {
                    App.imageStore.deleteImage(ref).catch(() => {});
                }
            });

            pendingCellNoteText = '';
            pendingNoteImages = [];
            originalNoteImages = [];
            this.updateCellNoteDisplay('');
            this.renderNoteImageList();
            this.setCellNote(currentNoteCell.r, currentNoteCell.c, { text: '', images: [] });
            App.dom.inputHint.textContent = '备注已清除';
        },

        // ==================== 图片上传 ====================

        /**
         * 处理备注图片上传
         * 图片通过 FileReader 读取为 Data URL，再转为 Blob 存入 IndexedDB。
         * 限制单张 ≤1MB，单格 ≤10 张。
         * @param {FileList} files - 选中的图片文件列表
         */
        handleNoteImageUpload(files) {
            const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
            const MAX_IMAGE_COUNT = 10;

            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                if (file.size > MAX_IMAGE_SIZE) {
                    App.modal.showAlert(`图片过大（超过 1MB），已跳过：${file.name}\n请压缩后再上传。`, '图片上传限制');
                    return;
                }
                if (pendingNoteImages.length >= MAX_IMAGE_COUNT) {
                    App.modal.showAlert(`单个单元格最多上传 ${MAX_IMAGE_COUNT} 张图片，已忽略后续文件。`, '图片上传限制');
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // 将 Data URL 转为 Blob
                        const blob = App.utils.base64ToBlob(e.target.result);
                        if (!blob) return;
                        // 存入 IndexedDB，得到图片 ID
                        const imageId = await App.imageStore.saveImage(blob);
                        pendingNoteImages.push(imageId);
                        this.renderNoteImageList();
                    } catch (err) {
                        console.warn('图片保存到 IndexedDB 失败:', err);
                        App.modal.showAlert('图片保存失败，请重试。', '错误');
                    }
                };
                reader.readAsDataURL(file);
            });
        },

        // ==================== 大图查看 ====================

        /**
         * 显示图片查看器
         * @param {string} src - 图片 URL（Blob URL 或 Data URL）
         */
        showImageViewer(src) {
            if (!imageViewerModal || !imageViewerImage) return;
            imageViewerModal.style.display = 'block';

            const tempImg = new Image();
            tempImg.onload = () => {
                currentImageNaturalSize = { width: tempImg.naturalWidth, height: tempImg.naturalHeight };
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
         */
        applyImageScale() {
            const displayWidth = currentImageNaturalSize.width * currentImageScale;
            const displayHeight = currentImageNaturalSize.height * currentImageScale;
            imageViewerImage.style.width = displayWidth + 'px';
            imageViewerImage.style.height = displayHeight + 'px';

            const paddingX = 5, paddingY = 5, borderWidth = 1;
            imageViewerModal.style.width = (displayWidth + (paddingX + borderWidth) * 2) + 'px';
            imageViewerModal.style.height = (displayHeight + (paddingY + borderWidth) * 2) + 'px';
        },

        /**
         * 定位图片查看器（在悬浮框旁）
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
                note.images.forEach(imgRef => {
                    const safeId = App.utils.escapeHtml(imgRef);
                    html += `<img src="" data-image-id="${safeId}" alt="备注图片" class="note-tooltip-image">`;
                });
                html += '</div>';
            }
            App.dom.noteTooltipBody.innerHTML = html;

            // 异步加载悬浮框中的图片
            const imgs = App.dom.noteTooltipBody.querySelectorAll('.note-tooltip-image[data-image-id]');
            imgs.forEach(img => {
                const ref = img.dataset.imageId;
                resolveImageUrl(ref)
                    .then(url => { img.src = url; })
                    .catch(() => { img.alt = '图片加载失败'; });
            });

            const layout = App.storage.loadNoteTooltipLayout();
            App.dom.noteTooltip.className = `note-tooltip layout-${layout}`;
            App.dom.noteTooltip.style.display = 'flex';
            this.positionNoteTooltip(x, y);
        },

        /**
         * 定位悬浮框
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
         */
        hideNoteTooltip(immediate) {
            if (immediate) {
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
         */
        initNoteTooltipInteractions() {
            const dom = App.dom;

            dom.noteTooltipHeader.addEventListener('mousedown', function (e) {
                if (e.target.closest('.note-tooltip-btn')) return;
                const rect = dom.noteTooltip.getBoundingClientRect();
                noteDragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                e.preventDefault();
            });

            document.addEventListener('mousemove', function (e) {
                if (noteDragState) {
                    const rect = dom.noteTooltip.getBoundingClientRect();
                    const maxLeft = Math.max(0, window.innerWidth - rect.width);
                    const maxTop = Math.max(0, window.innerHeight - rect.height);
                    const left = Math.min(maxLeft, Math.max(0, e.clientX - noteDragState.offsetX));
                    const top = Math.min(maxTop, Math.max(0, e.clientY - noteDragState.offsetY));
                    dom.noteTooltip.style.left = left + 'px';
                    dom.noteTooltip.style.top = top + 'px';
                }
                if (noteResizeState) {
                    const newW = Math.max(200, Math.min(360, noteResizeState.startW + (e.clientX - noteResizeState.startX)));
                    const newH = Math.max(100, Math.min(360, noteResizeState.startH + (e.clientY - noteResizeState.startY)));
                    dom.noteTooltip.style.width = newW + 'px';
                    dom.noteTooltip.style.height = newH + 'px';
                }
            });

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

            dom.noteTooltipResizer.addEventListener('mousedown', function (e) {
                const rect = dom.noteTooltip.getBoundingClientRect();
                noteResizeState = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height };
                e.preventDefault();
            });

            dom.btnNoteTooltipClose.addEventListener('click', () => this.hideNoteTooltip(true));

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

            dom.noteTooltip.addEventListener('mouseenter', function () {
                noteTooltipHover = true;
                clearTimeout(noteHideTimer);
            });
            dom.noteTooltip.addEventListener('mouseleave', function () {
                noteTooltipHover = false;
                App.note.hideNoteTooltip(false);
            });

            imageViewerModal.addEventListener('mouseenter', function () {
                imageViewerHover = true;
                clearTimeout(noteHideTimer);
            });
            imageViewerModal.addEventListener('mouseleave', function () {
                imageViewerHover = false;
                App.note.hideNoteTooltip(false);
            });

            dom.noteTooltip.addEventListener('mouseover', function (e) {
                const img = e.target.closest('.note-tooltip-image');
                if (img && img.src) App.note.showImageViewer(img.src);
            });
        },

        // ==================== 初始化 ====================

        /**
         * 初始化备注功能
         */
        initNoteFeature() {
            imageViewerModal = document.getElementById('imageViewerModal');
            imageViewerImage = document.getElementById('imageViewerImage');
            btnCloseImageViewer = document.getElementById('btnCloseImageViewer');

            this.initNoteHoverEvents();
            this.initNoteTooltipInteractions();

            if (btnCloseImageViewer) btnCloseImageViewer.addEventListener('click', () => this.hideImageViewer());

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
            if (dom.btnAddNoteImage) dom.btnAddNoteImage.addEventListener('click', () => dom.noteImageInput.click());
            if (dom.noteImageInput) {
                dom.noteImageInput.addEventListener('change', function (e) {
                    App.note.handleNoteImageUpload(e.target.files);
                    e.target.value = '';
                });
            }
            if (dom.btnClearNoteImages) dom.btnClearNoteImages.addEventListener('click', () => {
                // 只清空数组；图片实际删除延迟到保存/清除备注时统一处理
                pendingNoteImages = [];
                App.note.renderNoteImageList();
            });
            if (dom.btnSaveNote) dom.btnSaveNote.addEventListener('click', () => this.saveNoteFromPanel());
            if (dom.btnClearNote) dom.btnClearNote.addEventListener('click', () => this.clearNoteFromPanel());

            const savedPos = App.storage.loadNoteTooltipPos();
            if (savedPos.left) dom.noteTooltip.style.left = savedPos.left;
            if (savedPos.top) dom.noteTooltip.style.top = savedPos.top;
            if (savedPos.width) dom.noteTooltip.style.width = savedPos.width;
            if (savedPos.height) dom.noteTooltip.style.height = savedPos.height;

            if (dom.cellNoteDisplay) {
                dom.cellNoteDisplay.addEventListener('click', function () {
                    this.style.display = 'none';
                    dom.cellNoteText.value = pendingCellNoteText || '';
                    dom.cellNoteText.style.display = 'block';
                    dom.cellNoteText.focus();
                    App.note.autoResizeCellNote();
                });
            }

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