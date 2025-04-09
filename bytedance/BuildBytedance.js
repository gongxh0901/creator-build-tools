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
const NotificationFeishu = require('./../NotificationFeishu/NotificationFeishu');

class BuildBytedance {
    static _version = "";
    static _robot = 1;
    static _isDebug = false;
    static _message = "";
    /** 是否发送飞书通知 */
    static _isSend = true;

    /** 抖音小游戏项目地址 */
    static _project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("bytedance-mini-game"));

    static async start(version, robot, isDebug, message, isSend) {
        this._version = version;
        this._robot = robot;
        this._isDebug = isDebug;
        this._message = message;
        this._isSend = isSend;

        let tmgAccount = await this.getTmgAccount();
        await tmg.loginByEmail({email: tmgAccount.email, password: tmgAccount.password});

        try {
            // 先上传资源到cdn
            await this.uploadRes();
            // 上传项目
            await this.uploadProject();
            console.log(colors("green", "抖音小游戏项目上传成功！"));

            if (this._isSend) {
                await this.sendNotification();
            }
        } catch (error) {
            console.log(colors("red", "抖音小游戏打包流程失败"), error);
            throw error;
        } finally {
            process.exit(0);
        }
    }

    /** 上传远程资源到cdn */
    static async uploadRes() {
        // 本地 remote 文件夹的位置
        let remote = path.join(this._project, 'remote');
        if (!fs.existsSync(remote)) {
            console.log(colors("red", "抖音小游戏远程资源不存在, 跳过上传"));
            return;
        }
        let oss = new OssUpload(remote, DataHelper.instance.getRemoteUrl("bytedance", this._isDebug, this._version));

        try {
            await oss.upload();
            // 资源上传完成后 删除本地文件
            fs.rmSync(remote, { recursive: true, force: true });
        } catch (error) {
            console.log(colors("red", "抖音小游戏资源上传失败"), error);
            throw error;
        }
    }

    /** 上传项目 成功后返回体验版二维码 */
    static async uploadProject() {
        try {
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
        } catch (error) {
            throw error;
        }
    }

    static async sendNotification() {
        // 脚本文件地址
        let imagePath = path.join(DataHelper.instance.path, "qrcode", "bytedance_qrcode.png");
        await new NotificationFeishu().miniGameSend("bytedance", this._version, imagePath, this._isDebug);
    }

    /** 获取tmg的账号和密码 我这里是记录到 tmg-account.json 文件中 这里可以自定义 比如放到环境变量中 */
    static async getTmgAccount() {
        let tmgAccount = require("./../cert/bytedance/tmg-account.json");
        return {email: tmgAccount.email, password: tmgAccount.password};
    }
}

module.exports = BuildBytedance;