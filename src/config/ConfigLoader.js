/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 数据加载器
 */

const fs = require('fs');
const path = require('path');

class ConfigLoader {
    /**
     * 初始化数据加载器
     * @param {string} filename 配置文件名称
     */
    constructor(filename) {
        const dirpath = path.join(__dirname, '..', '..', 'config');
        const filepath = path.join(dirpath, filename);
        this.__data = this.__loadJSON(filepath);
    }

    /**
     * 加载JSON文件
     * @param {string} filepath 文件路径
     * @returns {object} 配置数据
     */
    __loadJSON(filepath) {
        return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
}

module.exports = ConfigLoader;