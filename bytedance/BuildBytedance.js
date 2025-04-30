/**
 * @Author: Gongxh
 * @Date: 2025-04-06
 * @Description: 抖音小游戏上传脚本
 */
const tmg = require('tt-minigame-ide-cli');
const path = require('path')
const fs = require('fs')
const OssUpload = require('./../oss/AliyOssUpload')
const colors = require('./../utils/Colors');
const DataHelper = require('../utils/DataHelper');

class BuildBytedance {
    _version = "";
    _message = "";
    _robot = 0;
    _isDebug = false;
    _project = "";

    /** 初始化抖音小游戏打包工具 */
    constructor(version, message, robot, isDebug) {
        this._version = version;
        this._message = message;
        this._robot = robot;
        this._isDebug = isDebug;

        this._project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("bytedance-mini-game"));
    }

    /** 上传远程资源到cdn */
    async uploadRes() {
        // 本地 remote 文件夹的位置
        let remote = path.join(this._project, 'remote');
        if (!fs.existsSync(remote)) {
            console.log(colors("red", "抖音小游戏远程资源不存在, 跳过上传"));
            return;
        }
        let oss = new OssUpload(remote, DataHelper.instance.getRemoteUrl("bytedance", this._isDebug, this._version));
        await oss.upload();
        // 资源上传完成后 删除本地文件
        fs.rmSync(remote, { recursive: true, force: true });
        console.log(colors("green", "抖音小游戏资源上传完成"));
    }

    /** 上传项目 成功后保存体验二维码到qrcode目录下 */
    async uploadProject() {
        let tmgAccount = await this.getTmgAccount();
        await tmg.loginByEmail({email: tmgAccount.email, password: tmgAccount.password});

        let appId = DataHelper.instance.getAppid("bytedance-mini-game");
        console.log(colors("yellow", "抖音小游戏appid"), appId);
        // 上传项目
        await tmg.upload({
            project: {
                path: this._project
            },
            qrcode: {
                format: "imageFile",
                output: path.join(DataHelper.instance.path, "qrcode", "bytedance_qrcode.png")
            },
            changeLog: this._message,
            version: this._version,
            channel: this._robot + '',
            bgColor: '#ffffffff'
        });
    }

    /** 获取tmg的账号和密码 我这里是记录到 tmg-account.json 文件中 这里可以自定义 比如放到环境变量中 */
    async getTmgAccount() {
        let tmgAccount = require("./../cert/bytedance/tmg-account.json");
        return {email: tmgAccount.email, password: tmgAccount.password};
    }
}

module.exports = BuildBytedance;