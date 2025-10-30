/**
 * @Author: Gongxh
 * @Date: 2025-10-29
 * @Description: OSS 上传基类
 */

const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const Result = require('../../utils/Result');
const DataHelper = require('../../utils/DataHelper');
const Logger = require('../../utils/Logger');
const FileUtils = require('../../utils/FileUtils');

class UploadBase {
    /** 并行上传数量 */
    _parallelMax = 10;

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
     * @returns {Promise<void>}
     */
    async start() {
        try {
            await this.onInitClient();
            await this._startUpload();
            Logger.blue(`资源上传完成 成功上传【${this._total}】个文件。`);
        } catch (error) {
            Logger.error(`【资源上传中断】reason:${error.message}`);
            throw error;
        }
    }

    /**
     * 初始化oss客户端
     */
    async onInitClient() {
        throw new Error("OssUpload onInitClient 方法未实现");
    }

    /**
     * 上传单个文件
     * @param {string} filepath 本地文件的绝对路径
     * @param {string} remote 远程路径 (不包含域名的路径)
     * @param {{success: () => void, fail: (code: number, message: string) => void}} callback 回调
     */
    async onUploadFile(filepath, remote, callback) {
        throw new Error("OssUpload onUploadFile 方法未实现");
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

            // 进度条
            this._bar = new ProgressBar(`资源上传中, 请稍后[:bar] 总文件数量:${this._total}`, { total: this._total, width: 40 });

            // 直接开启 this._parallelMax 个并行上传
            let max = Math.min(this._parallelMax, this._total);
            for (let i = 0; i < max; i++) {
                try {
                    this._uploadNext();
                } catch (error) {
                    reject(error);
                }
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
                this._bar.tick(1);
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

module.exports = UploadBase;

