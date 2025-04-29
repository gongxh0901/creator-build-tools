/**
 * @Author: Gongxh
 * @Date: 2025-03-12
 * @Description: 
 */

const path = require('path');
const DataHelper = require('./utils/DataHelper');
const WaitInput = require('./utils/WaitInput');
const colors = require('./utils/Colors');
const BuildCreator3_8 = require('./buildcc/BuildCreator3.8');
const BuildAndroid = require('./android/BuildAndroid');
const BuildWechat = require('./wechat/BuildWechat');
const BuildAlipay = require('./aliypay/BuildAlipay');
const BuildBytedance = require('./bytedance/BuildBytedance');
const BuildHarmony = require('./harmony/BuildHarmony');
const Result = require('./utils/Result');

console.log("filename", __filename);
console.log("dirname",__dirname);

process.chdir(__dirname);
console.log("切换工作目录到当前脚本路径", process.cwd());

class AutoBuild {
    _version = "1.0.0";
    _buildCode = 1;
    _channel = "official";
    _debug = false;
    /** 微信 和 抖音小游戏 上传机器人编号 1-24 */
    _wechatRobot = 1;
    _notificationFeishu = true;
    _message = "";

    async start() {
        await this.inputChannel();
        await this.inputVersionCode();
        await this.inputBuildCode();
        await this.inputDebug();
        await this.inputWechatRobot();
        await this.inputMessage();
        await this.inputNotificationFeishu();
        await this.buildFlow();
    }

    /** 外部传入的参数 */
    async customStart(channel, version, build, debug, robot, message, notification) {
        this._channel = channel;
        if (!DataHelper.instance.isValidChannel(channel)) {
            console.log(colors("red", "渠道类型不合法:" + channel));
            return;
        }
        this._version = version;
        if (!/^\d+\.\d+\.\d+$/.test(version)) {
            console.log(colors("red", "版本号不合法:" + version));
            return;
        }
        this._buildCode = build;
        if (!/^\d+$/.test(build)) {
            console.log(colors("red", "构建号不合法:" + build));
            return;
        }
        this._debug = !!debug;

        this._wechatRobot = robot;
        if (robot < 1 || robot > 24) {
            console.log(colors("red", "上传机器人编号不合法:" + robot));
            return;
        }
        this._message = message;
        if (message === '') {
            this._message = "1. 修复已知bug";
        }
        this._notificationFeishu = !!notification;

        await this.buildFlow();
    }
    /**
     * 输入渠道类型
     */
    async inputChannel() {
        console.log("支持的渠道类型:");
        let allChannels = DataHelper.instance.allChannels();
        for (let channel of allChannels) {
            console.log(colors("green", DataHelper.instance.getChannelName(channel) + ': ' + channel));
        }

        let input = await WaitInput("请输入渠道类型:");
        if (DataHelper.instance.isValidChannel(input)) {
            this._channel = input;
        } else {
            console.log(colors("red", "输入的渠道类型不合法，请重新输入"));
            await this.inputChannel();
        }
    }

    /**
     * 输入版本号
     */
    async inputVersionCode() {
        let input = await WaitInput("请输入版本号(格式: x.x.x):");
        // 检查版本号是否合法 格式 x.x.x
        if (!/^\d+\.\d+\.\d+$/.test(input)) {
            console.log(colors("red", "输入的版本号不合法，请重新输入"));
            await this.inputVersionCode();
        } else {
            this._version = input;
        }
    }

    /**
     * 输入构建号
     */
    async inputBuildCode() {
        let dataHelper = DataHelper.instance;
        if (!dataHelper.isNative(this._channel) && dataHelper.getChannelPlatform(this._channel) !== "huawei-quick-game") {
            return;
        }
        let input = await WaitInput("请输入构建号:");
        // 必须是数字
        if (!/^\d+$/.test(input)) {
            console.log(colors("red", "输入的构建号不合法，请重新输入"));
            await this.inputBuildCode();
        } else {
            this._buildCode = parseInt(input);
        }
    }

    /**
     * 输入是否开启调试模式
     */
    async inputDebug() {
        let input = await WaitInput("是否开启调试模式(y/n) 默认不开启:");
        if (input === 'y') {
            this._debug = true;
        } else {
            this._debug = false;
        }
    }

    /**
     * 输入微信上传机器人编号 (1-24之间的数字)
     */
    async inputWechatRobot() {
        let platform = DataHelper.instance.getChannelPlatform(this._channel)
        if (platform === "wechatgame" || platform === "bytedance-mini-game" || this._channel == "all" || this._channel == "minigame" ) {
            let input = await WaitInput("请输入上传机器人编号(1-24):");
            // 验证输入内容是否为1-24之间的数字
            if (!/^\d+$/.test(input) || parseInt(input) < 1 || parseInt(input) > 24) {
                console.log(colors("red", "输入的机器人编号不合法，请重新输入"));
                await this.inputWechatRobot();
            } else {
                this._wechatRobot = parseInt(input);
            }
        }
    }

