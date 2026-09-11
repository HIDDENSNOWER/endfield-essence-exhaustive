#!/usr/bin/env node
/**
 * bump-version.js - 统一更新项目版本号
 * 用法：node bump-version.js 0.9.2   或   双击 bump-version.bat
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

    // 2. index.html（所有 ver.X.Y.Z）
    updateFile('index.html', (content) => {
        return content.replace(/ver\.\d+\.\d+\.\d+[a-z]?/g, 'ver.' + newVersion);
    });

    // 3. README.md — 只改"**当前版本**：vX.Y.Z"，不误伤历史标注（如"v0.9.1 新增"）
    updateFile('README.md', (content) => {
        return content.replace(
            /(\*\*当前版本\*\*：)v\d+\.\d+\.\d+[a-z]?/g,
            '$1v' + newVersion
        );
    });

    // 4. ARCHITECTURE.md — 只改"适用版本：**vX.Y.Z**"
    updateFile('ARCHITECTURE.md', (content) => {
        return content.replace(
            /(适用版本：\*\*)v\d+\.\d+\.\d+[a-z]?/g,
            '$1v' + newVersion
        );
    });

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
    rl.question('请输入新版本号（如 0.9.2）: ', (answer) => {
        const v = (answer || '').trim();
        rl.close();
        if (!validateVersion(v)) {
            console.error('版本号格式不正确：' + v);
            process.exit(1);
        }
        run(v);
    });
}