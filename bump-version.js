#!/usr/bin/env node
/**
 * bump-version.js - 统一更新项目版本号
 * 用法：node bump-version.js 0.9.16   或   双击 bump-version.bat
 *
 * 更新目标（共 7 个文件）：
 *   1. version.json          - version + buildTime
 *   2. package.json          - "version" 字段
 *   3. js/core/migration.js  - CURRENT_VERSION 常量
 *   4. index.html            - 所有 ver.X.Y.Z
 *   5. README.md             - "**当前版本**：vX.Y.Z"
 *   6. ARCHITECTURE.md       - "适用版本：**vX.Y.Z**"
 *   7. package-lock.json     - 通过 npm install --package-lock-only 自动同步
 *                              （不再手动改 lock，避免被下次 npm install 覆盖）
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT = __dirname;

function validateVersion(v) {
    return /^\d+\.\d+\.\d+[a-z]?$/.test(v);
}

function run(newVersion) {
    let changedCount = 0;

    function updateFile(relPath, updater) {
        const fullPath = path.join(ROOT, relPath);
        if (!fs.existsSync(fullPath)) {
            console.warn('  - 跳过（不存在）：' + relPath);
            return;
        }
        const original = fs.readFileSync(fullPath, 'utf8');
        const updated = updater(original);
        if (original === updated) {
            console.log('  - 无变化：' + relPath);
            return;
        }
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log('  OK 已更新：' + relPath);
        changedCount++;
    }

    console.log('');
    console.log('============================================');
    console.log('  更新版本号 → ' + newVersion);
    console.log('============================================');
    console.log('');

    // 1. version.json（同时刷新 buildTime）
    updateFile('version.json', (content) => {
        const data = JSON.parse(content);
        data.version = newVersion;
        data.buildTime = new Date().toISOString();
        return JSON.stringify(data, null, 2) + '\n';
    });

    // 2. package.json — 只改顶层 "version" 字段，不误伤依赖版本
    updateFile('package.json', (content) => {
        return content.replace(
            /("version"\s*:\s*")\d+\.\d+\.\d+[a-z]?(")/,
            '$1' + newVersion + '$2'
        );
    });

    // 3. js/core/migration.js — 只改 CURRENT_VERSION 常量
    updateFile('js/core/migration.js', (content) => {
        return content.replace(
            /(const CURRENT_VERSION\s*=\s*')\d+\.\d+\.\d+[a-z]?(')/,
            '$1' + newVersion + '$2'
        );
    });

    // 4. index.html（所有 ver.X.Y.Z）
    updateFile('index.html', (content) => {
        return content.replace(/ver\.\d+\.\d+\.\d+[a-z]?/g, 'ver.' + newVersion);
    });

    // 5. README.md — 只改"**当前版本**：vX.Y.Z"，不误伤历史标注
    updateFile('README.md', (content) => {
        return content.replace(
            /(\*\*当前版本\*\*：)v\d+\.\d+\.\d+[a-z]?/g,
            '$1v' + newVersion
        );
    });

    // 6. ARCHITECTURE.md — 只改"适用版本：**vX.Y.Z**"
    updateFile('ARCHITECTURE.md', (content) => {
        return content.replace(
            /(适用版本：\*\*)v\d+\.\d+\.\d+[a-z]?/g,
            '$1v' + newVersion
        );
    });

    // 7. package-lock.json — 通过 npm 命令同步（不安装 node_modules）
    //
    // 设计理由：
    //   - package-lock.json 是 npm 生成物，不应手动编辑；下次 npm install 会覆盖
    //   - --package-lock-only 只刷 lock，不装 node_modules，通常 5~20 秒
    //   - 失败时降级为警告，不阻塞其他文件更新
    //   - Windows 下 npm 是 .cmd 包装器，需 shell 执行；用 shell: true 兼容
    try {
        console.log('  - 正在同步 package-lock.json ...');
        execSync('npm install --package-lock-only --silent', {
            cwd: ROOT,
            stdio: 'inherit',
            shell: true
        });
        console.log('  OK 已同步：package-lock.json');
        changedCount++;
    } catch (err) {
        console.warn('  ! 同步 package-lock.json 失败：' + (err.message || err));
        console.warn('    可手动执行：npm install --package-lock-only');
    }

    console.log('');
    console.log('共更新 ' + changedCount + ' 个文件，版本号 → ' + newVersion);
}

const argVersion = process.argv[2];

if (argVersion) {
    if (!validateVersion(argVersion)) {
        console.error('版本号格式不正确：' + argVersion);
        console.error('正确格式：数字.数字.数字（可带小写字母后缀）');
        process.exit(1);
    }
    run(argVersion);
} else {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('请输入新版本号x.x.x: ', (answer) => {
        const v = (answer || '').trim();
        rl.close();
        if (!validateVersion(v)) {
            console.error('版本号格式不正确：' + v);
            process.exit(1);
        }
        run(v);
    });
}