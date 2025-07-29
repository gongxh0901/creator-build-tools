/**
 * @Author: Gongxh
 * @Date: 2025-03-13
 * @Description: oss上传
 */

const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');

const FileUtils = require('./../utils/FileUtils');
const Result = require('./../utils/Result');
const colors = require('./../utils/Colors');
const DataHelper = require('../utils/DataHelper');


class AliyOssUpload {
    // oss客户端
    _client = null;

    // 本地目录
    _local = '';
    // 上传到的远程路径
    _remote = '';
    // 上传的文件列表
    _files = [];
    // 总文件数量
    _total = 0;
    // 当前上传成功的数量
    _count = 0;
    // 重试次数列表
    _retryList = new Map();

    /**
     * 上传本地文件到oss
     * @param {string} local 本地文件绝对路径
     * @param {string} remote 远程目录 (不包含域名的路径)
     */
    constructor(local, remote) {
        this._local = this.handleLocalPath(local);
        this._remote = this.handleRemotePath(remote, local);

        console.log(colors("blue", "待上传目录:" + this._local + "  远程路径:" + this._remote));

        // 文件列表
        this._files = FileUtils.getAllFiles(local);
        // 总文件数量
        this._total = this._files.length;
        // 当前上传成功的数量
        this._count = 0;
    }

    /** 上传文件 */
    async upload() {
        if (!this._client) {
            try {
                this._client = await this.initClient();
            } catch (result) {
                console.log("初始化oss失败", result.code, result.message);
                throw result;
            }
        }
        const bar = new ProgressBar('资源上传中, 请稍后[:bar]', { total: this._total, width: 40 });

        while (this._files.length > 0) {
            let file = this._files[0];
            let absolutePath = path.join(this._local, file);
            
            // 将Windows路径分隔符转换为OSS兼容的正斜杠
            let ossRemoteFile = file.replace(/\\/g, '/');
            let ossRemotePath = `${this._remote}/${ossRemoteFile}`;
            
            // console.log("上传文件", absolutePath, " 远程路径", ossRemotePath);
            const options = {
                'timeout': 5 * 60 * 1000,
            }
            try {
                let result = await this._client.put(ossRemotePath, absolutePath, options);
                if (result.res.status == 200) {
                    this._files.shift();
                    this._count++;
                    bar.tick(1);
                } else {
                    let fileTimes = this.addFileTimes(file);
                    if (fileTimes > 2) {
                        // 重试次数超过3次 上传失败
                        throw new Result(-1, `上传失败: ${file} 重试次数超过3次`, result);
                    }
                }
            } catch (error) {
                let fileTimes = this.addFileTimes(file);
                if (fileTimes > 2) {
                    // 重试次数超过3次 上传失败
                    throw new Result(-1, `上传失败: ${file} 重试次数超过3次`, error);
                }
            }
        }
        console.log(colors("green", `上传完成！共成功上传 ${this._count} 个文件。`));
    }

    /** 处理本地路径 */
    handleLocalPath(local) {
        // 如果是文件 转成目录
        if (fs.statSync(local).isFile()) {
            return path.dirname(local);
        }
        return local;
    }

    /** 处理远程路径 */
    handleRemotePath(remote, local) {
        let result = '';
        // 远程路径 如果包含oss地址 则去掉
        let ossUrl = DataHelper.instance.ossUrl;
        if (remote.includes(ossUrl)) {
            result = remote.replace(ossUrl, '');
            // 如果开始是/则删除
            if (result.startsWith('/')) {
                result = result.slice(1);
            }
        } else {
            result = remote;
        }

        // 如果待上传路径是文件夹 则取最后一个文件夹的名称, 拼接到远程路径后面
        if (fs.statSync(local).isDirectory()) {
            // result 如果不是以/结尾 则添加/
            if (!result.endsWith('/')) {
                result = result + '/';
            }
            result = result + path.basename(local);
        }
        
        // 确保远程路径使用正斜杠
        result = result.replace(/\\/g, '/');
        
        return result;
    }

    async initClient() {
        let keyid = process.env.OSS_ACCESS_KEY_ID;
        if (!keyid) {
            throw new Result(-1, "环境变量中未配置 OSS_ACCESS_KEY_ID");
        }

        let keysecret = process.env.OSS_ACCESS_KEY_SECRET;
        if (!keysecret) {
            throw new Result(-1, "环境变量中未配置 OSS_ACCESS_KEY_SECRET");
        }
        let region = DataHelper.instance.region;
        let bucket = DataHelper.instance.bucket;

        console.log(process.env.OSS_ACCESS_KEY_ID);
        console.log(process.env.OSS_ACCESS_KEY_SECRET);

        let client = new OSS({
            // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
            accessKeyId: process.env.OSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
            // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
            region: region,
            authorizationV4: true,
            // Bucket名称。
            bucket: bucket,
        });
        return client;
    }

    addFileTimes(file) {
        if (this._retryList.has(file)) {
            let times = this._retryList.get(file) || 0;
            this._retryList.set(file, times + 1);
            return times + 1;
        } else {
            this._retryList.set(file, 1);
            return 1;
        }
    }
}

//TODO:: test
// console.log("当前工作目录", process.cwd());
// new AliyOssUpload("./buildcc", "test/config").upload();

module.exports = AliyOssUpload;