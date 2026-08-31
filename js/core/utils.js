/**
 * utils.js - 通用工具函数（纯函数与轻量 DOM 辅助）
 * 挂载到 App.utils
 *
 * 本模块提供一系列通用工具函数，包括：
 * - 单元格数据标准化
 * - 数字与数组处理
 * - 列索引与名称转换
 * - 下拉框交互增强（滚轮切换、数字过滤）
 * - 下拉框选项填充
 * - HTML 转义
 * - 图片数据转换（base64 / Blob / DataURL）
 * - 数组洗牌
 * - 颜色格式转换（HEX、RGB、CMYK、HSL）
 *
 * 这些函数被多个功能模块调用，保持无状态、无副作用（除 DOM 辅助外），
 * 方便复用和测试。
 */
(function (App) {
    'use strict';

    App.utils = {
        /**
         * 标准化单元格数据为完整对象
         * @param {Object|string|number} cell - 原始单元格数据
         * @returns {{v: string, t: number, a: number, note: {text: string, images: string[]}}}
         *
         * 作用：将各种格式的单元格数据统一转换为标准对象格式。
         * - 如果已经是完整对象（包含 v、t、a），则补齐 note 字段。
         * - 如果只是字符串或数字，则包装为标准对象，并设置 t、a 为 0。
         * - 其他情况返回一个空的标准单元格对象。
         */
        normalizeCell(cell) {
            // 情况1：已经是对象且包含必要字段
            if (typeof cell === 'object' && cell !== null && 'v' in cell && 't' in cell && 'a' in cell) {
                // 返回标准化新对象（不原地改写调用方数据）
                const t = Math.max(0, Number(cell.t) || 0);
                const a = Math.min(Math.max(0, Number(cell.a) || 0), t); // 夹紧 0 <= a <= t
                // note 必须为非数组对象，images 逐项过滤为字符串
                const noteRaw = cell.note;
                const note = (!noteRaw || Array.isArray(noteRaw) || typeof noteRaw !== 'object')
                    ? { text: '', images: [] }
                    : {
                        text: typeof noteRaw.text === 'string' ? noteRaw.text : '',
                        images: Array.isArray(noteRaw.images)
                            ? noteRaw.images.filter(img => typeof img === 'string')
                            : []
                      };
                return {
                    v: typeof cell.v === 'string' ? cell.v
                        : (cell.v === undefined || cell.v === null ? '' : String(cell.v)),
                    t,
                    a,
                    note
                };
            }
            // 情况2：字符串或数字（旧版数据）
            if (typeof cell === 'string' || typeof cell === 'number') {
                return {
                    v: cell === '' ? '' : String(cell), // 数值转为字符串，空值保持空
                    t: 0,
                    a: 0,
                    note: { text: '', images: [] }
                };
            }
            // 情况3：其他无效值，返回空单元格
            return { v: '', t: 0, a: 0, note: { text: '', images: [] } };
        },

        /**
         * 解析三位数字字符串
         * @param {string} val - 输入字符串
         * @returns {number[]|null} 成功返回三个数字组成的数组，失败返回 null
         *
         * 作用：判断字符串是否恰好为三位数字，如果是则转换为数字数组。
         */
        parseTriple(val) {
            const s = String(val).trim();  // 去除首尾空格
            return /^\d{3}$/.test(s) ? s.split('').map(Number) : null;
        },

        /**
         * 计算数组元素之和
         * @param {number[]} arr - 数字数组
         * @returns {number} 所有元素之和
         */
        calcSum(arr) {
            return arr.reduce((a, b) => a + b, 0);
        },

        /**
         * 根据词条组索引和副属性索引计算全局列索引
         * @param {number} groupIdx - 词条组索引（0~13）
         * @param {number} subIdx - 副属性索引（0~4）
         * @returns {number} 全局列索引（0-69）
         *
         * 作用：将局部的（组索引，副属性索引）转换为全局的列位置。
         * 每个词条组有5个副属性，因此全局列索引 = 前面所有组的副属性总数 + 当前副属性索引。
         */
        getColumnIndex(groupIdx, subIdx) {
            const groups = App.constants.ALL_GROUPS;
            // 越界防护：非法组索引返回 -1，由调用方处理
            if (groupIdx < 0 || groupIdx >= groups.length) return -1;
            let col = 0;
            // 累加之前所有组的副属性数量
            for (let i = 0; i < groupIdx; i++) col += groups[i].sub.length;
            // 加上当前组内的副属性索引
            return col + subIdx;
        },

        /**
         * 获取单元格的名称信息
         * @param {number} rowIdx - 行索引
         * @param {number} colIndex - 全局列索引
         * @returns {{rowName: string, groupName: string, subName: string}}
         *
         * 作用：根据行索引和全局列索引，解析出该单元格对应的行名、词条组名、副属性名。
         */
        getCellNames(rowIdx, colIndex) {
            const groups = App.constants.ALL_GROUPS;
            const rowNames = App.constants.ROW_NAMES;
            // 越界防护：非法行列统一返回占位符
            if (rowIdx < 0 || rowIdx >= rowNames.length || colIndex < 0) {
                return { rowName: '?', groupName: '?', subName: '?' };
            }
            let groupIdx = 0;
            let remaining = colIndex;
            // 找到所属的词条组
            for (let i = 0; i < groups.length; i++) {
                const subLen = groups[i].sub.length;
                if (remaining < subLen) {
                    return {
                        rowName: rowNames[rowIdx] || '?',
                        groupName: groups[i].name,
                        subName: groups[i].sub[remaining] || '?'
                    };
                }
                remaining -= subLen;
            }
            // 如果超出范围，返回占位符
            return { rowName: rowNames[rowIdx] || '?', groupName: '?', subName: '?' };
        },

        /**
         * 启用下拉框滚轮切换选项
         * @param {HTMLSelectElement} el - 下拉框元素
         *
         * 作用：在下拉框上滚动鼠标滚轮时，自动切换选中项，并触发 change 事件。
         * 滚轮向上选择前一项，向下选择后一项，循环切换。
         */
        enableWheelSelect(el) {
            el.addEventListener('wheel', function (e) {
                e.preventDefault();  // 阻止页面滚动
                const opts = this.options;
                if (!opts.length) return;
                // 计算新的索引：滚轮向下（deltaY > 0）加1，否则减1
                let idx = this.selectedIndex + (e.deltaY > 0 ? 1 : -1);
                // 循环处理边界
                if (idx < 0) idx = opts.length - 1;
                else if (idx >= opts.length) idx = 0;
                this.selectedIndex = idx;
                // 手动触发 change 事件，通知其他监听器
                this.dispatchEvent(new Event('change', { bubbles: true }));
            }, { passive: false }); // 需要 preventDefault，因此不能使用 passive
        },

        /**
         * 为单个字符输入框启用滚轮增减和数字过滤
         * @param {HTMLInputElement} inputEl - 输入框元素
         *
         * 作用：
         * 1. 滚轮上下调整数字（1~9循环）
         * 2. 输入时过滤非数字字符，并限制只能输入1位
         */
        enableTripleInputScroll(inputEl) {
            // 滚轮增减
            inputEl.addEventListener('wheel', function (e) {
                e.preventDefault();
                let num = parseInt(this.value, 10);
                // 如果为空或0，根据滚动方向设置默认值
                if (isNaN(num) || num === 0) {
                    num = e.deltaY > 0 ? 9 : 1;
                } else {
                    // 向下滚动减1，向上滚动加1，循环1~9
                    num = e.deltaY > 0 ? (num === 1 ? 9 : num - 1) : (num === 9 ? 1 : num + 1);
                }
                this.value = num;
                // 触发 input 事件
                this.dispatchEvent(new Event('input', { bubbles: true }));
            }, { passive: false });

            // 过滤输入：只保留数字，且最多1位
            inputEl.addEventListener('input', function () {
                this.value = this.value.replace(/\D/g, '').slice(0, 1);
            });
        },

        /**
         * 重置三个输入框为默认值 '1'
         *
         * 作用：数据输入面板中的三个三联输入框恢复初始值。
         */
        resetTripleInputs() {
            const dom = App.dom;
            dom.inputVal1.value = '1';
            dom.inputVal2.value = '1';
            dom.inputVal3.value = '1';
        },

        /**
         * 填充所有下拉框选项
         *
         * 作用：初始化数据输入面板和录入面板中的行名、词条组下拉框，
         * 并根据第一个词条组更新副属性下拉框。
         */
        populateDropdowns() {
            const dom = App.dom;
            const rowNames = App.constants.ROW_NAMES;
            const groups = App.constants.ALL_GROUPS;
            // 生成行名选项 HTML
            const rowOpts = rowNames.map((n, i) => `<option value="${i}">${n}</option>`).join('');
            // 生成词条组选项 HTML
            const groupOpts = groups.map((g, i) => `<option value="${i}">${g.name}</option>`).join('');
            // 填充到数据输入面板
            dom.inputRow.innerHTML = rowOpts;
            dom.inputGroup.innerHTML = groupOpts;
            // 填充到录入面板
            dom.recordRow.innerHTML = rowOpts;
            dom.recordGroup.innerHTML = groupOpts;
            // 更新副属性下拉框（默认第一个组）
            this.updateSubColOptions(0);
            this.updateRecordSubColOptions(0);
        },

        /**
         * 更新数据输入面板的副属性下拉框
         * @param {number} groupIdx - 词条组索引
         *
         * 作用：根据选中的词条组，更新其对应的副属性选项。
         */
        updateSubColOptions(groupIdx) {
            const dom = App.dom;
            const groups = App.constants.ALL_GROUPS;
            dom.inputSubCol.innerHTML = groups[groupIdx].sub
                .map((s, i) => `<option value="${i}">${s}</option>`).join('');
        },

        /**
         * 更新录入面板的副属性下拉框
         * @param {number} groupIdx - 词条组索引
         *
         * 作用：根据选中的词条组，更新录入面板的副属性选项。
         */
        updateRecordSubColOptions(groupIdx) {
            const dom = App.dom;
            const groups = App.constants.ALL_GROUPS;
            dom.recordSubCol.innerHTML = groups[groupIdx].sub
                .map((s, i) => `<option value="${i}">${s}</option>`).join('');
        },

        /**
         * 转义 HTML 特殊字符
         * @param {string} text - 原始文本
         * @returns {string} 转义后的 HTML 字符串
         *
         * 作用：防止用户输入的备注文本被当作 HTML 解析，确保安全显示。
         * 实现方式：利用 DOM 元素的 textContent 自动转义。
         */
        escapeHtml(text) {
            if (text === undefined || text === null) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        },

        /**
         * 将 base64 Data URL 转换为 Blob
         * @param {string} base64 - Data URL 或纯 base64 字符串
         * @returns {Blob} 二进制数据对象
         *
         * 作用：用于导出 ZIP 时将图片数据写入文件。
         */
        base64ToBlob(base64) {
            try {
                const parts = String(base64).split(',');
                // 提取 MIME 类型
                const mimeMatch = parts[0] && parts[0].match(/:(.*?);/);
                const contentType = (mimeMatch && mimeMatch[1]) || 'application/octet-stream';
                // 解码 base64 数据
                const raw = atob(parts[1] || parts[0]);
                const array = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) {
                    array[i] = raw.charCodeAt(i);
                }
                return new Blob([array], { type: contentType });
            } catch (e) {
                console.warn('base64ToBlob 失败，已跳过该图片:', e);
                return null; // 非法 base64 返回 null，由调用方决定跳过
            }
        },

        /**
         * 将 Blob 转换为 Data URL
         * @param {Blob} blob - 二进制数据
         * @returns {Promise<string>} 解析为 Data URL 的 Promise
         *
         * 作用：用于导入 ZIP 时将图片 Blob 转回 base64 格式。
         */
        blobToDataURL(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },

        /**
         * 从 base64 Data URL 获取图片扩展名
         * @param {string} base64 - Data URL
         * @returns {string} 扩展名（如 'png'、'webp'）
         *
         * 作用：导出图片时根据 MIME 类型确定文件扩展名。
         */
        getImageExtension(base64) {
            const match = base64.match(/^data:image\/(\w+);base64,/);
            return match ? match[1] : 'png';
        },

        /**
         * 数组洗牌（Fisher-Yates 算法）
         * @param {Array} arr - 需要打乱顺序的数组
         * @returns {Array} 洗牌后的数组（原地修改并返回）
         *
         * 作用：颜色预览时随机分配单元格状态。
         */
        shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        },

        // ==================== 颜色转换工具 ====================

        /**
         * HEX 转 RGB
         * @param {string} hex - 十六进制颜色（如 "#c8e6c9"）
         * @returns {{r: number, g: number, b: number}}
         */
        hexToRgb(hex) {
            let h = String(hex || '').replace('#', '');
            // 支持 3 位简写（#abc → #aabbcc）
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            const v = parseInt(h, 16);
            if (isNaN(v) || h.length !== 6) return { r: 0, g: 0, b: 0 };
            return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
        },

        /**
         * RGB 转 HEX
         * @param {number} r - 红（0-255）
         * @param {number} g - 绿（0-255）
         * @param {number} b - 蓝（0-255）
         * @returns {string} 十六进制颜色（如 "#c8e6c9"）
         */
        rgbToHex(r, g, b) {
            // 分量钳制到 0-255，防止越界值产生错误颜色
            const clamp = (v) => Math.min(255, Math.max(0, Math.round(Number(v) || 0)));
            r = clamp(r); g = clamp(g); b = clamp(b);
            return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },

        /**
         * RGB 转 CMYK
         * @param {number} r - 红（0-255）
         * @param {number} g - 绿（0-255）
         * @param {number} b - 蓝（0-255）
         * @returns {{c: number, m: number, y: number, k: number}} CMYK 值（0-100）
         */
        rgbToCmyk(r, g, b) {
            let c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255;
            let k = Math.min(c, m, y);
            if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
            c = Math.round(((c - k) / (1 - k)) * 100);
            m = Math.round(((m - k) / (1 - k)) * 100);
            y = Math.round(((y - k) / (1 - k)) * 100);
            k = Math.round(k * 100);
            return { c, m, y, k };
        },

        /**
         * CMYK 转 RGB
         * @param {number} c - 青（0-100）
         * @param {number} m - 品红（0-100）
         * @param {number} y - 黄（0-100）
         * @param {number} k - 黑（0-100）
         * @returns {{r: number, g: number, b: number}}
         */
        cmykToRgb(c, m, y, k) {
            c /= 100; m /= 100; y /= 100; k /= 100;
            return {
                r: Math.round(255 * (1 - c) * (1 - k)),
                g: Math.round(255 * (1 - m) * (1 - k)),
                b: Math.round(255 * (1 - y) * (1 - k))
            };
        },

        /**
         * RGB 转 HSL
         * @param {number} r - 红（0-255）
         * @param {number} g - 绿（0-255）
         * @param {number} b - 蓝（0-255）
         * @returns {{h: number, s: number, l: number}} HSL 值（h: 0-360, s/l: 0-100）
         */
        rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s;
            const l = (max + min) / 2;
            if (max === min) {
                h = s = 0; // 无色相
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
        },

        /**
         * HSL 转 RGB
         * @param {number} h - 色相（0-360）
         * @param {number} s - 饱和度（0-100）
         * @param {number} l - 亮度（0-100）
         * @returns {{r: number, g: number, b: number}}
         */
        hslToRgb(h, s, l) {
            s /= 100; l /= 100;
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;
            let r, g, b;
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }
            return {
                r: Math.round((r + m) * 255),
                g: Math.round((g + m) * 255),
                b: Math.round((b + m) * 255)
            };
        }
    };

})(window.App = window.App || {});