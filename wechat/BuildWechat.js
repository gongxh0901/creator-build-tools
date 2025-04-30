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
const DataHelper = require('../utils/DataHelper')
class BuildWechat {
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

        this._project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("wechatgame"));
    }


    /** 上传微信远程资源到cdn */
    async uploadRes() {
        let remote = path.join(this._project, 'remote');
        if (!fs.existsSync(remote)) {
            console.log(colors("red", "微信小游戏远程资源不存在, 跳过上传"));
            return;
        }
        let oss = new OssUpload(remote, DataHelper.instance.getRemoteUrl("wechatgame", this._isDebug, this._version));
        await oss.upload();
        // 资源上传完成后 删除本地文件
        fs.rmSync(remote, { recursive: true, force: true });
        console.log(colors("green", "微信小游戏资源上传完成"));
    }

    /** 上传项目到微信后台 */
    async uploadProject() {
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
}

module.exports = BuildWechat;

