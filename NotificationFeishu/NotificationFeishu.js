/**
 * @Author: Gongxh
 * @Date: 2025-03-14
 * @Description: 飞书通知
 */
const request = require('request');
const colors = require('./../utils/Colors');
const Result = require('./../utils/Result');
const UploadImage = require('./UploadImage');
const DataHelper = require('./../utils/DataHelper');
class NotificationFeishu {
    constructor() {

    }

    /**
     * 原生平台打包完成通知
     * 模板ID: AAqBGwoVB2YRI
     * 模板版本: 1.0.2
     * 
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {string} build 构建号
     * @param {string} url 下载地址1
     * @param {string} url2 下载地址2 鸿蒙release会用到 
     * @param {boolean} isDebug 是否为调试模式
     */
    async nativeSend(channel, version, build, url, url2 = null, isDebug = false) {
        try {
            let content = '';
            let platform = DataHelper.instance.getChannelPlatform(channel);
            if (platform == "ios") {
                content = `新包已上传到 **TestFlight** 登录苹果开发者账号查看详情\n下载地址:\n[${url}](${url})`;
            } else if (platform == "harmonyos-next") {
                if (isDebug) {
                    content = `下载地址:\n[${url}](${url})`;    
                } else {
                    content = `下载地址:\n发布包地址: [${url}](${url})\n安装包地址: [${url2}](${url2})`;
                }
            } else {
                content = `下载地址:\n[${url}](${url})`;
            }
            const body = {
                msg_type: "interactive",
                card: {
                    type: "template",
                    data: {
                        template_id: "AAqBGwoVB2YRI",
                        template_version_name: "1.0.2",
                        template_variable: {
                            title: "打包完成通知",
                            channel: DataHelper.instance.getChannelName(channel),
                            version: version + '',
                            build: build + '',
                            content: content,
                        }
                    }
                }
            }
            let headers = {
                'Content-Type': 'application/json'
            }
            try {
                let response = await this.post(DataHelper.instance.getWebhook(isDebug), body, headers);
                if (response.code == 0) {
                    console.log(colors('green', `飞书通知发送成功`));
                } else {
                    console.log(colors('red', `飞书通知发送失败`), response);
                }
            } catch (error) {
                console.log(error);
                
                console.log(colors('red', `飞书通知发送失败`), error);
            }

        } catch (error) {
            console.log(colors('red', `飞书通知发送失败1`), error);
        }
    }

    /**
     * 小游戏打包完成通知
     * 针对有二维码的渠道 要显示二维码
     * 模板ID: AAqBTICCXqjHP
     * 模板版本: 1.0.4
     * 
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {string} image 图片本地地址 绝对地址
     * @param {boolean} isDebug 是否为调试模式
     */
    async miniGameSend(channel, version, image, isDebug) {
        try {
            let imageKey = await UploadImage.uploadImage(image);
            console.log(colors('magenta', `版本号: ${version}`));

            let content = '';
            if (channel == "wechatgame") {
                content = `新包已上传到开发者后台\n请登录**微信mp后台**，把上传版本设置为体验版后，才能扫码体验新版本`;
            } else if (channel == "bytedance") {
                content = `新包已上传到开发者后台\n此版本已自动设置为体验版~\n扫描下方二维码 体验新版本内容`;
            } else if (channel == "alipay") {
                content = `新包已上传到开发者后台\n此版本已自动设置为体验版~\n扫描下方二维码 体验新版本内容`;
            }
            console.log("channel", channel);
            console.log("ChannelName", DataHelper.instance.getChannelName(channel));
            
            const body = {
                msg_type: "interactive",
                card: {
                    type: "template",
                    data: {
                        template_id: "AAqBTICCXqjHP",
                        template_version_name: "1.0.4",
                        template_variable: {
                            title: "打包完成通知",
                            channel: DataHelper.instance.getChannelName(channel),
                            version: version + '',
                            content: content,
                            qrcode: {img_key: imageKey} 
                        }
                    }
                }
            }
            let headers = {
                'Content-Type': 'application/json'
            }
            try {
                let response = await this.post(DataHelper.instance.getWebhook(isDebug), body, headers);
                if (response.code == 0) {
                    console.log(colors('green', `飞书通知发送成功`));
                } else {
                    console.log(colors('red', `飞书通知发送失败`), response);
                }
            } catch (error) {
                console.log(error);
                
                console.log(colors('red', `飞书通知发送失败`), error);
            }

        } catch (error) {
            console.log(colors('red', `飞书通知发送失败1`), error);
        }
    }

    /**
     * 热更新卡片通知
     * 模板ID: AAqBPJtfbEiUx
     * 模板版本: 1.0.3
     * 
     * @param {string} platform 平台
     * @param {string} version 版本号
     * @param {string} hotCode 热更版本号
     * @param {boolean} isDebug 是否为调试模式
     */
    async hotupdateSend(platform, version, hotCode, isDebug) {
        console.log(colors('magenta', `版本号: ${version}`));
        console.log(colors('magenta', `热更版本号: ${hotCode}`));
        console.log(colors('magenta', `平台: ${platform}`));
        const body = {
            msg_type: "interactive",
            card: {
                type: "template",
                data: {
                    template_id: "AAqBPJtfbEiUx",
                    template_version_name: "1.0.3",
                    template_variable: {
                        title: "热更新完成通知",
                        content: `[${platform}]平台热更新完成`,
                        version: version + '',
                        hotversion: hotCode + '',
                    }
                }
            }
        }

        let headers = {
            'Content-Type': 'application/json'
        }
        try {
            let response = await this.post(DataHelper.instance.getWebhook(isDebug), body, headers);
            if (response.code == 0) {
                console.log(colors('green', `飞书通知发送成功`));
            } else {
                console.log(colors('red', `飞书通知发送失败`), response);
            }
        } catch (error) {
            console.log(colors('red', `飞书通知发送失败`, error));
        }
    }

    async post(url, body, headers = {}) {
        const options = {
            url: url,
            method: 'POST',
            json: true,
            body: body,
            headers: headers
        }
        return new Promise((resolve, reject) => {
            request.post(options, function (error, response, body) {
                if (!error) {
                    resolve(body);
                } else {
                    reject(new Result(-1, "协议错误", body));
                }
            });
        });
    }
}

module.exports = NotificationFeishu;

// // 原生平台打包通知测试
// new NotificationFeishu().nativeSend('official', '1.2.0', '2', 'https://www.baidu.com', 'https://www.baidu.com', false);

// // 小游戏打包通知测试
// new NotificationFeishu().miniGameSend('wechatgame', '1.2.0', path.join(__dirname, '..', 'qrcode', 'wechat_qrcode.jpg'), false);

// 热更新通知测试
// new NotificationFeishu().hotupdateSend('android', '1.2.0', '2', false);

