/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 文件工具类
 */
const fs = require('fs');
const path = require('path');
const Result = require('./Result');

class FileUtils {
    /** 
     * 获取指定目录下的所有文件
     * @static
     * @param {string} dir - 要搜索的目录绝对路径
     * @returns {string[]} - 所有文件相对于传入目录的相对路径数组
     */
    static getAllFiles(dir) {
        // 校验路径是否存在
        if (!fs.existsSync(dir)) {
            throw new Result(-1, `路径不存在:${dir}`);
        }
        // 校验路径是否为目录
        const stat = fs.statSync(dir);
        if (!stat.isDirectory()) {
            throw new Result(-1, `路径不是一个目录:${dir}`);
        }
        return this.__scanDirectory(dir, dir);
    }

    /**
     * 递归扫描目录
     * @static
     * @private
     * @param {string} currentPath - 当前扫描的路径
     * @param {string} basePath - 基础路径，用于计算相对路径
     * @returns {string[]} - 文件相对路径数组
     */
    static __scanDirectory(currentPath, basePath) {
        let files = [];
        // 读取目录内容
        const items = fs.readdirSync(currentPath);
        // 遍历目录中的每一项
        for (const item of items) {
            // 跳过 .DS_Store 文件
            if (item === '.DS_Store') {
                continue;
            }
            const absolutePath = path.join(currentPath, item);
            const stat = fs.statSync(absolutePath);            
            if (stat.isFile()) {
                // 计算相对于basePath的路径
                files.push(path.relative(basePath, absolutePath));
            } else if (stat.isDirectory()) {
                // 递归扫描子目录
                files = files.concat(this.__scanDirectory(absolutePath, basePath));
            }
        }
        return files;
    }

    /**
     * 写入文件
     * @static
     * @param {string} dest 文件路径
     * @param {string} content 内容字符串
     */
    static async writeFile(dest, content) {
        return new Promise((resolve, reject) => {
            fs.writeFile(dest, content, (err) => {
                if (err) {
                    reject(new Result(-1, `向【${dest}】中写入内容失败`, err));
                } else {
                    resolve(new Result(0, '写入文件成功'));
                }
            });
        });
    }
}

module.exports = FileUtils;