/**
 * import-export.js - 数据导入导出（ZIP/JSON）
 * 挂载到 App.importExport
 *
 * 本模块负责数据集的导出与导入功能：
 * - 导出：将当前数据集导出为 ZIP（包含 JSON 和图片文件）或纯 JSON 文件
 * - 导入：从 ZIP 或 JSON 文件导入数据，支持重名冲突处理和图片还原
 *
 * 导出流程：
 * 1. 打开导出弹窗，用户可自定义文件名
 * 2. 根据扩展名选择 ZIP 或 JSON 导出
 * 3. ZIP 导出：将 rows 深拷贝，提取 note.images 中的 base64 图片保存到 images 文件夹，
 *    并将 data.json 和图片打包为 ZIP 下载
 *
 * 导入流程：
 * 1. 选择文件，根据扩展名分发到 ZIP 或 JSON 导入
 * 2. ZIP 导入：读取 data.json 和 images 文件夹，将图片文件名还原为 Data URL
 * 3. JSON 导入：直接解析 rows
 * 4. 处理重名冲突（若数据集已存在，弹窗让用户选择覆盖、另存为或取消）
 * 5. 导入成功后创建新数据集并切换过去
 */
(function (App) {
    'use strict';

    App.importExport = {
        /**
         * 打开导出弹窗
         *
         * 根据当前数据集名称和当前日期生成默认文件名（.zip 格式），
         * 填入输入框并打开弹窗，聚焦输入框方便修改。
         */
        exportData() {
            const currentKey = App.storage.loadCurrentDatasetKey();
            const defaultName = `${currentKey}_${new Date().toISOString().slice(0, 10)}.zip`;
            App.dom.exportFileName.value = defaultName;
            App.modal.openModal(App.dom.modalExport);
            setTimeout(() => App.dom.exportFileName.focus(), 100);
        },

        /**
         * 执行导出操作
         *
         * 根据用户填写的文件名（或默认名）判断导出格式：
         * - 若以 .json 结尾，调用 doExportJSON
         * - 否则按 ZIP 处理（若未以 .zip 结尾则自动补全）
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
         * 导出为 ZIP 文件
         * @param {string} fileName - 下载文件名
         *
         * ZIP 结构：
         * - data.json：包含 rows（单元格数据，图片引用已替换为文件名）和备注
         * - images/：所有图片文件
         *
         * 处理步骤：
         * 1. 获取当前数据集备注（优先从展示区或输入框读取）
         * 2. 深拷贝 rows，遍历提取每张图片（base64），保存到 images 文件夹
         * 3. 将 note.images 中的 base64 替换为图片文件名
         * 4. 打包 data.json 和 images 文件夹生成 ZIP
         * 5. 触发浏览器下载
         */
        async doExportZip(fileName) {
            // 获取备注
            let remark = '';
            if (App.dom.datasetRemarkDisplay.style.display !== 'none') {
                remark = App.dom.datasetRemarkDisplay.textContent;
            } else if (App.dom.datasetRemarkInput.style.display !== 'none') {
                remark = App.dom.datasetRemarkInput.value.trim();
            }

            // 深拷贝 rows，提取图片
            const rowsCopy = JSON.parse(JSON.stringify(App.state.rows));
            const zip = new JSZip();
            const imagesFolder = zip.folder('images'); // 创建 images 文件夹
            const imageMap = {};   // 用于去重：base64 -> 文件名
            let imageCounter = 0;

            rowsCopy.forEach((row, rowIdx) => {
                row.data.forEach((cell, colIdx) => {
                    const note = cell.note;
                    if (note && note.images && note.images.length > 0) {
                        const newImageRefs = [];
                        note.images.forEach((base64, imgIdx) => {
                            // 如果这张图片尚未保存，则写入 zip 并记录文件名
                            if (!imageMap[base64]) {
                                const ext = App.utils.getImageExtension(base64);
                                const imageFileName = `cell_${rowIdx}_${colIdx}_${imgIdx}.${ext}`;
                                imageMap[base64] = imageFileName;
                                const blob = App.utils.base64ToBlob(base64);
                                imagesFolder.file(imageFileName, blob);
                            }
                            // 使用文件名替换 base64
                            newImageRefs.push(imageMap[base64]);
                        });
                        note.images = newImageRefs;
                    }
                });
            });

            // 构建导出对象
            const exportObj = {
                rows: rowsCopy,
                remark: remark,
                version: '2.0',
                exportedAt: new Date().toISOString()
            };

            // 将 JSON 加入 ZIP
            zip.file('data.json', JSON.stringify(exportObj, null, 2));

            // 生成 ZIP 并触发下载
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            App.modal.closeModal(App.dom.modalExport);
            App.dom.inputHint.textContent = `已导出：${fileName}`;
        },

        /**
         * 导出为纯 JSON 文件
         * @param {string} fileName - 下载文件名
         *
         * 仅导出 rows 和备注，不处理图片（图片以 Data URL 形式保留在 JSON 中）。
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
         *
         * 打开隐藏的文件输入框，让用户选择要导入的文件。
         */
        triggerImport() {
            App.dom.importFile.click();
        },

        /**
         * 处理导入文件
         * @param {File} file - 用户选择的文件
         *
         * 根据文件扩展名分发到 ZIP 或 JSON 导入。
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
         * @param {File} file
         *
         * 读取 ZIP 中的 data.json 和 images 文件夹：
         * - 解析 data.json 得到 rows 和 remark
         * - 调用 restoreImagesFromZip 将图片文件名替换为 Data URL
         * - 根据文件名确定数据集键，处理重名冲突
         */
        async importZipData(file) {
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

                // 验证格式
                if (!(rows.length > 0 && rows[0].name && Array.isArray(rows[0].data))) {
                    App.modal.showAlert('文件格式不正确。', '导入失败');
                    return;
                }

                // 还原图片
                rows = await this.restoreImagesFromZip(rows, zip);

                // 确定数据集名称
                const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
                this.proceedImportWithConflict(rows, newKey, remark);

            } catch (err) {
                console.error(err);
                App.modal.showAlert('解析 ZIP 文件失败，请检查文件内容。', '导入失败');
            }
        },

        /**
         * 从 ZIP 中还原图片为 Data URL
         * @param {Array} rows - 行数据
         * @param {JSZip} zip - ZIP 对象
         * @returns {Promise<Array>} 还原后的行数据
         *
         * 遍历所有单元格的 note.images，将文件名替换为从 ZIP 中读取的 Data URL。
         */
        async restoreImagesFromZip(rows, zip) {
            const imageFolder = zip.folder('images');
            for (const row of rows) {
                for (const cell of row.data) {
                    const note = cell.note;
                    if (note && note.images && note.images.length > 0) {
                        const restoredImages = [];
                        for (const ref of note.images) {
                            if (typeof ref === 'string' && ref.startsWith('data:')) {
                                // 已经是 Data URL，直接保留
                                restoredImages.push(ref);
                            } else if (typeof ref === 'string' && imageFolder) {
                                // 从 ZIP 中读取图片文件
                                const imageFile = imageFolder.file(ref);
                                if (imageFile) {
                                    const blob = await imageFile.async('blob');
                                    const dataUrl = await App.utils.blobToDataURL(blob);
                                    restoredImages.push(dataUrl);
                                }
                            }
                        }
                        note.images = restoredImages;
                    }
                }
            }
            return rows;
        },

        /**
         * 导入 JSON 文件
         * @param {File} file
         *
         * 使用 FileReader 读取文件内容，解析 JSON，支持两种格式：
         * - 直接数组
         * - { rows: [...], remark: '...' }
         * 然后确定数据集键并处理冲突。
         */
        importJSONData(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
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
                        const fileName = file.name.replace(/\.[^/.]+$/, '') || 'imported';
                        const newKey = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
                        this.proceedImportWithConflict(rows, newKey, remark);
                    } else {
                        App.modal.showAlert('文件格式不正确。', '导入失败');
                    }
                } catch (err) {
                    App.modal.showAlert('解析文件失败，请检查文件内容。', '导入失败');
                }
            };
            reader.readAsText(file);
        },

        /**
         * 处理导入时的重名冲突与受保护数据集
         * @param {Array} rows - 行数据
         * @param {string} newKey - 预期数据集名称
         * @param {string} remark - 备注
         *
         * - 若预期名称与受保护数据集重名，自动追加 "_导入"
         * - 若名称已存在，弹出冲突对话框让用户选择覆盖、另存为或取消
         * - 否则直接执行导入
         */
        proceedImportWithConflict(rows, newKey, remark) {
            const existing = App.storage.getDatasetList();

            if (App.constants.PROTECTED_DATASETS.includes(newKey)) {
                newKey = newKey + '_导入';
            }

            if (existing.includes(newKey)) {
                this.showImportConflictDialog(rows, newKey, remark);
            } else {
                this.proceedImport(rows, newKey, remark);
            }
        },

        /**
         * 显示导入冲突弹窗
         * @param {Array} rows
         * @param {string} newKey
         * @param {string} remark
         *
         * 使用通用确认弹窗的自定义内容实现三个按钮：
         * - 覆盖：直接导入到已有名称
         * - 另存为：添加时间戳后缀创建新名称
         * - 取消：关闭弹窗
         */
        showImportConflictDialog(rows, newKey, remark) {
            // 使用自定义内容覆盖通用确认弹窗
            App.dom.confirmDialogTitle.textContent = '导入冲突';
            App.dom.confirmDialogBody.innerHTML = `
                <p>数据集 "${newKey}" 已存在，请选择操作：</p>
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="btn btn-danger" id="btnOverwrite">覆盖</button>
                    <button class="btn btn-primary" id="btnSaveAs">另存为</button>
                    <button class="btn" id="btnCancelImport">取消</button>
                </div>`;
            App.modal.openModal(App.dom.modalConfirmDialog);

            // 覆盖按钮
            document.getElementById('btnOverwrite').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
                this.proceedImport(rows, newKey, remark);
            });
            // 另存为按钮
            document.getElementById('btnSaveAs').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
                const altKey = newKey + '_' + Date.now(); // 时间戳后缀避免重名
                this.proceedImport(rows, altKey, remark);
            });
            // 取消按钮
            document.getElementById('btnCancelImport').addEventListener('click', () => {
                App.modal.closeConfirmDialog();
            });
        },

        /**
         * 导入数据并创建新数据集
         * @param {Array} data - 行数据
         * @param {string} newKey - 新数据集名称
         * @param {string} remark - 备注
         *
         * 将数据写入 state.rows 和 localStorage，更新界面并切换到新数据集。
         */
        proceedImport(data, newKey, remark) {
            // 标准化数据
            App.state.rows = data.map(row => ({ name: row.name, data: row.data.map(App.utils.normalizeCell) }));
            App.storage.saveCurrentDatasetKey(newKey);
            App.storage.setJSON(newKey, App.state.rows);
            App.storage.addDatasetKey(newKey);

            // 保存备注
            const remarks = App.storage.getDatasetRemarks();
            if (remark) {
                remarks[newKey] = remark;
            } else {
                delete remarks[newKey];
            }
            App.storage.saveDatasetRemarks(remarks);

            // 更新界面
            App.datasetManager.updateDatasetDisplay();
            App.datasetManager.updateDatasetSelect();
            App.tableRenderer.renderAllTables();
            App.dom.inputHint.textContent = `已导入并切换到数据集: ${newKey}`;
            App.storage.saveCurrentDatasetKey(newKey);

            if (typeof App.datasetRemark.updateDatasetRemark === 'function') App.datasetRemark.updateDatasetRemark();
            App.datasetManager.updateLockedUI();
        },

        /**
         * 绑定导入导出事件
         * 由 events.js 统一调用
         */
        bindImportExportEvents() {
            const dom = App.dom;
            if (dom.btnExport) dom.btnExport.addEventListener('click', () => this.exportData());
            if (dom.btnImport) dom.btnImport.addEventListener('click', () => this.triggerImport());
            if (dom.importFile) {
                dom.importFile.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.importData(e.target.files[0]);
                        e.target.value = ''; // 清空，允许重复选择同一文件
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