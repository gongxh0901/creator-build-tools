/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: Cocos Creator项目构建器基类
 */

const fs = require('fs');
const path = require('path');
const DataHelper = require('../../utils/DataHelper');
const Result = require('../../utils/Result');
const Logger = require('../../utils/Logger');

class CreatorBuilderBase {
    /**
     * 开始
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {string} mode 构建模式 支持 debug, release
     * @returns {Promise<Result>}
     */
    async start(channel, version, mode) {
        Logger.blue(`====================构建Creator项目 ====================`);
        this._creator = DataHelper.base.creator;
        this._project = DataHelper.base.project;
        this._channel = channel;
        this._version = version;
        this._mode = mode;
        this._platform = DataHelper.channels.getPlatform(this._channel);

        Logger.tips(`渠道:${this._channel}`);
        Logger.tips(`平台:${this._platform}`);
        Logger.tips(`版本:${this._version}`);
        Logger.tips(`模式:${this._mode}`);
        Logger.tips(`creator路径:${this._creator}`);
        Logger.tips(`项目路径:${this._project}`);

        let beforeResult = await this.onBuildBefore();
        if (beforeResult.code !== 0) {
            Logger.error(`onBuildBefore code:${beforeResult.code} message:${beforeResult.message}`);
            return beforeResult;
        }
        let buildResult = await this.onBuild();
        if (buildResult.code !== 0) {
            Logger.error(`onBuild code:${buildResult.code} message:${buildResult.message}`);
            return buildResult;
        }

        let afterResult = await this.onBuildAfter();
        if (afterResult.code !== 0) {
            Logger.error(`onBuildAfter code:${afterResult.code} message:${afterResult.message}`);
            return afterResult;
        }

        return new Result(0, "构建成功");
    }

    /** 
     * 构建前
     * 需要子类实现
     * @returns {Promise<Result>}
     */
    async onBuildBefore() {
        throw new Result(-1, "onBuildBefore 方法未实现");
    }

    /** 
     * 构建
     * 需要子类实现
     * @returns {Promise<Result>}
     */
    async onBuild() {
        throw new Result(-1, "onBuild 方法未实现");
    }

    /** 
     * 构建后
     * 需要子类实现
     * @returns {Promise<Result>}
     */
    async onBuildAfter() {
        throw new Result(-1, "onBuildAfter 方法未实现");
    }
}

module.exports = CreatorBuilderBase;