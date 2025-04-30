/**
 * @Author: Gongxh
 * @Date: 2025-03-31
 * @Description: 
 */
const { minidev } = require('minidev')
const path = require('path')
const fs = require('fs')
const https = require('https');
const OssUpload = require('./../oss/AliyOssUpload')
const Result = require('./../utils/Result');
const colors = require('./../utils/Colors');
const DataHelper = require('../utils/DataHelper');

class BuildAlipay {
    _version = "";
    _message = "";
    _isDebug = false;
    _project = "";

    /** 初始化支付宝打包工具 */
    constructor(version, message, isDebug) {
        this._version = version;
        this._message = message;
        this._isDebug = isDebug;

        this._project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("alipay-mini-game"));
    }

    /** 上传远程资源到cdn */
    async uploadRes() {
        // 本地 remote 文件夹的位置
        let remote = path.join(this._project, 'remote');
        if (!fs.existsSync(remote)) {
            console.log(colors("red", "支付宝小游戏远程资源不存在, 跳过上传"));
            return;
        }
        let oss = new OssUpload(remote, DataHelper.instance.getRemoteUrl("alipay", this._isDebug, this._version));
        await oss.upload();
        // 资源上传完成后 删除本地文件
        fs.rmSync(remote, { recursive: true, force: true });
        console.log(colors("green", "支付宝小游戏资源上传完成"));
    }

    /** 上传项目 成功后返回体验版二维码 */
    async uploadProject() {
        try {
            let appId = DataHelper.instance.getAppid("alipay-mini-game");
            console.log(colors("yellow", "支付宝小游戏appid"), appId);
            /** 检查并删除当前指定的版本 */
            await this.checkAndDeleteVersion();
            // 上传项目
            let result = await minidev.upload({
                project: this._project,
                appId: appId,
                /** 上传成功后自动设置为体验版 */
                experience: true,
                version: this._version,
                /** 上传时删除指定版本号 */
                deleteVersion: this._version,
                /** 是否小游戏 */
                isGame: true,
                /** 版本描述，用于在开放平台显示 */
                versionDescription: this._message
            });
            // 下载二维码
            await this.downloadQrcode(result.experienceQrCodeUrl);

        } catch (error) {
            throw error;
        }
    }

    /** 检查并删除当前指定的版本 */
    async checkAndDeleteVersion() {
        let appId = DataHelper.instance.getAppid("alipay-mini-game");
        const version_list = await minidev.app.getUploadedVersionList({
            appId: appId
        });
        // 查找是否存在版本号
        let versionInfo = version_list.find(info => info.appVersion === this._version);
        if (versionInfo) {
            if (versionInfo.versionStatus === "RELEASE") {
                throw new Result(-1, `支付宝小游戏版本号[${this._version}]已存在 并且是正式版`);
            } else {
                // 删除指定版本号
                await minidev.app.deleteVersion({   
                    appId: appId,
                    version: this._version
                });
            }
        }
    }

    /** 下载二维码 */
    async downloadQrcode(url) {
        try {
            // 确保目录存在
            const qrcodePath = path.join(DataHelper.instance.path, 'qrcode');
            if (!fs.existsSync(qrcodePath)) {
                fs.mkdirSync(qrcodePath, { recursive: true });
            }
            
            const filePath = path.join(qrcodePath, 'ali_qrcode.png');
            // 使用 https 模块下载图片
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filePath);
                const request = https.get(url, (response) => {
                    // 处理重定向
                    if (response.statusCode === 302 || response.statusCode === 301) {
                        const redirectUrl = response.headers.location;
                        if (!redirectUrl) {
                            reject(new Error('重定向URL不存在'));
                            return;
                        }
                        // 递归调用下载重定向后的URL
                        this.downloadQrcode(redirectUrl).then(resolve).catch(reject);
                        return;
                    }
                    
                    if (response.statusCode !== 200) {
                        reject(new Error(`下载二维码失败，状态码: ${response.statusCode}`));
                        return;
                    }
                    
                    response.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        console.log('二维码下载成功:', filePath);
                        resolve(true);
                    });
                });

                request.on('error', (err) => {
                    fs.unlink(filePath, () => {}); // 删除不完整的文件
                    console.error('下载二维码出错:', err);
                    reject(err);
                });
            });
        } catch (error) {
            console.error('下载二维码出错:', error);
            throw error;
        }
    }
}

module.exports = BuildAlipay;