    /**
     * 输入版本描述 (默认: 1. 修复已知bug)
     */
    async inputMessage() {
        let input = await WaitInput("请输入版本描述(默认: 1. 修复已知bug):");
        if (input === '') {
            this._message = "1. 修复已知bug";
        } else {
            this._message = input;
        }
    }

    /**
     * 输入是否开启飞书通知
     */
    async inputNotificationFeishu() {
        let input = await WaitInput("是否开启飞书通知(y/n) 默认开启:");
        if (input === 'n') {
            this._notificationFeishu = false;
        } else {
            this._notificationFeishu = true;
        }
    }

    async buildFlow() {
        console.log("构建参数");
        console.log(colors("magenta", "渠道类型: " + this._channel));
        console.log(colors("magenta", "版本号: " + this._version));
        console.log(colors("magenta", "构建号: " + this._buildCode));
        console.log(colors("magenta", "版本描述: " + this._message));
        console.log(colors("magenta", "是否开启调试模式: " + this._debug));
        console.log(colors("magenta", "微信上传机器人编号: " + this._wechatRobot));
        console.log(colors("magenta", "是否开启飞书通知: " + this._notificationFeishu));

        if (this._channel == "all") {
            await this.buildAll();
        } else if (this._channel == "native") {
            await this.buildNative();
        } else if (this._channel == "minigame") {
            await this.buildMini();
        } else {
            // 单个渠道
            await this.buildSingleChannel(this._channel);
        }
    }

    /** 构建所有渠道 */
    async buildAll() {
        let allChannels = DataHelper.instance.allChannels();
        let completeds = [];
        for (let channel of allChannels) {
            if (channel === "all" || channel === "native" || channel === "minigame") {
                continue;
            }
            let platform = DataHelper.instance.getChannelPlatform(channel);
            if (completeds.includes(platform)) {
                continue;
            }

            await this.buildSingleChannel(channel);
            completeds.push(platform);
        }
    }   

    /** 构建所有原生渠道 */
    async buildNative() {
        let allChannels = DataHelper.instance.allChannels();
        let completeds = [];
        for (let channel of allChannels) {
            if (channel === "all" || channel === "native" || channel === "minigame") {
                continue;
            }
            if (!DataHelper.instance.isNative(channel)) {
                continue;
            }
            let platform = DataHelper.instance.getChannelPlatform(channel);
            if (completeds.includes(platform)) {
                continue;
            }
            await this.buildSingleChannel(channel);
            completeds.push(platform);
        }
    }

    /** 构建所有小游戏渠道 */
    async buildMini() {
        let allChannels = DataHelper.instance.allChannels();
        for (let channel of allChannels) {
            if (channel === "all" || channel === "native" || channel === "minigame") {
                continue;
            }
            if (!DataHelper.instance.isMini(channel)) {
                continue;
            }
            await this.buildSingleChannel(channel);
        }
    }

    /** 构建单渠道 */
    async buildSingleChannel(channel) {
        let platform = DataHelper.instance.getChannelPlatform(channel);
        try {
            await BuildCreator3_8.start(channel, this._version, this._debug);
        } catch (result) {
            console.log(colors("red", `构建[${channel}]失败 code:${result.code} message:${result.message}`));
            throw result;
        }

        try {
            if (platform === "wechatgame") {

                await BuildWechat.start(this._version, this._wechatRobot, this._debug, this._message, this._notificationFeishu);
            } else if (platform === "huawei-quick-game") {
    
                throw new Result(-1, `渠道[${channel}]平台类型:${platform}打包功能未实现`);
            } else if (platform === "bytedance-mini-game") {
    
                await BuildBytedance.start(this._version, this._wechatRobot, this._debug, this._message, this._notificationFeishu);
            } else if (platform === "alipay-mini-game") {

                await BuildAlipay.start(this._version, this._debug, this._message, this._notificationFeishu);
            } else if (platform == "ios") {
    
                throw new Result(-1, `渠道[${channel}]平台类型:${platform}打包功能未实现`);
            } else if (platform === "harmonyos-next") {
    
                await BuildHarmony.start(this._version, this._buildCode, this._debug, this._notificationFeishu);
            } else if (platform === "android") {
    
                // 构建安卓apk
                await BuildAndroid.start(channel, this._version, this._buildCode, this._debug, this._notificationFeishu);
            } else {

                throw new Result(-1, `渠道[${channel}]平台类型:${platform}打包功能未实现`);
            }
        } catch (error) {
            console.log(colors("red", `打包[${channel}]失败 message:${error.message}`));
            throw error;
        }
    }
}

module.exports = AutoBuild