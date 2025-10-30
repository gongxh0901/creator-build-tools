/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: Cocos Creator项目构建器基类
 */

const DataHelper = require('../../utils/DataHelper');
const Result = require('../../utils/Result');
const Logger = require('../../utils/Logger');

class CreatorBuilderBase {
    /**
     * @param {string} platform 平台
     * @param {string} version 版本号
     * @param {string} modeType 构建模式 支持 debug, release
     * @param {string} resVersion 资源版本号 默认值: "0"
     */
    constructor(platform, version, modeType, resVersion = "0") {
        Logger.blue(`====================构建Creator项目 ====================`);
        this._creator = DataHelper.base.creator;
        this._project = DataHelper.base.project;
        this._platform = platform;
        this._version = version;
        this._modeType = modeType;
        this._resVersion = resVersion;

        Logger.tips(`平台:${this._platform}`);
        Logger.tips(`版本:${this._version}`);
        Logger.tips(`资源版本号:${this._resVersion}`);
        Logger.tips(`模式:${this._modeType}`);
        Logger.tips(`creator路径:${this._creator}`);
        Logger.tips(`项目路径:${this._project}`);
    }

    /**
     * 开始
     * @returns {Promise<Result>}
     */
    async start() {
        let result1 = await this.onBuildBefore();
        if (result1.code !== 0) {
            Logger.error(`onBuildBefore code:${result1.code} message:${result1.message}`);
            return result1;
        }
        let result2 = await this.onBuild();
        if (result2.code !== 0) {
            Logger.error(`onBuild code:${result2.code} message:${result2.message}`);
            return result2;
        }

        let result3 = await this.onBuildAfter();
        if (result3.code !== 0) {
            Logger.error(`onBuildAfter code:${result3.code} message:${result3.message}`);
            return result3;
        }

        return new Result(0, "构建成功");
    }

    /** 
     * 构建前
     * 需要子类实现
     * @returns {Promise<Result>}
     */
    async onBuildBefore() {
        throw new Error("onBuildBefore 方法未实现");
    }

    /** 
     * 构建
     * 需要子类实现
     * @returns {Promise<Result>}
     */
    async onBuild() {
        throw new Error("onBuild 方法未实现");
    }

    /** 
     * 构建后
     * 需要子类实现
     * @returns {Promise<Result>}
     */
    async onBuildAfter() {
        throw new Error("onBuildAfter 方法未实现");
    }
}

module.exports = CreatorBuilderBase;