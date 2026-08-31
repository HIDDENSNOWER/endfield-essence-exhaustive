/**
 * dataset-remark.js - 数据集级备注
 * 挂载到 App.datasetRemark
 *
 * 本模块负责数据集备注的显示与编辑：
 * - updateDatasetRemark：根据当前数据集更新备注的显示或编辑状态
 * - saveRemarkFromInput：从输入框保存备注内容
 * - autoResizeRemark：自动调整备注输入框高度以适应内容
 * - bindDatasetRemarkEvents：绑定备注编辑相关事件
 *
 * 特殊规则：
 * - 默认数据集和示例数据集的备注为固定内容，不可编辑
 * - 其他数据集的备注可自由编辑，最长 550 字
 * - 备注通过 localStorage 存储，键为数据集名称
 */
(function (App) {
    'use strict';

    App.datasetRemark = {
        /**
         * 更新数据集备注显示/编辑状态
         *
         * 根据当前数据集类型（默认、示例、普通）决定备注区域显示为：
         * - 固定文本（默认/示例数据集）：只读展示，不可编辑
         * - 已有备注（普通数据集）：可点击编辑
         * - 无备注（普通数据集）：显示输入框供输入
         *
         * 同时更新字符计数器。
         */
        updateDatasetRemark() {
            const dom = App.dom;
            const textarea = dom.datasetRemarkInput;
            const display = dom.datasetRemarkDisplay;
            const charCount = dom.remarkCharCount;

            // 先重置状态：移除可编辑标记，隐藏展示区和输入框
            display.classList.remove('editable');
            display.style.display = 'none';
            textarea.style.display = 'none';

            const currentKey = App.storage.loadCurrentDatasetKey();
            let fixedRemark = '';

            // 检查是否是默认数据集或示例数据集，它们有固定备注
            if (currentKey === App.constants.DEFAULT_STORAGE_KEY) {
                fixedRemark = App.constants.DEFAULT_REMARK;
            } else if (currentKey === App.constants.SAMPLE_DATASET_KEY) {
                fixedRemark = App.constants.SAMPLE_REMARK;
            }

            // 如果是固定备注，显示为只读文本，更新字数，结束函数
            if (fixedRemark) {
                display.textContent = fixedRemark;
                display.style.display = 'block';
                if (charCount) charCount.textContent = fixedRemark.length;
                return;
            }

            // 普通数据集：读取存储的备注
            const storedRemark = App.storage.getDatasetRemarks()[currentKey] || '';
            if (storedRemark) {
                // 已有备注：显示为可编辑的文本
                display.textContent = storedRemark;
                display.classList.add('editable');
                display.style.display = 'block';
                if (charCount) charCount.textContent = storedRemark.length;
            } else {
                // 无备注：显示输入框，清空内容
                textarea.value = '';
                textarea.style.display = 'block';
                if (charCount) charCount.textContent = '0';
            }
        },

        /**
         * 从输入框保存数据集备注
         *
         * - 去除首尾空格，限制最大长度 550 字
         * - 只对普通数据集保存（默认/示例数据集不保存）
         * - 保存后刷新备注显示状态
         */
        saveRemarkFromInput() {
            const textarea = App.dom.datasetRemarkInput;
            let val = textarea.value.trim();

            // 长度限制
            if (val.length > 550) {
                val = val.substring(0, 550);
                textarea.value = val;
            }

            const currentKey = App.storage.loadCurrentDatasetKey();
            // 只有普通数据集才保存备注
            if (currentKey !== App.constants.DEFAULT_STORAGE_KEY && currentKey !== App.constants.SAMPLE_DATASET_KEY) {
                const remarks = App.storage.getDatasetRemarks();
                if (val) {
                    remarks[currentKey] = val;
                } else {
                    delete remarks[currentKey]; // 空备注则删除键
                }
                App.storage.saveDatasetRemarks(remarks);
            }
            // 更新显示状态
            this.updateDatasetRemark();
        },

        /**
         * 自动调整数据集备注输入框高度
         *
         * 根据内容高度动态调整 textarea 高度，避免出现滚动条。
         */
        autoResizeRemark() {
            const textarea = App.dom.datasetRemarkInput;
            textarea.style.height = 'auto'; // 先重置，以便正确计算内容高度
            textarea.style.height = textarea.scrollHeight + 'px'; // 设置为内容实际高度
        },

        /**
         * 绑定数据集备注编辑事件
         * 由 events.js 统一调用
         */
        bindDatasetRemarkEvents() {
            const dom = App.dom;

            // 输入框失焦时保存
            dom.datasetRemarkInput.addEventListener('blur', () => this.saveRemarkFromInput());

            // 输入框按键处理：Enter 保存（Shift+Enter 换行）
            dom.datasetRemarkInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();   // 阻止默认换行
                    this.blur();          // 触发失焦保存
                }
            });

            // 输入时更新字符计数并自动调整高度
            dom.datasetRemarkInput.addEventListener('input', function () {
                if (dom.remarkCharCount) {
                    dom.remarkCharCount.textContent = this.value.length;
                }
                App.datasetRemark.autoResizeRemark();
            });

            // 点击可编辑的备注展示区时切换到编辑模式
            dom.datasetRemarkDisplay.addEventListener('click', function () {
                if (!this.classList.contains('editable')) return; // 不可编辑则忽略
                this.style.display = 'none';                      // 隐藏展示区
                const textarea = dom.datasetRemarkInput;
                textarea.value = this.textContent;                // 复制内容到输入框
                textarea.style.display = 'block';                 // 显示输入框
                textarea.focus();                                 // 聚焦
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px'; // 自动调整高度
            });
        }
    };

})(window.App = window.App || {});