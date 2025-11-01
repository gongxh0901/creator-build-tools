/**
 * @Author: Gongxh
 * @Date: 2025-03-17
 * @Description: 
 */
const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')
const ChannelBuilderBase = require('../base/ChannelBuilderBase');
const CreatorBuilder3_8 = require('../creator/CreatorBuilder3_8');
const DataHelper = require('../../utils/DataHelper');
const OssUpload = require('../upload/OssUpload');
const Logger = require('../../utils/Logger');
const Result = require('../../utils/Result');
const { ErrCode } = require('src/header/Header');
class WechatBuilder extends ChannelBuilderBase {
    /**
     * 机器人
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
        Logger.blue(`==================== 构建微信小游戏 ====================`);
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
            Logger.log('开始上传项目到微信后台');
            // 上传项目到微信后台
            await this.uploadProject();
        } catch (error) {
            Logger.error(`微信小游戏打包失败 code:${error.code} message:${error.message}`);
            throw new Result(ErrCode.WechatError, "微信小游戏打包失败", error);
        }
    }

    /** 
     * 上传远程资源
     * @private
     */
    async onUploadRes() {
        try {
            const remote = path.join(this._project, 'remote');
            if (!fs.existsSync(remote)) {
                Logger.warn(`微信小游戏远程资源 ${remote} 不存在, 跳过上传`);
                return;
            }
            await new OssUpload(remote, DataHelper.oss.getRemoteUrl(this._mode, this._platform, this._version)).start();
            // 资源上传完成后 删除本地文件
            fs.rmSync(remote, { recursive: true, force: true });
        } catch (error) {
            Logger.error(`微信小游戏资源上传失败 code:${error.code} message:${error.message}`);
            throw new Result(ErrCode.WechatUploadRes, "微信小游戏资源上传失败", error);
        }
    }

    /** 上传项目到微信后台 */
    async uploadProject() {
        try {
            const project = new ci.Project({
                appid: DataHelper.certificates.getAppID(this._platform),
                type: 'miniGame',
                projectPath: this._project,
                privateKeyPath: DataHelper.certificates.getPrivateKey(this._platform),
                ignores: ['node_modules/**/*'],
            });            
            await ci.upload({
                project,
                version: this._version,
                desc: this._message,
                robot: this._robot,
                setting: {
                    es6: true, // 对应于微信开发者工具的 "ES6 转 ES5"
                    es7: true, // 对应于微信开发者工具的 "增强编译"
                    // disableUseStrict: false, // "增强编译" 开启时，是否禁用JS文件严格模式，默认为false
                    minifyJS: true, // 上传时压缩 JS 代码
                    minify: true, // 上传时压缩所有代码，对应于微信开发者工具的 "上传时压缩代码"
                    // codeProtect: true, // 对应于微信开发者工具的 "上传时进行代码保护"
                },
                onProgressUpdate: Logger.log,
            });
            Logger.success("微信小游戏上传到开发者后台成功")
        } catch (error) {
            Logger.error(`微信小游戏上传到开发者后台失败 code:${error.code} message:${error.message}`);
            throw new Result(ErrCode.WechatUploadProject, "微信小游戏上传到开发者后台失败", error);
        }
    }
}

module.exports = WechatBuilder;

