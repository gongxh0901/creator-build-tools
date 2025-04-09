/**
 * @Author: Gongxh
 * @Date: 2025-03-14
 * @Description: 飞书图片上传
 */
const fs = require('fs');
const request = require('request');
const Result = require('./../utils/Result');
const colors = require('./../utils/Colors');
const DataHelper = require('../utils/DataHelper');

class UploadImage {
    static async uploadImage(filepath) {
        let token = await this.getToken();
        if (!token) {
            throw new Result(-1, '获取token失败');
        }
        const url = "https://open.feishu.cn/open-apis/im/v1/images";
        const formData = {
            'image_type': 'message',
            'image': fs.createReadStream(filepath)
        };
        
        const headers = {
            'Authorization': 'Bearer ' + token
        };

        try {
            let response = await this.postFormdata(url, formData, headers);
            let res = JSON.parse(response);
            if (res.code == 0) {
                return res.data.image_key;
            } else {
                console.log("图片上传失败了", res);
                return "";
            }
        } catch (error) {
            console.log("图片上传失败了", error);
            return ""            
        }        
    }

    /**
     * 飞书自建应用获取token
     */
    static async getToken() {
        try {
            let url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
            let body = {
                'app_id': DataHelper.instance.feishuAppid,
                'app_secret': DataHelper.instance.feishuSecret
            }
            let headers = {
                'Content-Type': "application/json; charset=utf-8"
            }
            let response = await this.post(url, body, headers);
            if (response.code == 0) {
                return response.tenant_access_token
            } else {
                return null;
            }
        } catch (error) {
            console.log(colors('red', `获取token失败`, error));
        }
    }

    static async post(url, body, headers = {}) {
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
                    console.log("err:", error);
                    console.log("body:", body);
                    reject(new Result(-1, "协议错误", body));
                }
            });
        });
    }

    static async postFormdata(url, body, headers = {}) {
        const options = {
            url: url,
            method: 'POST',
            formData: body,
            headers: headers
        }
        return new Promise((resolve, reject) => {
            request.post(options, function (error, response, body) {
                if (!error) {
                    resolve(body);
                } else {
                    console.log("err:", error);
                    console.log("body:", body);
                    reject(new Result(-1, "协议错误", body));
                }
            });
        });
    }
}

module.exports = UploadImage;