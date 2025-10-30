/**
 * @Author: Gongxh
 * @Date: 2025-10-30
 * @Description: 
 */
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const Result = require('../../utils/Result');
const DataHelper = require('../../utils/DataHelper');
const Logger = require('../../utils/Logger');
const FileUtils = require('../../utils/FileUtils');

class OssUpload {
    /** 并行上传数量 */
    _parallelMax = 2;

    /** 当前并行数量 */
    _parallel = 0;
    
    /** 上传超时时间 单位: 秒 */
    _timeout = 10;

    /** 最大重试次数 */
    _retryMax = 3;

    /** 
     * 资源数据
     * filepath: 文件相对路径
     * 
     * status: 状态 等待中、上传中、上传成功
     * 
     * times: 重试次数
     * @type {{filepath: string, status: "waiting" | "running" | "success", times: number}[]}
     */
    _resources = [];

    /** 
     * @param {Result} result 结果
     */
    _resultCallback = (result) => {

    };

    /**
     * 初始化
     * @param {string} local 本地文件绝对路径 文件 or 目录
     * @param {string} remote 远程目录 (不包含域名的路径)
     * @param {number} timeout 上传超时时间 单位: 秒
     */
    constructor(local, remote, timeout = 10) {
        Logger.log(`==================== 上传文件到cdn ====================`);
        // 验证有效性
        if (!fs.existsSync(local)) {
            throw new Result(-1, `待上传资源【${local}】不存在`);
        }
        // 先处理本地路径 和 远程路径
        this._local = this._parseLocalPath(local);
        this._remote = this._parseRemotePath(remote, local);
        this._timeout = timeout ? timeout : this._timeout;

        this._timeout = timeout;
        Logger.blue(`待上传目录:${this._local}  远程路径:${this._remote}  超时时间:${this._timeout}秒`);

        // 文件列表
        const files = FileUtils.getAllFiles(local);
        this._total = files.length;
        this._successCount = 0;
        this._count = 0;

        for (const filepath of files) {
            this._resources.push({ filepath: filepath, status: "waiting", times: 0});
        }
        Logger.blue("文件数量:" + this._total);
    }

    /**
     * 开始上传
     * @returns {Promise<Result>}
     */
    async start() {
        try {
            // TODO::
            // await this.onInitClient();

            let result = await this._startUpload();
            Logger.blue(result.message);
            return result;
        } catch (error) {

            Logger.error(`【资源上传中断】reason:${error.message}`);
            return error;
        }
    }

    /**
     * 初始化oss客户端
     * @returns {Promise<Result>}
     */
    async onInitClient() {
        throw new Result(-1, "OssUpload onInitClient 方法未实现", null);
    }

    /**
     * 上传单个文件
     * @param {string} filepath 本地文件的绝对路径
     * @param {string} remote 远程路径 (不包含域名的路径)
     * @param {{success: () => void, fail: (code: number, message: string) => void}} callback 回调
     * @returns {Promise<Result>}
     */
    async onUploadFile(filepath, remote, callback) {
        setTimeout(() => {
            // Math.random() > 0.9 ? callback.success() : callback.fail(-1, "上传失败");
            callback.success()
            // callback.fail(-1, "上传失败");
            // callback.success();
        }, 1000);
        // throw new Result(-1, "OssUpload onUploadFile 方法未实现", null);
    }

    /**
     * 开始上传
     * @returns {Promise<Result>}
     */
    async _startUpload() {
        return new Promise((resolve, reject) => {
            this._resultCallback = (result) => {
                result.code === 0 ? resolve(result) : reject(result);
            };
            // 直接开启 this._parallelMax 个并行上传
            let max = Math.min(this._parallelMax, this._total);
            for (let i = 0; i < max; i++) {
                this._uploadNext();
            } 
        });
    }

