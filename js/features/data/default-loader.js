/**
 * default-loader.js - 默认数据集异步加载
 * 挂载到 App.defaultLoader
 *
 * 本模块负责从外部 data/data.json 文件异步加载默认数据集，并处理其中的图片引用。
 * 主要功能：
 * - showDefaultDatasetLoading / updateDefaultDatasetProgress / hideDefaultDatasetLoading：控制加载指示器的显示和进度更新
 * - loadDefaultDataset：请求 data.json，解析行数据，并转换图片为 Data URL
 * - resolveDefaultImages：遍历行数据，将图片文件名替换为 Data URL，并支持进度回调
 * - startLoadingDefaultDataset：启动加载流程（带防重复加载保护），加载完成后更新状态
 *
 * 加载过程：
 * 1. 显示加载指示器
 * 2. 获取 data.json
 * 3. 统计需要转换的图片数量
 * 4. 逐张图片加载并转为 Data URL（进度更新）
 * 5. 完成后更新状态、保存默认数据集、更新 UI
 *
 * 若加载失败，则回退到空数据，保证应用仍可运行。
 */
(function (App) {
    'use strict';

    // 防止重复加载默认数据集的标志
    let defaultDatasetLoadingStarted = false;

    App.defaultLoader = {
        /**
         * 显示默认数据集加载指示器
         * @param {string} text - 提示文本，默认“正在加载默认数据集...”
         *
         * 在页面右上角显示加载动画、文字和进度条，并重置进度为 0%。
         */
        showDefaultDatasetLoading(text = '正在加载默认数据集...') {
            const el = document.getElementById('defaultDatasetLoading');
            if (!el) return;
            document.getElementById('defaultDatasetLoadingText').textContent = text;
            document.getElementById('defaultDatasetProgress').style.width = '0%';
            el.style.display = 'flex';
        },

        /**
         * 更新默认数据集加载进度
         * @param {number} percent - 进度百分比（0~100）
         * @param {string} text - 可选提示文本
         *
         * 更新进度条宽度和提示文字，若指示器未显示则忽略。
         */
        updateDefaultDatasetProgress(percent, text) {
            const el = document.getElementById('defaultDatasetLoading');
            if (!el || el.style.display === 'none') return;
            if (percent !== undefined) {
                // 限制在0~100之间
                document.getElementById('defaultDatasetProgress').style.width = Math.min(100, Math.max(0, percent)) + '%';
            }
            if (text) {
                document.getElementById('defaultDatasetLoadingText').textContent = text;
            }
        },

        /**
         * 隐藏默认数据集加载指示器
         */
        hideDefaultDatasetLoading() {
            const el = document.getElementById('defaultDatasetLoading');
            if (el) el.style.display = 'none';
        },

        /**
         * 从 data/data.json 加载默认数据集
         * @param {Function} onProgress - 进度回调 (percent, message)
         * @returns {Promise<Array>} 解析后的行数据数组
         *
         * 通过 fetch 请求 data.json，提取 rows 或整个 JSON 作为行数据。
         * 然后调用 resolveDefaultImages 将图片文件名转换为 Data URL，
         * 并在过程中通过 onProgress 报告进度。
         * 若任何步骤失败，返回空数据并提示。
         */
        async loadDefaultDataset(onProgress) {
            if (typeof onProgress !== 'function') onProgress = () => {};
            try {
                onProgress(5, '正在获取 data.json ...');
                const response = await fetch('data/data.json');
                if (!response.ok) throw new Error('Failed to load data/data.json');
                const json = await response.json();

                // 支持两种格式：{rows: [...]} 或直接数组
                let rows = json.rows || json;
                if (!Array.isArray(rows)) throw new Error('Invalid format');

                // 统计需要转换的图片总数
                let totalImages = 0;
                for (const row of rows) {
                    for (const cell of row.data) {
                        const note = cell.note;
                        if (note && note.images && note.images.length > 0) {
                            totalImages += note.images.length;
                        }
                    }
                }
                let processedImages = 0;

                onProgress(15, `正在转换图片 (0/${totalImages}) ...`);

                // 转换图片，并更新进度
                rows = await this.resolveDefaultImages(rows, (imgDone, imgTotal) => {
                    processedImages = imgDone;
                    // 图片转换阶段占总进度的 15% ~ 95%
                    const percent = 15 + Math.floor((processedImages / totalImages) * 80);
                    onProgress(percent, `正在转换图片 (${processedImages}/${totalImages}) ...`);
                });

                onProgress(100, '默认数据加载完成');
                return rows;
            } catch (e) {
                console.warn('默认数据集加载失败，使用空数据', e);
                onProgress(0, '加载失败，使用空数据');
                return App.dataModel.createInitialRows();
            }
        },

        /**
         * 将 rows 中 note.images 的文件名转换为 Data URL
         * @param {Array} rows - 行数据数组
         * @param {Function} onImageProcessed - 每处理一张图片的回调 (doneCount, totalCount)
         * @returns {Promise<Array>} 转换完成的行数据
         *
         * 遍历所有行和单元格，对于每个 note.images 数组中的引用：
         * - 如果已经是 Data URL（以 'data:' 开头），直接保留
         * - 否则尝试从 data/images/ 目录加载图片并转为 Data URL
         * - 每处理一张图片，调用 onImageProcessed 更新进度
         */
        async resolveDefaultImages(rows, onImageProcessed) {
            // 先统计总图片数
            let total = 0;
            let done = 0;
            for (const row of rows) {
                for (const cell of row.data) {
                    const note = cell.note;
                    if (note && note.images && note.images.length > 0) {
                        total += note.images.length;
                    }
                }
            }

            // 遍历并转换
            for (const row of rows) {
                for (const cell of row.data) {
                    const note = cell.note;
                    if (note && note.images && note.images.length > 0) {
                        const newImages = [];
                        for (const ref of note.images) {
                            if (typeof ref === 'string' && ref.startsWith('data:')) {
                                // 已是 Data URL，直接使用
                                newImages.push(ref);
                            } else if (typeof ref === 'string') {
                                // 尝试从 data/images/ 加载
                                try {
                                    const imgResp = await fetch('data/images/' + ref);
                                    if (imgResp.ok) {
                                        const blob = await imgResp.blob();
                                        const dataUrl = await App.utils.blobToDataURL(blob);
                                        newImages.push(dataUrl);
                                    }
                                } catch (e) {
                                    console.warn('图片加载失败:', ref, e);
                                }
                            }
                            done++;
                            if (typeof onImageProcessed === 'function') {
                                onImageProcessed(done, total);
                            }
                        }
                        note.images = newImages;
                    }
                }
            }
            return rows;
        },

        /**
         * 开始加载默认数据集（带进度提示，避免重复加载）
         *
         * 使用 defaultDatasetLoadingStarted 防止重复调用。
         * 加载成功后：
         * - 设置全局 DEFAULT_ROWS
         * - 确保默认数据集在列表中存在
         * - 如果当前数据集是默认数据集，则更新状态、保存基准、更新 UI
         *
         * 加载失败时使用空数据，但保证应用不崩溃。
         */
        startLoadingDefaultDataset() {
            if (defaultDatasetLoadingStarted) return;
            defaultDatasetLoadingStarted = true;

            this.showDefaultDatasetLoading('正在加载默认数据集...');
            this.loadDefaultDataset((percent, message) => {
                this.updateDefaultDatasetProgress(percent, message);
            }).then(defaultRows => {
                DEFAULT_ROWS = defaultRows;

                // 确保默认数据集存在于列表
                if (!App.storage.getDatasetList().includes(App.constants.DEFAULT_STORAGE_KEY)) {
                    App.storage.addDatasetKey(App.constants.DEFAULT_STORAGE_KEY);
                    App.storage.setJSON(App.constants.DEFAULT_STORAGE_KEY, DEFAULT_ROWS);
                }

                const currentKey = App.storage.loadCurrentDatasetKey();
                // 如果当前正在查看默认数据集，立即更新界面
                if (currentKey === App.constants.DEFAULT_STORAGE_KEY) {
                    App.state.rows = DEFAULT_ROWS.map(row => ({
                        name: row.name,
                        data: row.data.map(App.utils.normalizeCell)
                    }));
                    App.tableRenderer.renderAllTables();
                    App.datasetManager.saveData();
                    App.datasetManager.saveBaseline();
                    App.datasetManager.updateLockedUI();
                }

                this.hideDefaultDatasetLoading();
                App.modal.showTemporaryHint('默认数据集加载完成', 'success');
            }).catch(err => {
                console.warn('默认数据集加载异常', err);
                DEFAULT_ROWS = App.dataModel.createInitialRows();
                if (!App.storage.getDatasetList().includes(App.constants.DEFAULT_STORAGE_KEY)) {
                    App.storage.addDatasetKey(App.constants.DEFAULT_STORAGE_KEY);
                    App.storage.setJSON(App.constants.DEFAULT_STORAGE_KEY, DEFAULT_ROWS);
                }
                const currentKey = App.storage.loadCurrentDatasetKey();
                if (currentKey === App.constants.DEFAULT_STORAGE_KEY) {
                    App.state.rows = DEFAULT_ROWS.map(row => ({ ...row, data: row.data.map(App.utils.normalizeCell) }));
                    App.tableRenderer.renderAllTables();
                    App.datasetManager.saveBaseline();
                    App.datasetManager.updateLockedUI();
                }
                this.hideDefaultDatasetLoading();
                App.modal.showTemporaryHint('默认数据集加载失败，已使用空数据', 'error');
            });
        }
    };

})(window.App = window.App || {});