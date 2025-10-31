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
     * 自定义配置
     * @type {object}
     * @protected
     */
    _custom = {};

    /**
     * 项目路径
     * @type {string}
     * @protected
     */
    _project = "";

    /**
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {"debug" | "release"} mode debug / release
     * @param {{build?: string, robot?: string, message?: string}} custom 自定义配置
     * @public
     */
    constructor(channel, version, mode, custom) {
        this._channel = channel;

        if (!DataHelper.channels.has(channel)) {
            throw new Result(-1, `渠道:【${channel}】不存在`);
        }
        this._version = version;
        this._mode = mode;
        this._custom = custom;

        this._platform = DataHelper.channels.getPlatform(this._channel);
        this._project = path.join(DataHelper.base.project, DataHelper.platforms.getBuildProject(this._platform));
    }

    /**
     * 开始构建
     * @public
     */
    async start() {
        try {
            await this.onBuildBefore();
            await this.onBuild();
            await this.onBuildAfter();
        } catch (error) {
            Logger.error(`构建出现错误 code:${error.code} message:${error.message}`);
            // throw new Result(-1, `构建失败: ${error.message}`);
        }
    }

    /**
     * 构建前
     * @protected
     */
    async onBuildBefore() {
        throw new Result(-1, "onBuildBefore 方法未实现");
    }

    /**
     * 构建
     * @protected
     */
    async onBuild() {
        throw new Result(-1, "onBuild 方法未实现");
    }

    /**
     * 构建后
     * @protected
     */
    async onBuildAfter() {
        throw new Result(-1, "onBuildAfter 方法未实现");
    }
}

module.exports = ChannelBuilderBase