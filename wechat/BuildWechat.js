/**
 * @Author: Gongxh
 * @Date: 2025-03-17
 * @Description: 
 */
const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')
const OssUpload = require('./../oss/AliyOssUpload')
const colors = require('./../utils/Colors')
const NotificationFeishu = require('./../NotificationFeishu/NotificationFeishu')
const DataHelper = require('../utils/DataHelper')
class BuildWechat {
    static _version = "";
    static _robot = "";
    static _isDebug = false;
    static _message = "";
    /** 是否发送飞书通知 */
    static _isSend = true;

    /** 微信小游戏项目地址 */
    static _project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("wechatgame"));

    static async start(version, robot, isDebug, message, isSend) {
        this._version = version;
        this._robot = robot;
        this._isDebug = isDebug;
        this._message = message;
        this._isSend = isSend;

        try {
            // 先上传资源到cdn
            await this.uploadRes();
            // 上传项目
            await this.uploadProject();
            console.log(colors("green", "微信小游戏项目上传成功！"));

            if (this._isSend) {
                await this.notificationFeishu();
            }
        } catch (error) {
            console.log(colors("red", "微信打包失败了"), error);
        }
    }

    /** 上传远程资源到cdn */
    static async uploadRes() {
        let remote = path.join(this._project, 'remote');
        if (!fs.existsSync(remote)) {
            console.log(colors("red", "微信小游戏远程资源不存在, 跳过上传"));
            return;
        }
        let oss = new OssUpload(remote, DataHelper.instance.getRemoteUrl("wechatgame", this._isDebug, this._version));

        try {
            await oss.upload();
            // 资源上传完成后 删除本地文件
            fs.rmSync(remote, { recursive: true, force: true });
        } catch (error) {
            console.log(colors("red", "微信小游戏资源上传失败"), error);
            throw error;
        }
    }

    static async uploadProject() {
        const project = new ci.Project({
            appid: DataHelper.instance.getAppid("wechatgame"),
            type: 'miniGame',
            projectPath: this._project,
            privateKeyPath: DataHelper.instance.getPrivateKey("wechatgame"),
            ignores: ['node_modules/**/*'],
        });
        
        const uploadResult = await ci.upload({
            project,
            version: this._version,
            desc: this._message,
            robot: this._robot,
            setting: {
                es6: true,
            },
            onProgressUpdate: console.log,
        })
        console.log(uploadResult)
    }

    static async notificationFeishu() {
        // 脚本文件地址
        let imagePath = path.join(__dirname, "..", "qrcode", "wechat_qrcode.jpg");
        await new NotificationFeishu().miniGameSend("wechatgame", this._version, imagePath, this._isDebug);
    }
}

module.exports = BuildWechat;

