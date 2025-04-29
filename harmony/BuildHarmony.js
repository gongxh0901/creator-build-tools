/**
 * @Author: Gongxh
 * @Date: 2025-04-25
 * @Description: 构建鸿蒙hap和app包
 */

const { RunCommand } = require('../utils/Command');
const fs = require('fs');
const path = require('path');
const colors = require('./../utils/Colors');
const Result = require('./../utils/Result');
const OssUpload = require('./../oss/AliyOssUpload');
const NotificationFeishu = require('./../NotificationFeishu/NotificationFeishu');
const DataHelper = require('../utils/DataHelper');
const { isUndefined } = require('util');

class BuildHarmony {
    static _versionCode = "";
    static _buildCode = 0;
    static _isDebug = false;
    /** 是否发送飞书通知 */
    static _isSend = true;

    static _hapName = "";
    static _appName = "";

    static __project = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformBuildPath("harmonyos-next"));
    static __native = path.join(DataHelper.instance.project, DataHelper.instance.getPlatformNativePath("harmonyos-next"));

    static async start(version, build, isDebug, isSend) {
        this._versionCode = version;
        this._buildCode = build;
        this._isDebug = isDebug;
        this._isSend = isSend;

        console.log(colors("magenta", "鸿蒙项目路径:" + this.__native));

        // 把最终的apk文件名拼好
        this._hapName = `v${version}.${build}-harmony-${isDebug ? 'debug' : 'release'}.hap`;
        this._appName = `v${version}.${build}-harmony-${isDebug ? 'debug' : 'release'}.app`;

        this.modifyGameVersion(version, build);
        await this.buildApp(isDebug);

        try {
            await this.ossUpload();
            if (this._isSend) {
                await this.notificationFeishu();
            }
        } catch (error) {
            console.log(colors("red", "鸿蒙包上传到cdn失败, 跳过飞书通知"), error);
        }
    }

    /** 修改版本号 */
    static modifyGameVersion(version, build) {
        let appJsonPath = path.join(this.__native, 'AppScope', 'app.json5');
        let appInfo = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        appInfo.app.versionCode = build;
        appInfo.app.versionName = version;
        fs.writeFileSync(appJsonPath, JSON.stringify(appInfo, null, 2));
        console.log(colors("green", "版本号修改成功 version:" + version + " build:" + build));
    }

    /** 获取证书配置信息 转换后的 */
    static getCertificateInfo(isDebug) {
        // 修改证书配置信息
        let certificateInfo = { storePassword: "", certpath: "", keyAlias: "", keyPassword: "", profile: "", signAlg: "", storeFile: "" };
        try {
            let info = DataHelper.instance.getCertificateInfo("harmonyos-next", isDebug);
            if (!info) {
                throw new Result(-1, `harmony平台的秘钥配置信息不存在 请检查config.json中的 harmonyos-next platform 下的 certificate 配置`);
            }
            if (!info.storePassword || !info.certpath || !info.keyAlias || !info.keyPassword || !info.profile || !info.signAlg || !info.storeFile) {
                throw new Result(-1, `harmony平台的秘钥配置信息错误 certificate 的格式为 { release: { storePassword: "", certpath: "", keyAlias: "", keyPassword: "", profile: "", signAlg: "", storeFile: "" }, debug: ...}`);
            }

            certificateInfo.storePassword = info.storePassword;
            certificateInfo.certpath = path.isAbsolute(info.certpath) ? info.certpath : path.join(DataHelper.instance.path, info.certpath);
            certificateInfo.keyAlias = info.keyAlias;
            certificateInfo.keyPassword = info.keyPassword;
            certificateInfo.profile = path.isAbsolute(info.profile) ? info.profile : path.join(DataHelper.instance.path, info.profile);
            certificateInfo.signAlg = info.signAlg;
            certificateInfo.storeFile = path.isAbsolute(info.storeFile) ? info.storeFile : path.join(DataHelper.instance.path, info.storeFile);
        } catch (result) {
            console.log(colors("red", `证书配置错误: ${result.message}`));
            throw result;
        }
        return certificateInfo;
    }

    /** 修改证书配置 */
    static modifyCertificateConfig(isDebug) {
        // 修改证书配置信息
        let certificateInfo = this.getCertificateInfo(isDebug);

        let profilePath = path.join(this.__native, 'build-profile.json5');
        let profileInfo = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        profileInfo.app = profileInfo.app || {};
        if (!Array.isArray(profileInfo.app.signingConfigs)) {
            profileInfo.app.signingConfigs = [{
                name: "default",
                type: "HarmonyOS",
                material: certificateInfo
            }];
        } else if (profileInfo.app.signingConfigs.length == 0) {
            profileInfo.app.signingConfigs = [{
                name: "default",
                type: "HarmonyOS",
                material: certificateInfo
            }];
        } else {
            profileInfo.app.signingConfigs[0].material = certificateInfo;
        }
        fs.writeFileSync(profilePath, JSON.stringify(profileInfo, null, 2));
        console.log(colors("green", "修改证书配置信息完成"));
    }

    /** 鸿蒙hap只用debug证书签名 */
    static async signatureHap(inFile, outFile) {
        // 如果输入文件不存在
        if (!fs.existsSync(inFile)) {
            throw new Result(-1, '打包生成的鸿蒙hap文件不存在');
        }
        if (!process.env.HAP_SIGN_TOOL) {
            throw new Result(-1, 'hap签名工具环境变量未配置 需添加环境变量HAP_SIGN_TOOL 值为 ${COMMANDLINE_TOOL_DIR}/command-line-tools/sdk/default/openharmony/toolchains/lib');
        }
        let hapSignTool = path.join(process.env.HAP_SIGN_TOOL, 'hap-sign-tool.jar');
        if (!fs.existsSync(hapSignTool)) {
            throw new Result(-1, 'hap签名工具不存在 检查环境变量HAP_SIGN_TOOL的值所在文件夹下是否存在hap-sign-tool.jar文件');
        }
        let certificateInfo = this.getCertificateInfo(true);
        // .cer调试证书文件
        let cerPath = certificateInfo.certpath;
        // .p7b的调试Profile文件
        let profilePath = certificateInfo.profile;
        // .p12的密钥库文件
        let keystorePath = certificateInfo.storeFile;

        let result = await RunCommand('java', ['-jar', hapSignTool, 'sign-app', '-signAlg', certificateInfo.signAlg, '-mode', 'localSign', '-keyAlias', certificateInfo.keyAlias, '-keyPwd', certificateInfo.keyPassword, '-keystorePwd', certificateInfo.storePassword, '-appCertFile', cerPath, '-profileFile', profilePath, '-keystoreFile', keystorePath, '-inFile', inFile, '-outFile', outFile, '-signCode', '1']);
        if (result.code != 0) {
            console.log(colors("red", "鸿蒙hap签名失败"));
            throw result;
        }
        console.log(colors("green", "鸿蒙hap签名成功"));
    }

    /** 构建鸿蒙app */
    static async buildApp(isDebug) {
        // 切换工作目录到鸿蒙项目目录下
        process.chdir(this.__native);

        // 清理构建缓存
        await RunCommand('hvigorw', ['clean', '--no-daemon']);
        console.log(colors("green", "清理构建缓存完成"));

        // 安装工程及模块依赖
        await RunCommand('ohpm', ['install', '--all']);
        
        // 修改证书配置信息 这里只用正式的证书信息
        this.modifyCertificateConfig(false);
        
        console.log("执行打包命令");
        if (isDebug) {
            // 生成hap
            let resultHAP = await RunCommand('hvigorw', ['assembleHap', '--mode', 'module', '-p', 'product=default', '-p', `buildMode=debug`, '--no-daemon']);
            if (resultHAP.code != 0) {
                console.log(colors("red", "鸿蒙hap打包失败"));
                throw resultHAP;
            }
            console.log(colors("green", "鸿蒙未签名hap打包完成吗，准备签名"));
        } else {
            // 打包app 会同时产出hap
            let resultAPP = await RunCommand('hvigorw', ['assembleApp', '--mode', 'project', '-p', 'product=default', '-p', `buildMode=release`, '--no-daemon']);
            if (resultAPP.code != 0) {
                console.log(colors("red", "鸿蒙app打包失败"));
                throw resultAPP;
            }
            // 打包完成后，复制文件到指定文件夹
            let appFile = path.join(this.__native, 'build', 'outputs', 'default', 'harmonyos-next-default-signed.app');
            // 检查文件是否存在
            if (!fs.existsSync(appFile)) {
                throw new Result(-1, '打包生成的鸿蒙app文件不存在');
            }
            let appOutFile = path.join(DataHelper.instance.project, 'publish', this._appName);
            fs.copyFileSync(appFile, appOutFile);
        }
        // 用调试证书给hap签名
        let hapFile = path.join(this.__native, 'entry', 'build', 'default', 'outputs', 'default', `entry-default-unsigned.hap`);
        let outFile = path.join(DataHelper.instance.project, 'publish', this._hapName);
        await this.signatureHap(hapFile, outFile);

        console.log(colors("green", "鸿蒙打包成功"));
        // 打包完成再还原工作目录
        process.chdir(path.join(__dirname, '..') );
        console.log("工作目录", process.cwd());
    }

    static async ossUpload() {
        let publish = DataHelper.instance.publish;
        if (!publish.endsWith('/')) {
            publish += '/';
        }
        let cdnPath = publish + this._versionCode;
        // 上传hap
        let hapPath = path.join(DataHelper.instance.project, 'publish', this._hapName);
        let oss = new OssUpload(hapPath, cdnPath);
        await oss.upload();

        if (!this._isDebug) {
            // 上传app
            let appPath = path.join(DataHelper.instance.project, 'publish', this._appName);
            let ossApp = new OssUpload(appPath, cdnPath);
            await ossApp.upload();
        }
    }

    static async notificationFeishu() {
        let ossUrl = DataHelper.instance.ossUrl;
        let url = ossUrl + DataHelper.instance.publish;
        if (!url.endsWith('/')) {
            url += '/';
        }
        let appUrl = url + (this._versionCode + '/' + this._appName);
        let hapUrl = url + (this._versionCode + '/' + this._hapName);
        if (this._isDebug) {
            await new NotificationFeishu().nativeSend("harmonyos-next", this._versionCode, this._buildCode, hapUrl, null, this._isDebug);    
        } else {
            await new NotificationFeishu().nativeSend("harmonyos-next", this._versionCode, this._buildCode, appUrl, hapUrl, this._isDebug);
        }
    }
}

module.exports = BuildHarmony

// TODO::test
// BuildHarmony.start("0.0.1", 1, false, true)