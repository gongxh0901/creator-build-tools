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
const NotificationFeishu = require('./NotificationFeishu/NotificationFeishu')

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
    _robot = 1;
    _notificationFeishu = true;
    _message = "";

    /** 根据平台类型绑定对应的构建流程 */
    _platformFlowBindFuncs = {}

    constructor() {
        this._platformFlowBindFuncs = {
            ['android']: this.buildAndroidFlow,
            // ['ios']: this.buildIosFlow,
            ['harmonyos-next']: this.buildHarmonyNextFlow,
            ['wechatgame']: this.buildWechatFlow,
            ['bytedance-mini-game']: this.buildBytedanceFlow,
            ['alipay-mini-game']: this.buildAlipayFlow,
            // ['huawei-quick-game']: this.buildHuaweiQuickFlow,
        }
    }

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
        this._buildCode = parseInt(build);
        if (!/^\d+$/.test(this._buildCode)) {
            console.log(colors("red", "构建号不合法:" + this._buildCode));
            return;
        }
        this._debug = !!debug;

        this._robot = robot;
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
                this._robot = parseInt(input);
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
        console.log(colors("magenta", "微信上传机器人编号: " + this._robot));
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

    /** 渠道构建 */
    async buildSingleChannel(channel) {
        try {
            await BuildCreator3_8.start(channel, this._version, this._debug);
            // 根据渠道获取平台类型
            let platform = DataHelper.instance.getChannelPlatform(channel);

            if (this._platformFlowBindFuncs[platform]) {
                await this._platformFlowBindFuncs[platform].call(this, channel);
            } else {
                throw new Result(-1, '打包流程未绑定 通过 AutoBuild 中的 constructor 去绑定');
            }
        } catch (result) {
            console.log(colors("red", `渠道[${channel}]打包失败 code:${result.code} message:${result.message}`));
        }
    }

    /** 构建android渠道 */
    async buildAndroidFlow(channel) {
        let build = new BuildAndroid(channel, this._version, this._buildCode, this._debug);
        // 修改版本号
        build.modifyGameVersion();
        // 构建apk
        await build.buildApk();
        // 拷贝apk到指定目录 publish 目录
        await build.copyApkToPublish();
        // 给apk签名
        await build.signApk();
        // 上传apk到cdn
        await build.ossUpload();
        // 发送飞书通知
        if (this._notificationFeishu) {
            await build.notificationFeishu();
        }
        // 打印安卓打包完成信息
        console.log(colors("green", "安卓打包完成, apk文件路径:" + path.join(DataHelper.instance.project, 'publish', build.getApkName())));
    }

    /** 鸿蒙Next打包流程 */
    async buildHarmonyNextFlow() {
        let build = new BuildHarmony(this._version, this._buildCode, this._debug);
        // 修改鸿蒙项目版本号
        build.modifyGameVersion();
        // 构建鸿蒙app
        await build.buildApp();
        // 上传鸿蒙app和hap到cdn
        await build.ossUpload();
        // 发送飞书通知 
        if (this._notificationFeishu) {
            await build.notificationFeishu();
        }
        // 打印鸿蒙打包完成信息
        console.log(colors("green", "鸿蒙打包完成, hap文件路径:" + path.join(DataHelper.instance.project, 'publish', build.getHapName())));
        if (!this._debug) {
            console.log(colors("green", "鸿蒙打包完成, app文件路径:" + path.join(DataHelper.instance.project, 'publish', build.getAppName())));
        }
    }

    /** 支付宝小游戏打包流程 */
    async buildAlipayFlow() {
        let build = new BuildAlipay(this._version, this._message, this._debug);
        // 上传支付宝远程资源到cdn
        await build.uploadRes();
        // 上传支付宝小游戏到开发者后台 并且保存体验二维码到qrcode目录
        await build.uploadProject();

        // 发送飞书通知
        if (this._notificationFeishu) {
            let imagePath = path.join(DataHelper.instance.path, "qrcode", "ali_qrcode.png");
            await new NotificationFeishu().miniGameSend("alipay", this._version, imagePath, this._debug);
        }
    }

    /** 抖音小游戏打包流程 */
    async buildBytedanceFlow() {
        let build = new BuildBytedance(this._version, this._message, this._robot, this._debug);
        // 上传抖音远程资源到cdn
        await build.uploadRes();
        // 上传抖音小游戏到开发者后台 并且保存体验二维码到qrcode目录
        await build.uploadProject();
        // 发送飞书通知
        if (this._notificationFeishu) {
            let imagePath = path.join(DataHelper.instance.path, "qrcode", "bytedance_qrcode.png");
            await new NotificationFeishu().miniGameSend("bytedance", this._version, imagePath, this._debug);
        }
    }

    /** 微信小游戏打包流程 */
    async buildWechatFlow() {
        let build = new BuildWechat(this._version, this._message, this._robot, this._debug);
        // 上传微信远程资源到cdn
        await build.uploadRes();
        // 上传项目到微信后台
        await build.uploadProject();

        // 发送飞书通知 因为微信不支持自动修改体验版本 这里是提前把二维码放到目录下了
        if (this._notificationFeishu) {
            let imagePath = path.join(DataHelper.instance.path, "qrcode", "wechat_qrcode.jpg");
            await new NotificationFeishu().miniGameSend("wechatgame", this._version, imagePath, this._debug);
        }
    }
}

module.exports = AutoBuild