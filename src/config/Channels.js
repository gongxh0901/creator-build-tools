/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 
 */
const path = require('path')
const ConfigLoader = require('./ConfigLoader');
const Result = require('../utils/Result');
const Logger = require('../utils/Logger');
const Platforms = require('./Platforms');

class Channels extends ConfigLoader {
    __maps = new Map();

    /** 
     * @param {Platforms} platforms 平台配置对象
     * @param {string} filename 配置文件路径
     */
    constructor(platforms, filename = 'channels.json') {
        super(filename);
        if (!this.__data) {
            throw new Result(-1, `${filename} 未配置或格式错误`);
        }
        if (!Array.isArray(this.__data)) {
            throw new Result(-1, `${filename} 格式错误, 必须是数组`);
        }
        if (this.__data.length === 0) {
            throw new Result(-1, `${filename} 必须至少包含一个渠道`);
        }

        Logger.blue(`====================已配置的渠道数据====================`);
        for (const { channel, name, platform } of this.__data) {
            if (!platforms.has(platform)) {
                throw new Result(-1, `渠道:【${channel}】配置的平台类型【${platform}】不存在, 请检查配置文件的正确性`);
            }
            Logger.blue(`渠道:【${channel}】 名称:【${name}】 平台:【${platform}】`);
            this.__maps.set(channel, { channel, name, platform });
        }
    }

    get channels() {
        return Array.from(this.__maps.keys());
    }

    /**
     * 获取渠道名称
     * @param {string} channel 渠道类型
     * @returns {string} 渠道名称
     */
    getName(channel) {
        return this.__maps.get(channel).name;
    }

    /**
     * 获取渠道平台
     * @param {string} channel 渠道类型
     * @returns {string} 渠道平台
     */
    getPlatform(channel) {
        return this.__maps.get(channel).platform;
    }

    /**
     * 是否存在渠道
     * @param {string} channel 渠道类型
     * @returns {boolean} 是否存在渠道
     */
    has(channel) {
        return this.__maps.has(channel);
    }
}

module.exports = Channels;