/**
 * @Author: Gongxh
 * @Date: 2025-03-19
 * @Description: 自动热更新
 */

const path = require('path');
const ManifestGenerator = require('./ManifestGenerator');
const colors = require('./../utils/Colors');
const WaitInput = require('./../utils/WaitInput');
const BuildCreator3_8 = require('./../buildcc/BuildCreator3.8');
const OssUpload = require('./../oss/AliyOssUpload');
const NotificationFeishu = require('./../NotificationFeishu/NotificationFeishu');
const DataHelper = require('../utils/DataHelper');
const Result = require('./../utils/Result');
const fs = require('fs');
class AutoHotUpdate {
    /** 平台 支持类型 ios, android, ohos */
    _platform = "android";
    /** 游戏版本号 */
    _gameVersion = "0.0.1";
    /** 热更新版本号 */
    _hotVersion = "1";
    /** 是否是debug */
    _isDebug = false;
    /** 是否通知飞书 */
    _notification = true;

    async start() {
        await this.inputPlatform();
        await this.inputGameVersion();
        await this.inputHotVersion();
        await this.inputDebug();
        await this.inputNotificationFeishu();

        await this.buildFlow();
    }

    /** 外部传入的参数 */
    async customStart(platform, gameVersion, hotVersion, isDebug, notification) {
        if (!["ios", "android", "ohos"].includes(platform)) {
            console.log(colors("red", `传入的平台类型[${platform}]不合法， 请检查参数`));
            return;
        }
        if (!/^\d+\.\d+\.\d+$/.test(gameVersion)) {
            console.log(colors("red", `传入的游戏版本号[${gameVersion}]不合法， 请检查参数`));
            return;
        }
        if (!/^\d+$/.test(hotVersion)) {
            console.log(colors("red", `传入的热更新版本号[${hotVersion}]不合法， 请检查参数`));
            return;
        }
        this._platform = platform;
        this._gameVersion = gameVersion;
        this._hotVersion = hotVersion;
        this._isDebug = isDebug == true ? true : false;
        this._notification = notification == false ? false : true;
        await this.buildFlow();
    }

    /**
     * 输入平台
     */
    async inputPlatform() {
        console.log("支持的平台类型:");
        let allPlatforms = ["ios", "android", "ohos"];
        for (let platform of allPlatforms) {
            console.log(colors("green", platform));
        }

        let input = await WaitInput("请输入平台类型:");
        if (allPlatforms.includes(input)) {
            this._platform = input;
        } else {
            console.log(colors("red", "输入的平台类型不合法，请重新输入"));
            await this.inputPlatform();
        }
    }

    /**
     * 输入游戏版本号 eg: 1.0.0
     */
    async inputGameVersion() {
        let input = await WaitInput("请输入游戏版本号:");
        if (/^\d+\.\d+\.\d+$/.test(input)) {
            this._gameVersion = input;
        } else {
            console.log(colors("red", "输入的游戏版本号不合法，请重新输入"));
            await this.inputGameVersion();
        }
    }

    /**
     * 输入热更新版本号 一个数字
     */
    async inputHotVersion() {
        let input = await WaitInput("请输入热更新版本号:");
        if (/^\d+$/.test(input)) {
            this._hotVersion = input;
        } else {
            console.log(colors("red", "输入的热更新版本号不合法，请重新输入"));
            await this.inputHotVersion();
        }
    }

    /**
     * 输入是否是debug
     */
    async inputDebug() {
        let input = await WaitInput("请输入是否debug(y/n) 默认是非debug:");
        if (input === "y") {
            this._isDebug = true;
        } else {
            this._isDebug = false;
        }
    }

    /**
     * 输入是否通知飞书
     */
    async inputNotificationFeishu() {
        let input = await WaitInput("请输入是否通知飞书(y/n) 默认通知:");
        if (input === "n") {
            this._notification = false;
        } else {
            this._notification = true;
        }
    }

    async buildFlow() {
        console.log("热更新参数:");
        console.log(colors("magenta", "平台类型: " + this._platform));
        console.log(colors("magenta", "游戏版本号: " + this._gameVersion));
        console.log(colors("magenta", "热更新版本号: " + this._hotVersion));
        console.log(colors("magenta", "是否开启调试模式: " + this._isDebug));
        console.log(colors("magenta", "是否开启飞书通知: " + this._notification));

        if (!DataHelper.instance.hasHotupdatePlatform(this._platform)) {
            throw new Result(-1, `平台[${this._platform}]对应的热更新配置不存在，请检查配置文件 config.json`);
        }
        let channel = this.getChannelByPlatform();
        if (!channel) {
            throw new Result(-1, `根据platform[${this._platform}]没有找到对应的渠道配置 请检查配置文件 config.json`);
        }
        // 构建
        await BuildCreator3_8.start(channel, this._gameVersion, this._isDebug);
        // 生成manifest文件
        await new ManifestGenerator().start(this._gameVersion, this._hotVersion, this._platform, this._isDebug);
        // 上传资源
        await this.uploadRes();
        // 发送飞书通知
        if (this._notification) {
            await new NotificationFeishu().hotupdateSend(this._platform, this._gameVersion, this._hotVersion, this._isDebug);
        }
    }

    /**
     * 上传资源
     */
    async uploadRes() {
        // 上传路径拼接
        let srcPath = DataHelper.instance.getHotupdateSrc(this._platform);
        let destPath = DataHelper.instance.getHotupdateDest(this._platform);

        let cdnPath = DataHelper.instance.getHotupdateCdnPath(this._platform, this._isDebug);
        if (cdnPath.endsWith('/')) {
            cdnPath = cdnPath.slice(0, -1);
        }
        // version.manifest 放置路径
        let versionPath = `${cdnPath}/v${this._gameVersion}/${this._platform}`;
        // 实际资源放置路径
        let serverPath = versionPath + `/${this._hotVersion}`;
        console.log("上传到的路径:", serverPath);
        
        // 上传assets文件夹
        await new OssUpload(path.join(srcPath, "assets"), serverPath).upload();
        // 上传src文件夹
        await new OssUpload(path.join(srcPath, "src"), serverPath).upload();
        // 上传project.manifest文件
        await new OssUpload(path.join(destPath, "project.manifest"), serverPath).upload();
        // 上传version.manifest文件
        await new OssUpload(path.join(destPath, "version.manifest"), versionPath).upload();
    }

    getChannelByPlatform() {
        // 找到platform和this._platform相同的 第一项
        let channels = DataHelper.instance.allChannels();
        for (let channel of channels) {
            if (DataHelper.instance.getChannelPlatform(channel) === this._platform) {
                return channel;
            }
        }
        return null;
    }
}

module.exports = AutoHotUpdate;