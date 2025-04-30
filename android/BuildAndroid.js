/**
 * @Author: Gongxh
 * @Date: 2025-03-13
 * @Description: 构建安卓apk
 */

const { RunCommand } = require('../utils/Command');
const fs = require('fs');
const path = require('path');
const colors = require('./../utils/Colors');
const Result = require('./../utils/Result');
const OssUpload = require('./../oss/AliyOssUpload');
const NotificationFeishu = require('./../NotificationFeishu/NotificationFeishu');
const DataHelper = require('../utils/DataHelper');

class BuildAndroid {
    _channel = "";
    _versionCode = "";
    _buildCode = 0;
    _isDebug = false;

    _apkname = "";
    __project = "";
    __native = "";

    constructor(channel, version, build, isDebug) {
        this._channel = channel;
        this._versionCode = version;
        this._buildCode = build;
        this._isDebug = isDebug;

        // 把最终的apk文件名拼好
        this._apkname = `v${version}.${build}-${channel}-${isDebug ? 'debug' : 'release'}.apk`;

        this.__project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("android"));
        this.__native = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformNativePath("android"));
    }

    getApkName() {
        return this._apkname;
    }

    async start(channel, version, build, isDebug, isSend) {
        this._channel = channel;
        this._versionCode = version;
        this._buildCode = build;
        this._isDebug = isDebug;

        // this.modifyGameVersion(version, build);
        await this.buildApk(isDebug);
        await this.copyApkToPublish();
        await this.signApk();

        try {
            await this.ossUpload();
            if (this._isSend) {
                await this.notificationFeishu();
            }
        } catch (error) {
            console.log(colors("red", "android包上传失败, 跳过飞书通知"), error);
        }
        console.log(colors("green", "android打包完成, apk文件路径:" + path.join(DataHelper.instance.project, 'publish', this._apkname)));
    }

    /** 修改版本号 */
    modifyGameVersion() {
        // 找到项目路径
        console.log(colors("magenta", "android原生项目路径:" + this.__native));
        // 修改build.gradle文件
        // 找到 versionCode和versionName所在的行 修改后替换，然后写入文件
        let buildGradle = path.join(this.__native, 'build.gradle');
        let buildGradleContent = fs.readFileSync(buildGradle, 'utf8');
        let versionCodeLine = buildGradleContent.match(/versionCode\s+(\d+)/);
        let versionNameLine = buildGradleContent.match(/versionName\s+"([^"]+)"/);
        console.log(colors("green", "versionCode:" + versionCodeLine[1]));
        console.log(colors("green", "versionName:" + versionNameLine[1]));

        // 替换versionCode和versionName
        buildGradleContent = buildGradleContent.replace(versionCodeLine[0], 'versionCode ' + this._buildCode);
        buildGradleContent = buildGradleContent.replace(versionNameLine[0], 'versionName "' + this._versionCode + '"');
        fs.writeFileSync(buildGradle, buildGradleContent);
        console.log(colors("green", "版本号修改成功 version:" + this._versionCode + " build:" + this._buildCode));
    }

    /** 构建apk */
    async buildApk() {
        // 找到项目路径
        let project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("android"));
        console.log(colors("magenta", "android工程路径:" + project));

        // 切换工作目录到android目录下
        process.chdir(project);
        
        // 清理构建缓存
        await RunCommand('./gradlew', ['clean']);
        console.log(colors("green", "清理构建缓存完成"));

        // 执行gradlew命令 打包apk
        let options = [this._isDebug ? 'assembleDebug' : 'assembleRelease'];
        let result = await RunCommand('./gradlew', options);
        if (result.code == 0) {
            console.log(colors("green", "打包安卓apk成功"));
        } else {
            console.log(colors("red", "打包安卓apk失败"));
            throw result;
        }
        // 打包完成再还原工作目录
        process.chdir(path.join(__dirname, '..') );
        console.log("工作目录", process.cwd());
    }

    /** 拷贝apk到指定目录 并重命名 */
    async copyApkToPublish() {
        // 找到apk路径
        let mode = this._isDebug ? 'debug' : 'release';

        let output = path.join(this.__project, 'build', 'kunpocreator', 'outputs', 'apk', mode, `kunpocreator-${mode}.apk`);
        // 检查文件是否存在
        if (!fs.existsSync(output)) {
            console.log(colors("red", `路径:${output}不存在apk文件 请修改查找路径`));
            throw new Result(-1, "拷贝apk时, apk文件不存在");
        }
        // 拷贝apk到指定目录
        let publish = path.join(DataHelper.instance.project, 'publish');
        // 如果目录不存在 则创建
        !fs.existsSync(publish) && fs.mkdirSync(publish, { recursive: true });
        // 如果文件已经存在，则删除源文件
        fs.existsSync(path.join(publish, this._apkname)) && fs.unlinkSync(path.join(publish, this._apkname));

        // 拷贝apk到指定目录
        try {
            fs.copyFileSync(output, path.join(publish, this._apkname));
            console.log(colors("green", `拷贝apk到指定目录:${publish} 文件名:${this._apkname}`));
        } catch (result) {
            console.log(colors("red", `拷贝apk到指定目录:${publish}失败`));
            throw new Result(-1, `拷贝apk到指定目录:${publish}失败`, result);
        }
    }

    /** 安卓包签名 */
    async signApk() {
        let apkfile = path.join(DataHelper.instance.project, 'publish', this._apkname);
        // 检查文件是否存在
        if (!fs.existsSync(apkfile)) {
            console.log(colors("red", `路径:${apkfile}不存在apk文件 请修改查找路径`));
            throw new Result(-1, "安卓apk文件不存在");
        }
        console.log(colors("magenta", "准备给apk签名"));
        // 执行签名命令 

        // 检查环境变量 apksigner 是否设置
        const apksigner = process.env.APKSIGNER; // || 'apksigner';
        console.log("检查环境变量 apksigner:" + apksigner);
        try {
            const checkResult = require('child_process').spawnSync(apksigner, ['--version']);
            if (checkResult.error || checkResult.status !== 0) {
                console.log(colors("red", "未找到apksigner工具，请确保已安装Android SDK并设置APKSIGNER环境变量"));
                throw new Result(-1, "apksigner工具不可用 请确保已安装Android SDK并设置APKSIGNER环境变量", checkResult);
            }
        } catch (result) {
            console.log(colors("red", `检查apksigner失败: ${result.message}`));
            throw result;
        }

        let certificateInfo = { "keystore": "", "keyStorePassword": "", "alias": "", "keyPassword": "" };
        try {
            let info = DataHelper.instance.getCertificateInfo("android", this._isDebug);
            if (!info) {
                throw new Result(-1, `android平台的秘钥配置信息不存在 请检查config.json中的 android platform 下的 certificate 配置`);
            }
            if (!info.keystore || !info.keyStorePassword || !info.alias || !info.keyPassword) {
                throw new Result(-1, `android平台的秘钥配置信息错误 certificate 的格式为 { release: { keystore: "", keyStorePassword: "", alias: "", keyPassword: "" }, debug: ... }`);
            }
            if (path.isAbsolute(info.keystore)) {
                certificateInfo.keystore = info.keystore;
            } else {
                certificateInfo.keystore = path.join(DataHelper.instance.path, info.keystore);
            }
            certificateInfo.keyStorePassword = info.keyStorePassword;
            certificateInfo.alias = info.alias;
            certificateInfo.keyPassword = info.keyPassword;
        } catch (result) {
            console.log(colors("red", `证书配置错误: ${result.message}`));
            throw result;
        }

        let options = ["sign",
            "--ks", certificateInfo.keystore, 
            "--ks-key-alias", certificateInfo.alias,
            "--ks-pass", `pass:${certificateInfo.keyStorePassword}`,
            "--key-pass", `pass:${certificateInfo.keyPassword}`,
            "--v1-signing-enabled", "true",
            "--v2-signing-enabled", "true",
            apkfile
        ];
        let result = await RunCommand(apksigner, options);
        if (result.code == 0) {
            console.log(colors("green", "签名成功"));
        } else {
            console.log(colors("red", "签名失败"));
            throw result;
        }
    }

    async ossUpload() {
        let publish = DataHelper.instance.publish;
        if (!publish.endsWith('/')) {
            publish += '/';
        }
        let oss = new OssUpload(path.join(DataHelper.instance.project, 'publish', this._apkname), publish + this._versionCode);
        await oss.upload();
    }

    async notificationFeishu() {
        let ossUrl = DataHelper.instance.ossUrl;
        let url = ossUrl + DataHelper.instance.publish;
        if (!url.endsWith('/')) {
            url += '/';
        }
        url += (this._versionCode + '/' + this._apkname);
        await new NotificationFeishu().nativeSend(this._channel, this._versionCode, this._buildCode, url, null, this._isDebug);
    }
}

module.exports = BuildAndroid

// TODO::test
// BuildAndroid.start("official", "0.0.1", 1, true)