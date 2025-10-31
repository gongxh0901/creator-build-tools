/**
 * @Author: Gongxh
 * @Date: 2025-10-28
 * @Description: 
 */

const { ModeType } = require('../header/Header');
const Logger = require('../utils/Logger');
const Result = require('../utils/Result');
const ConfigLoader = require('./ConfigLoader');

class Oss extends ConfigLoader {
    constructor(filename = 'oss.json') {
        super(filename);
        if (!this.__data) {
            throw new Result(-1, `${filename} 未配置或格式错误`);
        }
        if (typeof this.__data.REMOTE_URL !== 'string') {
            throw new Result(-1, `${filename} 下必须存在【REMOTE_URL】属性 且 是字符串类型`);
        }

        if (!this.__data.REMOTE_URL.endsWith("/")) {
            this.__data.REMOTE_URL += "/";
        }
        Logger.blue(`====================oss配置====================`);
        Logger.blue(`ACCESS_KEY_ID:${this.__data.OSS_URL}`);
        // Logger.blue(`ACCESS_KEY_SECRET:${this.__data.ACCESS_KEY_SECRET}`);
        Logger.blue(`REGION:${this.__data.REGION}`);
        Logger.blue(`BUCKET:${this.__data.BUCKET}`);
        Logger.blue(`远程资源地址:${this.__data.REMOTE_URL}`);
    }

    /**
     * 获取cdn信息
     * @returns {object} cdn信息
     */
    getCDNInfo() {
        return this.__data;
    }

    /**
     * 获取远程资源基础地址
     * @returns {string} 远程资源地址 结尾必带 /
     */
    get baseUrl() {
        return this.__data.REMOTE_URL;
    }

    /**
     * 获取拼接后的远程资源地址
     * @param {string} modeType 模式
     * @param {string} platform 平台
     * @param {string} version 版本号
     * @returns {string} 远程资源地址 结尾不存在 /
     */
    getRemoteUrl(modeType, platform, version) {
        let modeStr = modeType === ModeType.DEBUG ? "dev" : "prod";
        return this.baseUrl + `${modeStr}/v${version}/${platform}`;
    }

    /**
     * 获取拼接后的应用资源上传地址
     * @param {string} modeType 模式
     * @param {string} version 版本号
     * @returns {string} 应用资源上传地址 结尾不存在 /
     */
    getAppUploadUrl(modeType, version) {
        let modeStr = modeType === ModeType.DEBUG ? "dev" : "prod";
        return this.baseUrl + `${modeStr}/app/v${version}`;
    }

    /**
     * 获取拼接后的热更新资源上传地址 (不包含资源版本号)
     * @param {string} modeType 模式
     * @param {string} version 版本号
     * @param {string} platform 平台
     * @returns {string} 热更新资源上传路径 结尾不存在 /
     */
    getHotupdateRemotePath(modeType, version, platform) {
        Logger.blue(`热更新地址中不带平台信息, 如果需要, 则拼接上platform`);
        let modeStr = modeType === ModeType.DEBUG ? "dev" : "prod";
        return `${this.baseUrl}${modeStr}/hotupdate/v${version}`;
    }
}

module.exports = Oss;