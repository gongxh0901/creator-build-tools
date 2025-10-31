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
     * @public
     */
    constructor(platform, version, modeType, resVersion = "0") {
        Logger.blue(`==================== 构建Creator项目 ====================`);
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
     * @public
     */
    async start() {
        try {
            await this.onBuildBefore();
            await this.onBuild();
            await this.onBuildAfter();
        } catch (error) {
            Logger.error(`构建失败 message:${error.message}`);
            throw new Result(-1, `构建失败: ${error.message}`);
        }
    }

    /** 
     * 构建前
     * 需要子类实现
     * @protected
     */
    async onBuildBefore() {
        throw new Result(-1, "onBuildBefore 方法未实现");
    }

    /** 
     * 构建 
     * 需要子类实现
     * @protected
     */
    async onBuild() {
        throw new Result(-1, "onBuild 方法未实现");
    }

    /** 
     * 构建后
     * 需要子类实现
     * @protected
     */
    async onBuildAfter() {
        throw new Result(-1, "onBuildAfter 方法未实现");
    }
}

module.exports = CreatorBuilderBase;