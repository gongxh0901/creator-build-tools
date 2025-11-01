/**
 * @Author: Gongxh
 * @Date: 2025-03-19
 * @Description: 自动热更新
 */

const path = require('path');
const fs = require('fs');
const Logger = require('../../utils/Logger');
const Result = require('../../utils/Result');
const DataHelper = require('../../utils/DataHelper');
const CreatorBuilder3_8 = require('../creator/CreatorBuilder3_8');
const OssUpload = require('../upload/OssUpload');
const { MessageHelper, MessageType, Message } = require('../../utils/MessageHelper');

class HotUpdatePlugin {
    /**
     * @param {string} platform 平台 支持类型 ios, android, harmonyos-next
     * @param {string} version 游戏版本号
     * @param {string} resVersion 资源版本号
     * @param {"debug" | "release"} modeType 构建模式 支持 debug, release
     * @param {boolean} immediately 是否立即生效
     * @public
     */
    constructor(platform, version, resVersion = "0", modeType = "release", immediately = true) {
        Logger.blue(`==================== 热更新 ====================`);
        this._platform = platform;
        this._version = version;
        this._resVersion = resVersion;
        this._modeType = modeType;
        this._immediately = immediately;

        Logger.log(`平台:${this._platform}`);
        Logger.log(`版本号:${this._version}`);
        Logger.log(`资源版本号:${this._resVersion}`);
        Logger.log(`模式:${this._modeType}`);
        Logger.log(`是否立即生效:${this._immediately ? "是" : "否"}`);
    }

    /**
     * 开始热更新
     * @public
     */
    async start() {
        let message = new Message(MessageType.HOTUPDATE, this._version, this._modeType);
        message.resVersion = this._resVersion;
        message.platform = this._platform;
        try {
            await this.onBefore();
            await this.onStart();
            // await this.onAfter();
            message.succeed = true;
            message.message = "热更新完成";
        } catch (error) {
            Logger.error(`热更新失败 message:${error.message}`);
            message.succeed = false;
            message.message = error.message;
        }
        MessageHelper.addMessage(message);
    }

    /**
     * 热更新前处理
     * 检查参数合法性
     * @protected
     */
    async onBefore() {
        if (!DataHelper.hotupdate.isNeed(this._platform)) {
            throw new Result(-1, `【hotupdate.json】中没有平台【${this._platform}】的热更新配置`);
        }
        if (!/^\d+\.\d+\.\d+$/.test(this._version)) {
            throw new Result(-1, `传入的游戏版本号[${this._version}]不合法， 请检查参数`);
        }
        if (!/^\d+$/.test(this._resVersion)) {
            throw new Result(-1, `资源版本号[${this._resVersion}]不合法， 请检查参数`);
        }
    }

    /**
     * 热更新开始
     * @protected
     */
    async onStart() {
        // 1. 先构建项目
        await new CreatorBuilder3_8(this._platform, this._version, this._modeType, this._resVersion).start();
        // 2. 上传资源
        await this.onUploadResources();
    }

    /**
     * 上传资源
     * @protected
     */
    async onUploadResources() {
        // version.manifest 放置路径
        let remotePath = DataHelper.oss.getHotupdateRemotePath(this._modeType, this._version, this._platform);
        // 远程资源放置的路径
        let remoteResPath = `${remotePath}/${this._resVersion}`;

        let srcPath = DataHelper.hotupdate.getSrc(this._platform);
        let destPath = DataHelper.hotupdate.getDest(this._platform);
        // 上传assets文件夹
        await new OssUpload(path.join(srcPath, "assets"), remoteResPath).start();
        // 上传src文件夹
        await new OssUpload(path.join(srcPath, "src"), remoteResPath).start();
        // 上传project.manifest文件
        await new OssUpload(path.join(destPath, "project.manifest"), remoteResPath).start();

        if (this._immediately) {
            // 上传version.manifest文件
            await new OssUpload(path.join(destPath, "version.manifest"), remotePath).start();
        } else {
            // 改名version.manifest 成文件 version.manifest.temp 后上传到cdn
            let tempPath = path.join(destPath, "version.manifest.temp");
            // 如果文件存在，先删除
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            // 重命名
            fs.renameSync(path.join(destPath, "version.manifest"), tempPath);
            await new OssUpload(tempPath, remotePath).start();
            // 上传完成后删除
            fs.unlinkSync(tempPath);
        }
    }


