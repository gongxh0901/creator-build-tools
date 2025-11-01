/**
 * @Author: Gongxh
 * @Date: 2025-10-30
 * @Description: 构建
 */

const fs = require('fs');
const path = require('path');
const { ModeType } = require('../../header/Header');
const DataHelper = require('../../utils/DataHelper');
const Logger = require('../../utils/Logger');
const Result = require('../../utils/Result');

class ChannelBuilderBase {
    /**
     * 渠道
     * @protected
     */
    _channel = "";
    /**
     * 平台
     * @protected
     */
    _platform = "";
    /**
     * 版本号
     * @protected
     */
    _version = "";
    /**
     * 构建模式
     * @type {"debug" | "release"}
     * @protected
     */
    _mode = "release";

    /**
     * 构建后的项目路径
     * @type {string}
     * @protected
     */
    _project = "";

    /**
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {"debug" | "release"} mode debug / release
     * @public
     */
    constructor(channel, version, mode) {
        this._channel = channel;

        if (!DataHelper.channels.has(channel)) {
            throw new Result(-1, `渠道:【${channel}】不存在`);
        }
        this._version = version;
        this._mode = mode;

        this._platform = DataHelper.channels.getPlatform(this._channel);
        this._project = path.join(DataHelper.base.project, DataHelper.platforms.getBuildProject(this._platform));
    }

    /**
     * 开始构建
     * @public
     */
    async start() {
        try {
            await this.onBuild();
            Logger.success(`渠道${this._channel}打包完成 版本号:${this._version} 模式:${this._mode}`);
        } catch (error) {
            Logger.error(`渠道${this._channel}打包失败: code:${error.code} message:${error.message}`);
            throw error;
        }
    }

    /**
     * 构建
     * @protected
     */
    async onBuild() {
        throw new Result(-1, "onBuild 方法未实现");
    }
}

module.exports = ChannelBuilderBase