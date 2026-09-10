/**
 * image-store.js - IndexedDB 图片存储封装
 * 挂载到 App.imageStore
 *
 * 背景：
 *   localStorage 容量通常仅 5~10MB，存放 base64 图片极易耗尽空间。
 *   IndexedDB 容量远大于 localStorage（通常为磁盘可用空间的一半以上），
 *   且支持 Blob/二进制存储，可绕过 base64 体积膨胀，因此将图片迁移至此。
 *
 * 设计：
 *   - 数据库名 eee_image_db，对象仓库名 images
 *   - 每条记录 { id: string, blob: Blob }
 *   - 对外仅暴露 saveImage / getImage / deleteImage / getImageUrl 四个方法
 *   - 所有操作均返回 Promise，调用方须使用 async/await
 */
(function (App) {
    'use strict';

    // 数据库名与对象仓库名
    const DB_NAME = 'eee_image_db';
    const STORE_NAME = 'images';
    const DB_VERSION = 1; // 数据库版本，首次创建时为 1

    // 缓存打开的数据库连接，避免重复 openDB 造成性能浪费
    let dbPromise = null;

    /**
     * 打开 IndexedDB 数据库（若未打开则创建连接并缓存）
     * @returns {Promise<IDBDatabase>}
     */
    function openDB() {
        // 已有连接直接复用
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            // 数据库首次创建或版本升级时触发
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // 确保对象仓库存在（键路径为 id）
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    App.imageStore = {
        /**
         * 保存图片 Blob，返回图片 ID（字符串）
         * @param {Blob} blob - 图片二进制数据
         * @returns {Promise<string>} 图片 ID，形如 "img_1699999999999_ab12cd"
         */
        async saveImage(blob) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);

                // 生成唯一 ID：时间戳 + 随机字符串
                const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const record = { id, blob };

                const request = store.put(record);
                request.onsuccess = () => resolve(id);
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * 根据图片 ID 获取 Blob
         * @param {string} id - 图片 ID
         * @returns {Promise<Blob|null>} 存在则返回 Blob，不存在返回 null
         */
        async getImage(id) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(id);

                request.onsuccess = () => {
                    // 记录不存在时 request.result 为 undefined
                    resolve(request.result ? request.result.blob : null);
                };
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * 删除指定图片
         * @param {string} id - 图片 ID
         * @returns {Promise<void>}
         */
        async deleteImage(id) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * 将图片 ID 转换为 Blob URL（用于 <img> 显示）
         * @param {string} id - 图片 ID
         * @returns {Promise<string>} Blob URL，若图片不存在则返回空字符串
         *
         * 注意：Blob URL 使用后应调用 URL.revokeObjectURL 释放内存，
         *       但本项目显示场景下为简化处理，暂不主动回收。
         */
        async getImageUrl(id) {
            const blob = await this.getImage(id);
            return blob ? URL.createObjectURL(blob) : '';
        },

        /**
         * 关闭数据库连接（用于清除缓存场景）
         * 关闭后下次调用其他方法会自动重新打开
         * @returns {Promise<void>}
         */
        async closeDB() {
            if (!dbPromise) return;
            try {
                const db = await dbPromise;
                db.close();
            } catch (e) {
                // 忽略关闭异常
            }
            dbPromise = null;
        }
    };
})(window.App = window.App || {});