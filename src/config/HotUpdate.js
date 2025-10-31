/**
 * @Author: Gongxh
 * @Date: 2025-10-28
 * @Description: 
 */

const ConfigLoader = require('./ConfigLoader');
const Result = require('../utils/Result');
const Logger = require('../utils/Logger');
const Base = require('./Base');
const path = require('path');
class HotUpdate extends ConfigLoader {
    __maps = new Map();
    /**
     * 构造函数
     * @param {Base} base 基础配置
     * @param {string} filename 配置文件名
     */
    constructor(base, filename = 'hotupdate.json') {
        super(filename);
        this.__base = base;
        if (!this.__data) {
            throw new Result(-1, `${filename} 未配置或格式错误`);
        }
        if (!Array.isArray(this.__data)) {
            throw new Result(-1, `${filename} 格式错误, 必须是数组`);
        }
        if (this.__data.length === 0) {
            Logger.blue(`不存在需要热更新的平台配置`);
            return;
        }
        Logger.blue(`====================已配置的热更新平台数据====================`);
        for (const info of this.__data) {
            Logger.blue(`需要热更新的平台:【${info.platform}】`);
            this.__maps.set(info.platform, info);
        }
    }

    /**
     * 平台是否需要热更新
     * @param {string} platform 平台
     * @returns {boolean} true/false
     */
    isNeed(platform) {
        return this.__maps.has(platform);
    }

    /**
     * 获取manifest文件输出路径
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getDest(platform) {
        return path.join(this.__base.project, this.__maps.get(platform).dest);
    }

    /**
     * 获取项目构建后的资源所在路径 使用构建后的资源生成manifest文件
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getSrc(platform) {
        return path.join(this.__base.project, this.__maps.get(platform).src);
    }

    /**
     * 获取项目构建后的 manifest 文件所在的路径
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getManifest(platform) {
        return path.join(this.__base.project, this.__maps.get(platform).manifest);
    }

    /**
     * 获取项目构建后的 main.js 文件所在的路径
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getMainJs(platform) {
        return path.join(this.getSrc(platform), "main.js");
    }
}

module.exports = HotUpdate;