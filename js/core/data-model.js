/**
 * data-model.js - 数据模型工厂函数
 * 挂载到 App.dataModel
 *
 * 本模块负责创建和初始化数据结构：
 * - 单个单元格的元数据对象
 * - 一行（70列）的空数据
 * - 完整的12行初始数据（全空）
 * - 示例数据（随机填充部分单元格）
 *
 * 所有数据操作模块都依赖这些工厂函数来保证数据结构统一。
 */
(function (App) {
    'use strict';

    App.dataModel = {
        /**
         * 创建默认的单元格元数据
         * @returns {{v: string, t: number, a: number, note: {text: string, images: string[]}}}
         * 
         * 每个单元格包含：
         * - v: 基质数值（三位字符串，如 "123"），为空表示无数值
         * - t: 实装重复数（0 表示非实装基质）
         * - a: 已获取数（0 表示未获取）
         * - note: 备注对象，包含文本和图片列表
         */
        defaultCellMeta() {
            return {
                v: '',                          // 数值初始为空字符串
                t: 0,                           // 重复数初始为0
                a: 0,                           // 获取数初始为0
                note: {                         // 备注对象
                    text: '',                   // 备注文本为空
                    images: []                  // 备注图片数组为空
                }
            };
        },

        /**
         * 创建空行数据（70 列）
         * @returns {Array}
         * 
         * 总列数 = 14个词条组 × 每组5个副属性 = 70列
         * 使用 new Array(70) 创建长度为70的数组，
         * 每个元素都初始化为 defaultCellMeta() 的独立副本，
         * 避免多个单元格共享同一对象导致数据串扰。
         */
        createEmptyRowData() {
            // 创建70个空单元格，每个都是独立对象
            return new Array(70).fill(null).map(() => this.defaultCellMeta());
        },

        /**
         * 创建初始行数据（12 个提升项，每个含 70 列空数据）
         * @returns {Array<{name: string, data: Array}>}
         * 
         * 返回的数组包含12个对象，每个对象对应一个提升项（行名），
         * 其 data 属性为70列的空单元格数组。
         */
        createInitialRows() {
            const rowNames = App.constants.ROW_NAMES;   // 获取行名列表（12个）
            return rowNames.map(name => ({
                name: name,                              // 行名，如"攻击提升"
                data: this.createEmptyRowData()          // 该行的70个空单元格
            }));
        },

        /**
         * 生成示例数据（随机填充）
         * @returns {Array}
         * 
         * 用于"数据示例-表格样式参考"数据集。
         * 每个单元格有 40% 概率被填充，填充内容随机选择：
         * - 50% 概率：生成实装基质（t=1~3，a=0~t，v为空）
         * - 50% 概率：生成普通数值（v为三位数字，t=0，a=0）
         */
        createSampleRows() {
            const rows = this.createInitialRows();      // 先创建全空数据
            const rowCount = rows.length;               // 行数（12）
            const colCount = rows[0].data.length;       // 列数（70）
            const fillProbability = 0.4;                // 填充概率40%

            // 遍历每一行
            for (let r = 0; r < rowCount; r++) {
                // 遍历每一列
                for (let c = 0; c < colCount; c++) {
                    // 以40%概率决定是否填充当前单元格
                    if (Math.random() < fillProbability) {
                        const cell = rows[r].data[c];   // 获取当前单元格引用

                        // 再以50%概率决定填充类型
                        if (Math.random() < 0.5) {
                            // 类型1：实装基质
                            const t = Math.floor(Math.random() * 3) + 1; // 重复数1~3
                            const a = Math.floor(Math.random() * (t + 1)); // 获取数0~t
                            cell.t = t;
                            cell.a = a;
                            cell.v = '';                 // 实装基质无数值
                        } else {
                            // 类型2：普通数值
                            const d1 = Math.floor(Math.random() * 6) + 1; // 第一位1~6
                            const d2 = Math.floor(Math.random() * 6) + 1; // 第二位1~6
                            const d3 = Math.floor(Math.random() * 3) + 1; // 第三位1~3
                            cell.v = `${d1}${d2}${d3}`;  // 拼接为三位字符串
                            cell.t = 0;
                            cell.a = 0;
                        }
                    }
                }
            }
            return rows; // 返回填充后的示例数据
        }
    };

})(window.App = window.App || {});