    // async start() {
    //     await this.inputPlatform();
    //     await this.inputGameVersion();
    //     await this.inputHotVersion();
    //     await this.inputDebug();
    //     await this.inputImmediately();
    //     await this.inputNotificationFeishu();

    //     await this.buildFlow();
    // }

    // /** 外部传入的参数 */
    // async customStart(platform, gameVersion, hotVersion, isDebug, immediately, notification) {
    //     if (!["ios", "android", "harmonyos-next"].includes(platform)) {
    //         console.log(colors("red", `传入的平台类型[${platform}]不合法， 请检查参数`));
    //         return;
    //     }
    //     if (!/^\d+\.\d+\.\d+$/.test(gameVersion)) {
    //         console.log(colors("red", `传入的游戏版本号[${gameVersion}]不合法， 请检查参数`));
    //         return;
    //     }
    //     if (!/^\d+$/.test(hotVersion)) {
    //         console.log(colors("red", `传入的热更新版本号[${hotVersion}]不合法， 请检查参数`));
    //         return;
    //     }
    //     this._platform = platform;
    //     this._gameVersion = gameVersion;
    //     this._hotVersion = hotVersion;
    //     this._isDebug = isDebug;
    //     this._immediately = immediately;
    //     this._notification = notification;
    //     await this.buildFlow();
    // }

    // /**
    //  * 输入平台
    //  */
    // async inputPlatform() {
    //     console.log("支持的平台类型:");
    //     let allPlatforms = ["ios", "android", "harmonyos-next"];
    //     for (let platform of allPlatforms) {
    //         console.log(colors("green", platform));
    //     }

    //     let input = await WaitInput("请输入平台类型:");
    //     if (allPlatforms.includes(input)) {
    //         this._platform = input;
    //     } else {
    //         console.log(colors("red", "输入的平台类型不合法，请重新输入"));
    //         await this.inputPlatform();
    //     }
    // }

    // /**
    //  * 输入游戏版本号 eg: 1.0.0
    //  */
    // async inputGameVersion() {
    //     let input = await WaitInput("请输入游戏版本号:");
    //     if (/^\d+\.\d+\.\d+$/.test(input)) {
    //         this._gameVersion = input;
    //     } else {
    //         console.log(colors("red", "输入的游戏版本号不合法，请重新输入"));
    //         await this.inputGameVersion();
    //     }
    // }

    // /**
    //  * 输入热更新版本号 一个数字
    //  */
    // async inputHotVersion() {
    //     let input = await WaitInput("请输入热更新版本号:");
    //     if (/^\d+$/.test(input)) {
    //         this._hotVersion = input;
    //     } else {
    //         console.log(colors("red", "输入的热更新版本号不合法，请重新输入"));
    //         await this.inputHotVersion();
    //     }
    // }

    // /**
    //  * 输入是否是debug
    //  */
    // async inputDebug() {
    //     let input = await WaitInput("请输入是否debug(y/n) 默认是非debug:");
    //     if (input.toLowerCase() === "y") {
    //         this._isDebug = true;
    //     } else {
    //         this._isDebug = false;
    //     }
    // }

    // /**
    //  * 输入是否立即生效
    //  */
    // async inputImmediately() {
    //     let input = await WaitInput("请输入是否立即生效(y/n) 默认是立即生效:");
    //     if (input.toLowerCase() === "n") {
    //         this._immediately = false;
    //     } else {
    //         this._immediately = true;
    //     }
    // }

    // /**
    //  * 输入是否通知飞书
    //  */
    // async inputNotificationFeishu() {
    //     let input = await WaitInput("请输入是否通知飞书(y/n) 默认通知:");
    //     if (input.toLowerCase() === "n") {
    //         this._notification = false;
    //     } else {
    //         this._notification = true;
    //     }
    // }

    // getChannelByPlatform() {
    //     // 找到platform和this._platform相同的 第一项
    //     let channels = DataHelper.instance.allChannels();
    //     for (let channel of channels) {
    //         if (DataHelper.instance.getChannelPlatform(channel) === this._platform) {
    //             return channel;
    //         }
    //     }
    //     return null;
    // }
}

module.exports = HotUpdatePlugin;