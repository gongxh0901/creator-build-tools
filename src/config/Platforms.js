/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 平台配置
 */
const fs = require('fs')
const ConfigLoader = require('./ConfigLoader');
const Result = require('../utils/Result');
const Logger = require('../utils/Logger');
const Oss = require('./Oss');

/** 原生平台列表 */
const NativePlatforms = [
    'ios', 
    'android', 
    'harmonyos-next'
];

/** 小游戏平台列表 */
const MiniPlatforms = [
    'wechatgame', 
    'bytedance-mini-game', 
    'alipay-mini-game', 
    'huawei-quick-game', 
    'xiaomi-quick-game', 
    'vivo-mini-game', 
    'oppo-mini-game', 
    'taobao-mini-game'
];

class Platforms extends ConfigLoader {
    __maps = new Map();

    /** 
     * @param {string} filename 配置文件路径
     */
    constructor(filename = 'platforms.json') {
        super(filename);
        if (!this.__data) {
            throw new Result(-1, `${filename} 未配置或格式错误`);
        }
        if (!Array.isArray(this.__data)) {
            throw new Result(-1, `${filename} 格式错误, 必须是数组`);
        }
        if (this.__data.length === 0) {
            throw new Result(-1, `${filename} 必须至少包含一个平台`);
        }

        Logger.blue(`====================已配置的平台数据====================`);
        for (const { platform, native, build, isRemote, config } of this.__data) {
            if (!config || !fs.existsSync(config)) {
                throw new Result(-1, `平台:【${platform}】配置的打包配置文件:【${config}】 不存在, 请检查配置文件的正确性`);
            }
            if (this.isNative(platform)) {
                Logger.blue(`平台:【${platform}】 原生工程路径:【${native}】 构建工程路径:【${build}】`);
            } else if (this.isMini(platform)) {
                Logger.blue(`平台:【${platform}】 构建工程路径:【${build}】`);
            }
            // 打包配置:【${config}】
            this.__maps.set(platform, { platform, native, build, config, isRemote: isRemote || false });
        }
    }

    /**
     * 是否存在平台配置
     * @param {string} platform 平台
     * @returns {boolean} false/true
     */
    has(platform) {
        return this.__maps.has(platform);
    }

    /**
     * 获取平台的原生工程路径
     * @param {string} platform 平台
     * @returns {string} 平台的原生工程路径 相对项目的路径
     */
    getNativeProject(platform) {
        return this.__maps.get(platform).native;
    }

    /**
     * 获取平台的构建工程路径
     * @param {string} platform 平台
     * @returns {string} 平台的构建工程路径 相对项目的路径
     */
    getBuildProject(platform) {
        return this.__maps.get(platform).build;
    }

    /**
     * 获取渠道打包配置文件路径
     * @param {string} platform 平台
     * @returns {string} 平台打包配置文件路径 绝对路径
     */
    getBuilderConfig(platform) {
        return this.__maps.get(platform).config;
    }

    /**
     * 是否需要设置远程服务器资源地址
     * @param {string} platform 平台
     * @returns {boolean} false/true
     */
    isRemote(platform) {
        return this.__maps.get(platform).isRemote || false;
    }

    /**
     * 是否是原生平台
     * @param {string} platform 平台
     * @returns {boolean} false/true
     */
    isNative(platform) {
        if (NativePlatforms.includes(platform)) {
            return true;
        }
        return false;
    }

    /** 
     * 是否是小游戏渠道
     * @param {string} platform 平台
     * @returns {boolean} false/true
     */
    isMini(platform) {
        if (MiniPlatforms.includes(platform)) {
            return true;
        }
        return false;
    }
}

module.exports = Platforms;