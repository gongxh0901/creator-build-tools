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
    /** 
     * 并行上传数量
     * @private
     */
    _parallelMax = 10;

    /** 
     * 当前并行数量
     * @private
     */
    _parallel = 0;
    
    /** 
     * 上传超时时间 单位: 秒
     * @protected
     */
    _timeout = 10;

    /** 
     * 最大重试次数
     * @private
     */
    _retryMax = 3;

    /** 
     * 资源数据
     * relative: 文件相对路径
     * 
     * status: 状态 等待中、上传中、上传成功
     * 
     * times: 重试次数
     * @type {{relative: string, status: "waiting" | "running" | "success", times: number}[]}
     * @private
     */
    _resources = [];

    /** 
     * @param {Result} result 结果
     * @private
     */
    _resultCallback = (result) => {

    };

    /**
     * 初始化
     * @param {string} local 本地文件绝对路径 文件 or 目录
     * @param {string} remote 远程目录 (不包含域名的路径)
     * @param {number} timeout 上传超时时间 单位: 秒
     * @public
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

        this._successCount = 0;
        this._count = 0;

        // 获取文件列表
        // 校验路径是否为目录
        const stat = fs.statSync(local);
        if (stat.isDirectory()) {
            const files = FileUtils.getAllFiles(local);
            this._total = files.length;
            for (const relative of files) {
                this._resources.push({ relative, status: "waiting", times: 0});
            }
        } else {
            this._total = 1;
            this._resources.push({ relative: path.basename(local), status: "waiting", times: 0});
            // this._resources.push({ relative: local, status: "waiting", times: 0});
        }
        Logger.blue("文件数量:" + this._total);
    }

    /**
     * 开始上传
     * @public
     */
    async start() {
        try {
            await this.onInitClient();
            await this._startUpload();
            Logger.success(`资源上传完成 成功上传【${this._total}】个文件。`);
        } catch (error) {
            Logger.error(`【资源上传中断】reason:${error.message}`);
            throw error;
        }
    }

    /**
     * 初始化oss客户端
     * 需要子类实现
     * @protected
     */
    async onInitClient() {
        throw new Result(-1, "OssUpload onInitClient 方法未实现");
    }

    /**
     * 上传单个文件 
     * 需要子类实现
     * @param {string} filepath 本地文件的绝对路径
     * @param {string} remote 远程路径 (不包含域名的路径)
     * @param {{success: () => void, fail: (code: number, message: string) => void}} callback 回调
     * @protected
     */
    async onUploadFile(filepath, remote, callback) {
        throw new Result(-1, "OssUpload onUploadFile 方法未实现");
    }

    /**
     * 开始上传 
     * @private
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
     * @private
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
            this._resultCallback(new Result(-1, `资源【${resource.relative}】上传失败`, null));
            return;
        }

        // 文件的相对路径
        let relative = resource.relative;
        // 文件的绝对路径
        let absolute = path.join(this._local, relative);
        // 转成远程能识别的路径分隔符
        let remotePath = relative.replace(/\\/g, '/');
        // 拼接远程路径 (相对于存储桶的根目录)
        let remote = `${this._remote}/${remotePath}`;

        this._parallel++;
        resource.status = "running";
        this.onUploadFile(absolute, remote, {
            success: () => {
                this._bar.tick(1);
                // 删除当前的
                let index = this._resources.findIndex(info => info.relative === relative);
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
                Logger.log(`上传[ ${absolute} ]失败 code:${code} message:${message}`);
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
     * @private
     */
    _parseLocalPath(local) {
        return fs.statSync(local).isFile() ? path.dirname(local) : local;
    }

    /** 
     * 解析远程路径
     * @param {string} remote 远程目录 (不包含域名的路径)
     * @param {string} local 本地文件绝对路径 文件 or 文件夹
     * @returns {string} 远程目录 (不包含域名的路径)
     * @private
     */
    _parseRemotePath(remote, local) {
        let result = '';
        // 1. 处理remote 如果remote包含域名 则去掉域名(协议+主机)，保留完整路径
        try {
            // 尝试解析为 URL（如果包含完整域名）
            const url = new URL(remote);
            // 只取 pathname + search + hash，保留完整路径
            result = url.pathname + url.search + url.hash;
        } catch (e) {
            // 不是完整 URL，说明已经是路径了，直接使用
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
        Logger.log(`解析后的远程路径:${result}`);
        return result;
    }
}

module.exports = UploadBase;

