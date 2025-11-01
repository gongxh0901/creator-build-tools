/**
 * @Author: Gongxh
 * @Date: 2025-04-06
 * @Description: 抖音小游戏上传脚本
 */
const tmg = require('tt-minigame-ide-cli');
const path = require('path')
const fs = require('fs');
const ChannelBuilderBase = require('../base/ChannelBuilderBase');
const Logger = require('../../utils/Logger');
const DataHelper = require('../../utils/DataHelper');
const CreatorBuilder3_8 = require('../creator/CreatorBuilder3_8');
const Result = require('../../utils/Result');
const { ErrCode } = require('../../header/Header');
const OssUpload = require('../upload/OssUpload');

class ByteDanceBuilder extends ChannelBuilderBase {
    /**
     * 这里指抖音的上传通道
     * @type {number}
     * @private
     */
    _robot = 0;

    /**
     * 打包的描述
     * @type {string}
     * @private
     */
    _message = "";

    /**
     * 小程序appid
     * @type {string}
     * @private
     */
    _appid = "";

    /**
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {"debug" | "release"} mode debug / release
     * @param {number} robot 机器人
     * @param {string} message 打包的描述
     * @public
     */
    constructor(channel, version, mode, robot, message) {
        Logger.blue(`==================== 构建抖音小游戏 ====================`);
        super(channel, version, mode);
        this._robot = robot;
        this._message = message;
        this._appid = DataHelper.certificates.getAppID(this._platform);
        Logger.log(`渠道:${this._channel}`);
        Logger.log(`版本:${this._version}`);
        Logger.log(`模式:${this._mode}`);
        Logger.log(`上传机器人:${this._robot}`);
        Logger.log(`描述:${this._message}`);
        Logger.log(`小程序appid:${this._appid}`);
    }

    /**
     * 构建
     * @protected
     */
    async onBuild() {
        try {
            // 构建cocos项目
            Logger.log('开始构建 cocos creator 项目');
            await new CreatorBuilder3_8(this._platform, this._version, this._mode).start();
            Logger.log('cocos creator 项目构建完成');

            // 如果需要上传远程资源
            if (DataHelper.platforms.isRemote(this._platform)) {
                Logger.log('需要上传远程资源, 开始上传');
                await this.onUploadRes();
                Logger.log('远程资源上传完成');
            } else {
                Logger.log('不需要上传远程资源');
            }

            Logger.log('开始上传项目到抖音后台');
            // 上传项目到抖音后台
            await this.uploadProject();

            
        } catch (error) {
            Logger.error(`抖音小游戏打包失败 code:${error.code} message:${error.message}`);
            throw new Result(ErrCode.ByteDanceError, "抖音小游戏打包失败", error);
        }
    }

    /** 
     * 上传远程资源到cdn
     * @private
     */
    async onUploadRes() {
        try {
            const remote = path.join(this._project, 'remote');
            if (!fs.existsSync(remote)) {
                Logger.warn(`抖音小游戏远程资源 ${remote} 不存在, 跳过上传`);
                return;
            }
            await new OssUpload(remote, DataHelper.oss.getRemoteUrl(this._mode, this._platform, this._version)).start();
            // 资源上传完成后 删除本地文件
            fs.rmSync(remote, { recursive: true, force: true });
        } catch (error) {
            Logger.error(`抖音小游戏资源上传失败 code:${error.code} message:${error.message}`);
            throw new Result(ErrCode.ByteDanceUploadRes, "抖音小游戏资源上传失败", error);
        }
    }

    /** 上传项目 成功后保存体验二维码 */
    async uploadProject() {
        let info = DataHelper.certificates.getByteDanceAccount(this._platform);
        await tmg.loginByEmail({email: info.email, password: info.password});
        // 上传项目
        await tmg.upload({
            project: {
                path: this._project
            },
            // 保存体验二维码到publish目录
            qrcode: {
                format: "imageFile",
                output: path.join(DataHelper.base.project, "publish", "bytedance_qrcode.png")
            },
            changeLog: this._message,
            version: this._version,
            channel: this._robot + '',
            bgColor: '#ffffffff'
        });
    }
}

module.exports = ByteDanceBuilder;