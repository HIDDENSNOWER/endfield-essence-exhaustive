/**
 * main.js - 应用初始化与布局管理
 * 挂载到 App.main 和 App.layout
 */
(function (App) {
    'use strict';

    // 全局变量 DEFAULT_ROWS 用于默认数据集基准
    window.DEFAULT_ROWS = null;

    // 布局管理
    App.layout = {
        switchPanel(panelName) {
            if (App.state.leftPanel !== 'table') return;

            // v0.9.2：切换面板时清除高亮，避免残留
            if (App.cellHighlighter) App.cellHighlighter.clear();
            if (App.unacquired) App.unacquired._hoveredLi = null;
            if (App.regionManager) App.regionManager._hoveredCard = null;

            App.state.activePanel = panelName;
            const dom = App.dom;
            dom.sidebarBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.panel === panelName);
            });
            dom.inputPanel.classList.toggle('active-panel', panelName === 'input');
            dom.statsPanel.classList.toggle('active-panel', panelName === 'stats');
            dom.recordPanel.classList.toggle('active-panel', panelName === 'record');
            dom.unacquiredPanel.classList.toggle('active-panel', panelName === 'unacquired'); // ← 新增
            dom.regionPanel.classList.toggle('active-panel', panelName === 'region');         // ← 新增
            if (panelName === 'stats') App.stats.renderStats();
            if (panelName === 'unacquired') {
                App.unacquired.renderRegionFilter();  // ← 新增
                App.unacquired.renderList();
            }
            if (panelName === 'region') App.regionManager.renderList();                        // ← 新增
            App.tableRenderer.updateHighlightedCell();
        },

        switchLeftPanel(panelName) {
            App.state.leftPanel = panelName;
            const dom = App.dom;
            dom.leftSidebarBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.leftPanel === panelName);
            });

            const tableArea = dom.tableArea;
            const rightSidebar = document.getElementById('sidebar');
            const panelContainer = dom.panelContainer;
            const emptyPage = dom.emptyPage;

            if (panelName === 'table') {
                tableArea.style.display = '';
                rightSidebar.style.display = '';
                panelContainer.style.display = '';
                emptyPage.style.display = 'none';
                this.switchPanel(App.state.activePanel);
            } else if (panelName === 'empty') {
                tableArea.style.display = 'none';
                rightSidebar.style.display = 'none';
                panelContainer.style.display = 'none';
                emptyPage.style.display = 'flex';
            }
        }
    };

    function restoreRightPanelState() {
        const collapsed = App.storage.loadRightCollapsed();
        const collapseIcon = document.getElementById('icon-panel-collapse');
        const expandIcon = document.getElementById('icon-panel-expand');
        if (collapsed) {
            App.state.rightPanelCollapsed = true;
            document.querySelector('.main-layout').classList.add('right-collapsed');
            if (collapseIcon) collapseIcon.style.display = 'none';
            if (expandIcon) expandIcon.style.display = 'inline';
            if (App.dom.btnToggleRightPanel) App.dom.btnToggleRightPanel.title = '展开面板';
        } else {
            if (collapseIcon) collapseIcon.style.display = 'inline';
            if (expandIcon) expandIcon.style.display = 'none';
            if (App.dom.btnToggleRightPanel) App.dom.btnToggleRightPanel.title = '折叠面板';
        }
    }

    function safeCall(fn, label) {
        try {
            fn();
        } catch (e) {
            console.error(`[初始化错误] ${label}:`, e);
        }
    }

    async function init() {
        // 1. 初始化 DOM 缓存
        safeCall(() => App.initDomCache(), 'DOM缓存初始化');

        // 2. 初始化状态
        safeCall(() => {
            App.state.rows = App.dataModel.createInitialRows();
        }, '状态初始化');

        // 3. 加载主题
        safeCall(() => App.theme.loadTheme(), '主题加载');

        // 3.5 初始化界面颜色（新增）
        safeCall(() => {
            if (App.interfaceColors && App.interfaceColors.applyCurrentTheme) {
                App.interfaceColors.applyCurrentTheme();
            }
        }, '界面颜色初始化');

        // 4. 确保示例数据集存在
        safeCall(() => {
            const list = App.storage.getDatasetList();
            if (!list.includes(App.constants.SAMPLE_DATASET_KEY)) {
                App.storage.addDatasetKey(App.constants.SAMPLE_DATASET_KEY);
                App.storage.setJSON(App.constants.SAMPLE_DATASET_KEY, App.dataModel.createSampleRows());
            }
        }, '示例数据集初始化');

        // 5. 加载当前数据集
        safeCall(() => {
            const currentKey = App.storage.loadCurrentDatasetKey();
            App.storage.saveCurrentDatasetKey(currentKey);
            if (!App.datasetManager.loadData()) {
                App.state.rows = App.dataModel.createInitialRows();
                App.datasetManager.saveData();
            }
        }, '数据集加载');

        // 5.5 渲染数据集切换下拉框
        safeCall(() => App.datasetManager.updateDatasetSelect(), '数据集下拉框渲染');

        // 6. 填充下拉框
        safeCall(() => App.utils.populateDropdowns(), '下拉框填充');

        // 7. 重置三联输入框为默认值 '1'
        safeCall(() => App.utils.resetTripleInputs(), '三联输入框重置');

        // 8. 初始化表格样式
        safeCall(() => App.tableStyle.initTableStyle(), '表格样式初始化');

        // 9. 初始化备注功能
        safeCall(() => App.note.initNoteFeature(), '备注功能初始化');

        // 9.5 初始化可获取地点提示悬浮窗（新增）
        safeCall(() => App.cellAcquireTooltip.init(), '可获取地点提示初始化');

        // 10. 渲染表格
        safeCall(() => App.tableRenderer.renderAllTables(), '表格渲染');

        // 11. 初始化单元格提示栏
        safeCall(() => App.cellTooltip.initCellTooltip(), '单元格提示栏初始化');

        // 12. 初始化数据集备注显示
        safeCall(() => App.datasetRemark.updateDatasetRemark(), '数据集备注初始化');

        // 13. 更新保护状态 UI
        safeCall(() => App.datasetManager.updateLockedUI(), '保护状态UI更新');

        // 14. 恢复右侧面板折叠状态
        safeCall(() => restoreRightPanelState(), '右侧面板状态恢复');

        // 15. 绑定所有事件
        safeCall(() => App.events.bindAllEvents(), '事件绑定');

        // 16. 切换到数据管理面板（确保初始状态）
        safeCall(() => App.layout.switchPanel('input'), '初始面板切换');

        // 17. 更新提示
        safeCall(() => { if (App.dom.inputHint) App.dom.inputHint.textContent = '准备就绪'; }, '提示更新');

        // 18. 首次访问显示关于弹窗，之后加载默认数据集
        safeCall(() => {
            const aboutShown = sessionStorage.getItem('smarttable_about_shown');
            if (!aboutShown && App.dom.modalVersionInfo) {
                App.modal.openModal(App.dom.modalVersionInfo);
                sessionStorage.setItem('smarttable_about_shown', '1');
                const startOnClose = () => App.defaultLoader.startLoadingDefaultDataset();
                App.dom.btnCloseVersionInfo.addEventListener('click', startOnClose);
                App.dom.btnConfirmVersionInfo.addEventListener('click', startOnClose);
                App.dom.modalVersionInfo.addEventListener('click', function (e) {
                    if (e.target === App.dom.modalVersionInfo) {
                        startOnClose();
                    }
                });
            } else {
                App.defaultLoader.startLoadingDefaultDataset();
            }
        }, '默认数据集加载启动');

        // 版本检测（放在 init 函数末尾，所有初始化完成后）
        safeCall(() => {
            fetch('version.json?t=' + Date.now())
                .then(res => res.json())
                .then(data => {
                    const remoteVersion = data.version;
                    const localVersion = localStorage.getItem('eee_app_version');
                    if (localVersion !== remoteVersion) {
                        localStorage.setItem('eee_app_version', remoteVersion);
                        if (localVersion) {
                            // 已有旧版本，提示刷新
                            App.modal.showConfirmDialog(
                                '检测到新版本，是否立即刷新以获取最新内容？',
                                () => location.reload(),
                                () => {},
                                '更新提示',
                                '刷新',
                                '稍后'
                            );
                        }
                    }
                })
                .catch(() => { /* 网络错误忽略 */ });
        }, '版本检测');
            }

    // 启动应用
    init();

})(window.App = window.App || {});