    /**
     * 上传下一个资源
     */
    _uploadNext() {
        // 找到第一个等待中的资源
        const resource = this._resources.find(resource => resource.status === "waiting");
        if (!resource && this._parallel <= 0) {
            // 上传完成了
            this._resultCallback(new Result(0, `资源上传完成 成功上传【${this._total}】个文件。`));
            return;
        }
        if (!resource) {
            // 还存在上传中的资源
            return;
        }
        if (resource.times >= this._retryMax) {
            // 重试次数超过最大重试次数
            this._resultCallback(new Result(-1, `资源【${resource.filepath}】上传失败`, null));
            return;
        }

        let filepath = path.join(this._local, resource.filepath);
        // 将Windows路径分隔符转换为OSS兼容的正斜杠
        let remotePath = resource.filepath.replace(/\\/g, '/');
        let remote = `${this._remote}/${remotePath}`;

        this._parallel++;
        resource.status = "running";
        // Logger.debug(`第${resource.times + 1}次上传文件: ${filepath}`);
        this.onUploadFile(filepath, remote, {
            success: () => {
                // Logger.log(`上传成功:${filepath}`);
                // 删除当前的
                let index = this._resources.findIndex(info => info.filepath === filepath);
                if (index !== -1) {
                    this._resources.splice(index, 1);  
                } else {
                    resource.status = "success"
                }
                // 上传成功 继续下一个
                this._parallel--;
                this._uploadNext();
            },
            fail: (code, message) => {
                Logger.log(`上传[ ${filepath} ]失败 code:${code} message:${message}`);
                this._parallel--;
                // 上传失败 重试
                resource.times++;
                resource.status = "waiting";
                this._uploadNext();
            }
        });

        // const bar = new ProgressBar('资源上传中, 请稍后[:bar]', { total: this._total, width: 40 });
        // while (this._files.length > 0) {
        //     let file = this._files[0];
        //     let absolutePath = path.join(this._local, file);
            

        //     let ossRemotePath = `${this._remote}/${ossRemoteFile}`;
            
        //     // console.log("上传文件", absolutePath, " 远程路径", ossRemotePath);
        //     const options = {
        //         'timeout': 5 * 60 * 1000,
        //     }
        //     try {
        //         let result = await this._client.put(ossRemotePath, absolutePath, options);
        //         if (result.res.status == 200) {
        //             this._files.shift();
        //             bar.tick(1);
        //         } else {
        //             let fileTimes = this.addFileTimes(file);
        //             if (fileTimes > 2) {
        //                 // 重试次数超过3次 上传失败
        //                 throw new Result(-1, `上传失败: ${file} 重试次数超过3次`, result);
        //             }
        //         }
        //     } catch (error) {
        //         let fileTimes = this.addFileTimes(file);
        //         if (fileTimes > 2) {
        //             // 重试次数超过3次 上传失败
        //             throw new Result(-1, `上传失败: ${file} 重试次数超过3次`, error);
        //         }
        //     }
        // }
        // console.log(colors("green", `上传完成！共成功上传 ${this._total} 个文件。`));
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

    /** 
     * 解析本地路径
     * @param {string} local 本地文件绝对路径 文件 or 文件夹
     * @returns {string} 文件的绝对目录
     */
    _parseLocalPath(local) {
        return fs.statSync(local).isFile() ? path.dirname(local) : local;
    }

    /** 
     * 解析远程路径
     * @param {string} remote 远程目录 (不包含域名的路径)
     * @param {string} local 本地文件绝对路径 文件 or 文件夹
     * @returns {string} 远程目录 (不包含域名的路径)
     */
    _parseRemotePath(remote, local) {
        let result = '';
        // 1. 处理remote 如果remote包含域名 则去掉
        let baseUrl = DataHelper.oss.baseUrl;
        if (remote.includes(baseUrl)) {
            result = remote.replace(baseUrl, '');
        } else if (remote.startsWith('/')) {
            result = remote.slice(1);
        } else {
            result = remote;
        }

        // 2. 处理local 如果local是文件夹 则取最后一个文件夹的名称, 拼接到远程路径后面
        if (fs.statSync(local).isDirectory()) {
            if (result.endsWith('/')) {
                result = `${result}${path.basename(local)}`;
            } else {
                result = `${result}/${path.basename(local)}`;
            }
        }
        
        // 3. 确保远程路径使用正斜杠
        result = result.replace(/\\/g, '/');

        // 4. 确保远程路径不以 / 结尾
        if (result.endsWith('/')) {
            result = result.slice(0, -1);
        }
        return result;
    }
}

module.exports = OssUpload;

new OssUpload("/Users/gongxh/work/kunpo-lib/bit-cc-builder/src/plugins", "test/config").start();