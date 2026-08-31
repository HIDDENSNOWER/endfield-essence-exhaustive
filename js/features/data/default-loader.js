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
         * 失败时 Promise reject（不再吞错返回空模板），由调用方决定如何处理，
         * 避免用空数据覆盖用户已保存的默认数据集。
         */
        async loadDefaultDataset(onProgress) {
            if (typeof onProgress !== 'function') onProgress = () => {};
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
                    const note = cell && cell.note;
                    if (note && note.images && note.images.length > 0) {
                        totalImages += note.images.length;
                    }
                }
            }
            let processedImages = 0;

            onProgress(15, `正在转换图片 (0/${totalImages}) ...`);

            // 转换图片，并更新进度（图片数为 0 时避免 0/0 = NaN）
            rows = await this.resolveDefaultImages(rows, (imgDone, imgTotal) => {
                processedImages = imgDone;
                const percent = totalImages > 0 ? 15 + Math.floor((imgDone / totalImages) * 80) : 15;
                onProgress(percent, `正在转换图片 (${imgDone}/${totalImages}) ...`);
            });

            onProgress(100, '默认数据加载完成');
            return rows;
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
                                    } else {
                                        // 加载失败：保留原始文件名引用，不静默丢失图片
                                        newImages.push(ref);
                                    }
                                } catch (e) {
                                    console.warn('图片加载失败，保留引用:', ref, e);
                                    newImages.push(ref);
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
         * - 仅在默认数据集从未保存过时才写入初始数据（不覆盖用户增量，H3 修复）
         * - 当前数据集为默认数据集时：已有用户数据则保留（只更新保护基准），
         *   无数据时用初始数据填充
         *
         * 加载失败时：
         * - 已有本地数据 → 保留并以其为基准（绝不覆盖，H4 修复）
         * - 无本地数据 → 使用空模板（不持久化覆盖）
         *
         * 所有异步回调在写入前校验"发起时的数据集键"，防止用户切换数据集后
         * 把默认数据写入其他数据集（H5 竞态修复）。
         */
        startLoadingDefaultDataset() {
            if (defaultDatasetLoadingStarted) return;
            defaultDatasetLoadingStarted = true;

            // 记录发起时的当前数据集键（竞态防护）
            const loadStartKey = App.storage.loadCurrentDatasetKey();

            this.showDefaultDatasetLoading('正在加载默认数据集...');
            this.loadDefaultDataset((percent, message) => {
                this.updateDefaultDatasetProgress(percent, message);
            }).then(defaultRows => {
                DEFAULT_ROWS = defaultRows;

                // 确保默认数据集存在于列表；仅首次（无存储数据）时写入初始数据
                const list = App.storage.getDatasetList();
                const storedDefault = App.storage.getJSON(App.constants.DEFAULT_STORAGE_KEY, null);
                const hasStored = storedDefault !== null;
                if (!list.includes(App.constants.DEFAULT_STORAGE_KEY)) {
                    App.storage.addDatasetKey(App.constants.DEFAULT_STORAGE_KEY);
                }
                if (!hasStored) {
                    App.storage.setJSON(App.constants.DEFAULT_STORAGE_KEY, DEFAULT_ROWS);
                }

                // 竞态防护：用户已切换数据集则不更新界面
                if (App.storage.loadCurrentDatasetKey() !== loadStartKey) {
                    this.hideDefaultDatasetLoading();
                    return;
                }

                const currentKey = App.storage.loadCurrentDatasetKey();
                if (currentKey === App.constants.DEFAULT_STORAGE_KEY) {
                    // 已有用户数据：保留 state.rows（不覆盖），仅更新保护基准；
                    // 无有效存储数据：用初始数据填充界面
                    const validStored = hasStored && Array.isArray(storedDefault) &&
                        storedDefault.length > 0 && storedDefault[0] && Array.isArray(storedDefault[0].data);
                    if (!validStored) {
                        App.state.rows = DEFAULT_ROWS.map(row => ({
                            name: row.name,
                            data: row.data.map(App.utils.normalizeCell)
                        }));
                        App.datasetManager.saveData();
                    } else if (!App.state.rows.length) {
                        App.state.rows = storedDefault.map(row => ({
                            name: row.name,
                            data: row.data.map(App.utils.normalizeCell)
                        }));
                    }
                    App.tableRenderer.renderAllTables();
                    App.datasetManager.saveBaseline();
                    App.datasetManager.updateLockedUI();
                }

                this.hideDefaultDatasetLoading();
                App.modal.showTemporaryHint('默认数据集加载完成', 'success');
            }).catch(err => {
                console.warn('默认数据集加载失败', err);
                // 失败处理：绝不覆盖已有本地数据
                const hasStored = App.storage.getJSON(App.constants.DEFAULT_STORAGE_KEY, null) !== null;
                if (hasStored) {
                    // 已有本地数据：以本地数据为基准，保留用户数据
                    DEFAULT_ROWS = App.storage.getJSON(App.constants.DEFAULT_STORAGE_KEY);
                } else {
                    // 首次运行且加载失败：使用空模板展示，但不覆盖任何数据
                    DEFAULT_ROWS = App.dataModel.createInitialRows();
                }
                const list = App.storage.getDatasetList();
                if (!list.includes(App.constants.DEFAULT_STORAGE_KEY)) {
                    App.storage.addDatasetKey(App.constants.DEFAULT_STORAGE_KEY);
                }

                if (App.storage.loadCurrentDatasetKey() !== loadStartKey) {
                    this.hideDefaultDatasetLoading();
                    return;
                }

                const currentKey = App.storage.loadCurrentDatasetKey();
                if (currentKey === App.constants.DEFAULT_STORAGE_KEY) {
                    App.state.rows = DEFAULT_ROWS.map(row => ({
                        name: row.name,
                        data: row.data.map(App.utils.normalizeCell)
                    }));
                    App.tableRenderer.renderAllTables();
                    App.datasetManager.saveBaseline();
                    App.datasetManager.updateLockedUI();
                }
                this.hideDefaultDatasetLoading();
                App.modal.showTemporaryHint(
                    hasStored ? '默认数据加载失败，已保留本地数据' : '默认数据集加载失败，已使用空数据',
                    'error'
                );
            });
        }
    };

})(window.App = window.App || {});