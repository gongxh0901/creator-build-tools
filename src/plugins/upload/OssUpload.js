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
const UploadBase = require('../base/UploadBase');
const OSS = require('ali-oss');

class OssUpload extends UploadBase {
    /**
     * 初始化oss客户端
     * @protected
     */
    async onInitClient() {
        const ossInfo = DataHelper.oss.getCDNInfo();

        let keyid = ossInfo.ACCESS_KEY_ID;
        let secret = ossInfo.ACCESS_KEY_SECRET;
        let region = ossInfo.REGION;
        let bucket = ossInfo.BUCKET;

        if (!keyid) {
            throw new Result(-1, "oss.json中的【ACCESS_KEY_ID】字段不能为空");
        }
        if (!secret) {
            throw new Result(-1, "oss.json中的【ACCESS_KEY_SECRET】字段不能为空");
        }
        if (!region) {
            throw new Result(-1, "oss.json中的【REGION】字段不能为空");
        }
        if (!bucket) {
            throw new Result(-1, "oss.json中的【BUCKET】字段不能为空");
        }

        this._client = new OSS({
            // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
            accessKeyId: keyid,
            accessKeySecret: secret,
            // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
            region: region,
            authorizationV4: true,
            // Bucket名称。
            bucket: bucket,
        });
    }

    /**
     * 上传单个文件
     * @param {string} filepath 本地文件的绝对路径
     * @param {string} remote 远程路径 (不包含域名的路径)
     * @param {{success: () => void, fail: (code: number, message: string) => void}} callback 回调
     * @protected
     */
    async onUploadFile(filepath, remote, callback) {
        const options = {
            'timeout': this._timeout * 1000,
            headers: {
                // 指定PutObject操作时是否覆盖同名目标Object。 覆盖文件。
                'x-oss-forbid-overwrite': 'false',
            },
        }
        try {
            let result = await this._client.put(remote, filepath, options);
            if (result.res.status == 200) {
                callback.success();
            } else {
                callback.fail(result.res.status, "上传失败");
            }
        } catch (error) {
            callback.fail(-1, "上传失败");
        }
    }
}

module.exports = OssUpload;

new OssUpload("/Users/gongxh/work/kunpo-lib/bit-cc-builder/src/plugins", "test/config").start();