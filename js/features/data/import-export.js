/**
 * import-export.js - 数据导入导出（ZIP/JSON）
 * 挂载到 App.importExport
 *
 * 图片存储已迁移至 IndexedDB：
 *   - 导出 ZIP 时从 IndexedDB 获取图片 Blob，统一转换为 PNG 格式
 *   - 导入 ZIP/JSON 时将图片 Blob 存入 IndexedDB，单元格保存图片 ID
 *   - 兼容旧数据中的 base64 Data URL（自动检测并转换）
 *
 * 注意：
 *   - 纯 JSON 导出不包含图片二进制（仅保存 ID），导入到新环境时图片会缺失。
 *     如需完整迁移数据，请使用 ZIP 格式导出。
 */
(function (App) {
    'use strict';

    /**
     * 将图片 Blob 转换为 PNG 格式的 Blob
     * @param {Blob} blob - 原始图片 Blob
     * @returns {Promise<Blob>} PNG 格式的 Blob
     */
    async function convertToPngBlob(blob) {
        // 如果已经是 PNG，直接返回
        if (blob.type === 'image/png') return blob;

        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                canvas.toBlob((pngBlob) => {
                    if (pngBlob) resolve(pngBlob);
                    else reject(new Error('PNG 转换失败'));
                }, 'image/png');
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('图片加载失败'));
            };
            img.src = url;
        });
    }

    App.importExport = {
        /**
         * 打开导出弹窗，生成默认文件名
         */
        exportData() {
            const currentKey = App.storage.loadCurrentDatasetKey();
            const defaultName = `${currentKey}_${new Date().toISOString().slice(0, 10)}.zip`;
            App.dom.exportFileName.value = defaultName;
            App.modal.openModal(App.dom.modalExport);
            setTimeout(() => App.dom.exportFileName.focus(), 100);
        },

        /**
         * 执行导出（根据文件扩展名选择 ZIP 或 JSON）
         */
        async doExport() {
            let fileName = App.dom.exportFileName.value.trim();
            if (!fileName) {
                fileName = `${App.storage.loadCurrentDatasetKey()}_${new Date().toISOString().slice(0, 10)}`;
            }
            if (fileName.endsWith('.json')) {
                this.doExportJSON(fileName);
            } else {
                if (!fileName.endsWith('.zip')) fileName += '.zip';
                await this.doExportZip(fileName);
            }
        },

        /**
         * 导出为 ZIP 文件（包含 data.json + images/）
         * 图片从 IndexedDB 获取 Blob，统一转换为 PNG 写入 ZIP
         */
        async doExportZip(fileName) {
            try {
                let remark = '';
                if (App.dom.datasetRemarkDisplay.style.display !== 'none') {
                    remark = App.dom.datasetRemarkDisplay.textContent;
                } else if (App.dom.datasetRemarkInput.style.display !== 'none') {
                    remark = App.dom.datasetRemarkInput.value.trim();
                }

                const rowsCopy = JSON.parse(JSON.stringify(App.state.rows));
                const zip = new JSZip();
                const imagesFolder = zip.folder('images');
                let imageCounter = 0;

                // 遍历所有单元格，提取图片
                for (let rowIdx = 0; rowIdx < rowsCopy.length; rowIdx++) {
                    const row = rowsCopy[rowIdx];
                    for (let colIdx = 0; colIdx < row.data.length; colIdx++) {
                        const cell = row.data[colIdx];
                        const note = cell.note;
                        if (note && note.images && note.images.length > 0) {
                            const newImageRefs = [];
                            for (const imgRef of note.images) {
                                let blob = null;

                                if (typeof imgRef === 'string' && imgRef.startsWith('data:')) {
                                    // 旧数据 base64，转 Blob
                                    const rawBlob = App.utils.base64ToBlob(imgRef);
                                    if (rawBlob) {
                                        blob = await convertToPngBlob(rawBlob);
                                    }
                                } else {
                                    // 图片 ID，从 IndexedDB 获取 Blob
                                    const storedBlob = await App.imageStore.getImage(imgRef);
                                    if (storedBlob) {
                                        blob = await convertToPngBlob(storedBlob);
                                    }
                                }

                                if (!blob) {
                                    console.warn(`导出时无法获取图片: ${imgRef}`);
                                    continue;
                                }

                                // 图片文件命名：cell_行_列_序号.png
                                const imageFileName = `cell_${rowIdx}_${colIdx}_${imageCounter++}.png`;
                                imagesFolder.file(imageFileName, blob);
                                newImageRefs.push(imageFileName);
                            }
                            note.images = newImageRefs;
                        }
                    }
                }

                const exportObj = {
                    rows: rowsCopy,
                    remark: remark,
                    version: '2.0',
                    exportedAt: new Date().toISOString()
                };

                zip.file('data.json', JSON.stringify(exportObj, null, 2));

                const content = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);

                App.modal.closeModal(App.dom.modalExport);
                App.dom.inputHint.textContent = `已导出：${fileName}`;
            } catch (err) {
                console.error('导出 ZIP 失败:', err);
                App.modal.closeModal(App.dom.modalExport);
                App.modal.showAlert('导出失败，请重试或改用 JSON 格式导出。', '导出失败');
            }
        },

        /**
         * 导出为纯 JSON 文件（不含图片二进制，仅保存 ID）
         */
        doExportJSON(fileName) {
            let remark = '';
            if (App.dom.datasetRemarkDisplay.style.display !== 'none') {
                remark = App.dom.datasetRemarkDisplay.textContent;
            } else if (App.dom.datasetRemarkInput.style.display !== 'none') {
                remark = App.dom.datasetRemarkInput.value.trim();
            }

            const exportObj = { rows: App.state.rows, remark };
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

            App.modal.closeModal(App.dom.modalExport);
            App.dom.inputHint.textContent = `已导出：${fileName}`;
        },

        /**
         * 触发导入文件选择
         */
        triggerImport() {
            App.dom.importFile.click();
        },

        /**
         * 根据文件扩展名分发导入
         */
        importData(file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'zip') {
                this.importZipData(file);
            } else if (ext === 'json') {
                this.importJSONData(file);
            } else {
                App.modal.showAlert('不支持的文件格式，请选择 .zip 或 .json 文件。', '导入失败');
            }
        },

        /**
         * 导入 ZIP 文件
         */
        async importZipData(file) {
            const MAX_ZIP_SIZE = 50 * 1024 * 1024;
            if (file.size > MAX_ZIP_SIZE) {
                App.modal.showAlert('ZIP 文件过大（超过 50MB），已拒绝导入。', '导入失败');
                return;
            }
            try {
                const zip = await JSZip.loadAsync(file);
                const dataFile = zip.file('data.json');
                if (!dataFile) {
                    App.modal.showAlert('ZIP 中未找到 data.json。', '导入失败');
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
                    App.modal.showAlert('文件格式不正确。', '导入失败');
                    return;
                }

                if (!(rows.length > 0 && rows[0].name && Array.isArray(rows[0].data))) {
                    App.modal.showAlert('文件格式不正确。', '导入失败');
                    return;
                }

                const missingCount = await this.restoreImagesFromZip(rows, zip);

                const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                const newKey = fileName.replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 50) || 'imported';
                this.proceedImportWithConflict(rows, newKey, remark, missingCount);

            } catch (err) {
                console.error(err);
                App.modal.showAlert('解析 ZIP 文件失败，请检查文件内容。', '导入失败');
            }
        },

        /**
         * 从 ZIP 中还原图片到 IndexedDB
         * 兼容旧数据 base64 和新数据文件名
         */
        async restoreImagesFromZip(rows, zip) {
            const imageFolder = zip.folder('images');
            let missing = 0;
            for (const row of rows) {
                for (const cell of row.data) {
                    const note = cell.note;
                    if (note && note.images && note.images.length > 0) {
                        const restoredImages = [];
                        for (const ref of note.images) {
                            // 旧格式：base64 Data URL
                            if (typeof ref === 'string' && ref.startsWith('data:')) {
                                const blob = App.utils.base64ToBlob(ref);
                                if (blob) {
                                    const id = await App.imageStore.saveImage(blob);
                                    restoredImages.push(id);
                                } else {
                                    missing++;
                                }
                                continue;
                            }
                            // 新格式：文件名（从 ZIP 的 images/ 文件夹读取）
                            if (typeof ref === 'string' && imageFolder) {
                                if (/\.\.\/|\.\.\\|^\/|^\\/.test(ref)) {
                                    missing++;
                                    restoredImages.push(ref);
                                    continue;
                                }
                                const imageFile = imageFolder.file(ref);
                                if (imageFile) {
                                    const blob = await imageFile.async('blob');
                                    const id = await App.imageStore.saveImage(blob);
                                    restoredImages.push(id);
                                } else {
                                    missing++;
                                    restoredImages.push(ref);
                                }
                            } else {
                                // 可能是已有图片 ID，保持原样
                                restoredImages.push(ref);
                            }
                        }
                        note.images = restoredImages;
                    }
                }
            }
            return missing;
        },

        /**
         * 导入 JSON 文件
         */
        importJSONData(file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    let rows, remark;
                    if (Array.isArray(parsed)) {
                        rows = parsed;
                        remark = '';
                    } else if (parsed && parsed.rows && Array.isArray(parsed.rows)) {
                        rows = parsed.rows;
                        remark = parsed.remark || '';
                    } else {
                        App.modal.showAlert('文件格式不正确。', '导入失败');
                        return;
                    }

                    if (rows.length > 0 && rows[0].name && Array.isArray(rows[0].data)) {
                        // 处理旧格式 base64 图片
                        await this.convertBase64ImagesToIds(rows);
                        const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                        const newKey = fileName.replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 50) || 'imported';
                        this.proceedImportWithConflict(rows, newKey, remark, 0);
                    } else {
                        App.modal.showAlert('文件格式不正确。', '导入失败');
                    }
                } catch (_err) {
                    App.modal.showAlert('解析文件失败，请检查文件内容。', '导入失败');
                }
            };
            reader.readAsText(file);
        },

        /**
         * 将旧格式 base64 图片转换为 IndexedDB 图片 ID
         */
        async convertBase64ImagesToIds(rows) {
            for (const row of rows) {
                if (!row.data) continue;
                for (const cell of row.data) {
                    const note = cell && cell.note;
                    if (note && Array.isArray(note.images)) {
                        const newImages = [];
                        for (const img of note.images) {
                            if (typeof img === 'string' && img.startsWith('data:')) {
                                const blob = App.utils.base64ToBlob(img);
                                if (blob) {
                                    const id = await App.imageStore.saveImage(blob);
                                    newImages.push(id);
                                }
                            } else {
                                newImages.push(img);
                            }
                        }
                        note.images = newImages;
                    }
                }
            }
        },

        /**
         * 处理导入时的重名冲突
         */
        proceedImportWithConflict(rows, newKey, remark, missingCount = 0) {
            const existing = App.storage.getDatasetList();
            if (App.datasetManager.isReservedKey(newKey)) {
                newKey = newKey + '_导入';
            }
            if (App.constants.PROTECTED_DATASETS.includes(newKey)) {
                newKey = newKey + '_导入';
            }
            if (existing.includes(newKey)) {
                this.showImportConflictDialog(rows, newKey, remark, missingCount);
            } else {
                this.proceedImport(rows, newKey, remark);
            }
        },

        /**
         * 显示重名冲突弹窗
         */
        showImportConflictDialog(rows, newKey, remark, missingCount = 0) {
            App.dom.confirmDialogTitle.textContent = '导入冲突';
            const safeKey = App.utils.escapeHtml(newKey);
            const missingTip = missingCount > 0
                ? `<p style="font-size:0.78rem; color:var(--danger-primary,#e74c3c); margin-top:8px;">⚠️ 有 ${missingCount} 张图片未能正确导入，这些单元格图片可能缺失。</p>`
                : '';
            App.dom.confirmDialogBody.innerHTML = `
                <p>数据集 "${safeKey}" 已存在，请选择操作：</p>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    <button class="btn btn-danger" id="btnOverwrite">覆盖</button>
                    <button class="btn btn-primary" id="btnMergeImport">合并</button>
                    <button class="btn" id="btnSaveAs">另存为</button>
                    <button class="btn" id="btnCancelImport">取消</button>
                </div>${missingTip}`;
            window.__dialogConfirmCallback = null;
            window.__dialogCancelCallback = null;
            if (App.dom.btnConfirmConfirmDialog) App.dom.btnConfirmConfirmDialog.style.display = 'none';
            if (App.dom.btnCancelConfirmDialog) App.dom.btnCancelConfirmDialog.style.display = 'none';
            App.modal.openModal(App.dom.modalConfirmDialog);

            document.getElementById('btnOverwrite').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
                this.proceedImport(rows, newKey, remark);
            });
            document.getElementById('btnMergeImport').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
                if (App.datasetMerge && App.datasetMerge.startMergeFromImport) {
                    App.datasetMerge.startMergeFromImport(rows, newKey, remark);
                } else {
                    App.modal.showAlert('合并模块未加载，请刷新页面后重试。', '错误');
                }
            });
            document.getElementById('btnSaveAs').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
                const altKey = newKey + '_' + Date.now();
                this.proceedImport(rows, altKey, remark);
            });
            document.getElementById('btnCancelImport').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
            });
        },

        /**
         * 导入数据并创建新数据集
         */
        proceedImport(data, newKey, remark) {
            if (App.datasetManager.isReservedKey(newKey)) {
                App.modal.showAlert('导入名称不可用（不能使用系统保留名称或以 smarttable_ 开头的名称）。', '导入失败');
                return;
            }
            App.state.rows = data.map(row => ({ name: row.name, data: row.data.map(App.utils.normalizeCell) }));
            App.storage.saveCurrentDatasetKey(newKey);
            App.storage.setJSON(newKey, App.state.rows);
            App.storage.addDatasetKey(newKey);

            const remarks = App.storage.getDatasetRemarks();
            if (remark) {
                remarks[newKey] = remark;
            }
            App.storage.saveDatasetRemarks(remarks);

            App.datasetManager.updateDatasetDisplay();
            App.datasetManager.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.dom.inputHint.textContent = `已导入并切换到数据集: ${newKey}`;

            if (typeof App.datasetRemark.updateDatasetRemark === 'function') App.datasetRemark.updateDatasetRemark();
            App.datasetManager.updateLockedUI();
            App.datasetManager.resetHistorySafe();
        },

        /**
         * 绑定导入导出事件
         */
        bindImportExportEvents() {
            const dom = App.dom;
            if (dom.btnExport) dom.btnExport.addEventListener('click', () => this.exportData());
            if (dom.btnImport) dom.btnImport.addEventListener('click', () => this.triggerImport());
            if (dom.importFile) {
                dom.importFile.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.importData(e.target.files[0]);
                        e.target.value = '';
                    }
                });
            }
            if (dom.btnConfirmExport) dom.btnConfirmExport.addEventListener('click', () => this.doExport());
            if (dom.exportFileName) dom.exportFileName.addEventListener('keydown', e => { if (e.key === 'Enter') this.doExport(); });
            if (dom.btnCancelExport) dom.btnCancelExport.addEventListener('click', () => App.modal.closeModal(dom.modalExport));
            if (dom.btnCloseExport) dom.btnCloseExport.addEventListener('click', () => App.modal.closeModal(dom.modalExport));
            if (dom.modalExport) dom.modalExport.addEventListener('click', function (e) { if (e.target === this) App.modal.closeModal(dom.modalExport); });
        }
    };

})(window.App = window.App || {});