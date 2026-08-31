/**
 * cell-tooltip.js - 单元格悬停提示栏
 * 挂载到 App.cellTooltip
 *
 * 本模块负责表格顶部提示栏的交互逻辑：
 * - 当鼠标悬停或点击某个单元格时，在提示栏显示该单元格的详细信息
 * - 根据设备是否支持悬停，显示不同的默认提示文字
 * - 鼠标移出后延迟恢复默认提示
 *
 * 提示内容根据单元格类型动态生成：
 * - 实装基质：显示拥有数/重复数，以及是否全部获取
 * - 普通数值：显示三位数值的分解含义（副属性、行、词条组）
 * - 空单元格：显示"无"
 */
(function (App) {
    'use strict';

    App.cellTooltip = {
        /**
         * 初始化单元格悬停提示栏
         *
         * 绑定表格区域的 mouseover、mouseout、click 事件，
         * 实现鼠标悬停或点击时更新提示栏内容。
         */
        initCellTooltip() {
            const dom = App.dom;

            // 判断设备是否支持悬停（桌面端支持，移动端不支持）
            const supportsHover = window.matchMedia('(hover: hover)').matches;
            // 根据设备类型设置默认提示文字
            const defaultText = supportsHover ? '鼠标悬停单元格查看详情' : '点击单元格查看详情';
            dom.cellTooltip.textContent = defaultText;

            // 用于延迟恢复默认提示的定时器
            let hoverTimeout;

            /**
             * 显示单元格详情
             * @param {HTMLTableCellElement} td - 目标单元格
             *
             * 读取单元格的 data-rowindex 和 data-colindex 属性，
             * 获取对应数据并生成提示文本，更新提示栏内容。
             */
            function showCellDetail(td) {
                const rowIndex = td.dataset.rowindex;
                const colIndex = td.dataset.colindex;
                // 如果没有数据索引，直接返回
                if (rowIndex === undefined || colIndex === undefined) return;

                const ri = parseInt(rowIndex);
                const ci = parseInt(colIndex);
                // 获取单元格数据和名称信息
                const cell = App.utils.normalizeCell(App.state.rows[ri].data[ci]);
                const names = App.utils.getCellNames(ri, ci);
                const v = cell.v;       // 数值
                const t = cell.t || 0;  // 重复数
                const a = cell.a || 0;  // 获取数

                let displayText = '';
                if (t > 0) {
                    // 实装基质：显示拥有/重复状态
                    const status = a < t ? `未全部获取，目前应差 ${t - a} 个` : '已全部获取';
                    displayText = `${names.subName} || ${names.rowName} || ${names.groupName} || 已实装基质： 拥有 ${a}/重复 ${t} || ${status}`;
                } else {
                    // 非实装基质
                    if (v && v.length === 3) {
                        // 三位数值：解析各维度含义
                        displayText = `${names.subName}-${v[0]} || ${names.rowName}-${v[1]} || ${names.groupName}-${v[2]} || 状态：当前为非实装基质`;
                    } else if (v !== '') {
                        // 非三位数值（异常情况）
                        displayText = `${v} || 状态：当前为非实装基质`;
                    } else {
                        // 空单元格
                        displayText = '无';
                    }
                }
                dom.cellTooltip.textContent = displayText;
                clearTimeout(hoverTimeout); // 取消延迟恢复
            }

            /**
             * 重置提示栏
             *
             * 延迟 200ms 恢复默认提示文字，避免鼠标快速划过时闪烁。
             */
            function resetTooltip() {
                hoverTimeout = setTimeout(() => {
                    dom.cellTooltip.textContent = defaultText;
                }, 200);
            }

            // 鼠标悬停
            dom.tableArea.addEventListener('mouseover', function (e) {
                const td = e.target.closest('td');
                if (td) showCellDetail(td);
            });

            // 鼠标移出
            dom.tableArea.addEventListener('mouseout', function (e) {
                const td = e.target.closest('td');
                if (td) resetTooltip();
            });

            // 点击（兼容移动端）
            dom.tableArea.addEventListener('click', function (e) {
                const td = e.target.closest('td');
                if (td) {
                    showCellDetail(td);
                } else {
                    // 点击空白区域恢复默认
                    clearTimeout(hoverTimeout);
                    dom.cellTooltip.textContent = defaultText;
                }
            });
        }
    };

})(window.App = window.App || {});