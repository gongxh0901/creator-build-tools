/**
 * @Author: Gongxh
 * @Date: 2025-03-13
 * @Description: 构建安卓apk
 */

const fs = require('fs');
const path = require('path');
const DataHelper = require('../../utils/DataHelper');
const Result = require('../../utils/Result');
const ChannelBuilderBase = require('../base/ChannelBuilderBase');
const Logger = require('../../utils/Logger');
const { RunCommand } = require('../../utils/Command');
const { ModeType, ErrCode } = require('../../header/Header');
const OssUpload = require('../upload/OssUpload');

class AndroidBuilder extends ChannelBuilderBase {
    /**
     * 构建号
     * @type {string}
     * @private
     */
    _buildCode = "";

    /**
     * @param {string} channel 渠道
     * @param {string} version 版本号
     * @param {"debug" | "release"} mode debug / release
     * @param {string} build 构建号
     * @public
     */
    constructor(channel, version, mode, build) {
        Logger.blue(`==================== 构建安卓apk ====================`);
        super(channel, version, mode);
        this._buildCode = build;

        Logger.log(`android工程路径:${this._project}`);
        Logger.log(`渠道:${this._channel}`);
        Logger.log(`版本:${this._version}`);
        Logger.log(`构建号:${this._buildCode}`);
        Logger.log(`模式:${this._mode}`);
    }

    /**
     * 构建
     * @protected
     */
    async onBuild() {
        try {
            // 修改版本号
            this.modifyBuildGradle();

            // 构建apk
            await this.buildApk();

            // 拷贝apk到publish目录
            this.copyApkToPublish();

            // 给apk签名
            await this.signature();

            // 上传apk到cdn
            await this.ossUpload();
            Logger.blue("打包安卓apk成功");
        } catch (error) {
            Logger.error(`安卓apk打包失败 code:${error.code} message:${error.message}`);
            throw new Result(ErrCode.AndroidError, "安卓apk打包失败", error);
        }
    }

    /**
     * 修改build.gradle文件中的版本号和build号
     * @private
     * @returns {void}
     */
    modifyBuildGradle() {
        let nativePath = path.join(DataHelper.base.project, DataHelper.platforms.getNativeProject(this._platform));

        let gradle = path.join(nativePath, 'build.gradle');

        if (!fs.existsSync(gradle)) {
            throw new Result(ErrCode.FileNotFound, `修改android版本号失败 未找到: ${nativePath}`);
        }
        // 修改build.gradle文件
        // 找到 versionCode和versionName所在的行 修改后替换，然后写入文件
        let content = fs.readFileSync(gradle, 'utf8');

        let versionCodeLine = content.match(/versionCode\s+(\d+)/);
        let versionNameLine = content.match(/versionName\s+"([^"]+)"/);

        // 替换versionCode和versionName
        content = content.replace(versionCodeLine[0], `versionCode ${this._buildCode}`);
        content = content.replace(versionNameLine[0], `versionName "${this._version}"`);
        fs.writeFileSync(gradle, content);
        Logger.success(`版本号修改成功 version:${this._version} build:${this._buildCode}`);
    }

    /**
     * 构建apk
     * @private
     * @returns {Promise<void>}
     */
    async buildApk() {
        // 获取 gradlew 路径
        const isWindows = require('os').platform() === 'win32';
        const gradlewDir = path.join(this._project, "proj");
        const gradlewPath = path.join(gradlewDir, isWindows ? 'gradlew.bat' : 'gradlew');
        Logger.blue(`gradlew项目目录:${gradlewDir}`);
        Logger.blue(`gradlew路径:${gradlewPath}`);

        // 清理构建缓存
        let result1 = await RunCommand(gradlewPath, ['clean'], gradlewDir);
        if (result1.code !== 0) {
            throw new Result(ErrCode.GradlewClean, "清理构建缓存失败", result1);
        }
        Logger.blue("清理构建缓存完成");

        // 执行gradlew命令 打包apk
        let options = [this._mode === ModeType.DEBUG ? 'assembleDebug' : 'assembleRelease'];
        let result2 = await RunCommand(gradlewPath, options, gradlewDir);
        if (result2.code !== 0) {
            throw new Result(ErrCode.GradlewBuild, "打包构建失败", result2);
        }
    }

    /**
     * 拷贝apk到publish目录
     * @private
     * @returns {void}
     */
    copyApkToPublish() {
        let moduleName = this.getModuleName();
        if (!moduleName) {
            return;
        }
        // 拼接apk所在的路径
        let apkfile = path.join(this._project, 'build', 'moduleName', 'outputs', 'apk', this._mode, `moduleName-${this._mode}.apk`);
        // 检查文件是否存在
        if (!fs.existsSync(apkfile)) {
            Logger.warn(`拷贝apk到publish目录失败: ${apkfile}不存在apk文件`);
            return;
        }
        // 拷贝apk到指定目录
        let publish = path.join(DataHelper.base.project, 'publish');
        if (!fs.existsSync(publish)) {
            Logger.log(`${publish}目录不存在, 创建目录`);
            fs.mkdirSync(publish, { recursive: true });
        }

        this._apkname = `${moduleName}-${this._channel}-v${this._version}.${this._buildCode}-${this._mode}.apk`;
        let output = path.join(publish, this._apkname);

        // 目标目录下已经存在同名文件
        if (fs.existsSync(output)) {
            Logger.warn(`${output}文件已存在, 删除文件`);
            fs.unlinkSync(output);
        }
        // 拷贝apk到指定目录
        fs.copyFileSync(apkfile, output);
    }

    /**
     * 从 settings.gradle 中读取模块名
     * @private
     * @returns {string} 模块名
     */
    getModuleName() {
        // 获取项目模块的名称
        const settingsGradlePath = path.join(this._project, 'proj', 'settings.gradle');
        if (!fs.existsSync(settingsGradlePath)) {
            Logger.warn(`拷贝apk到publish目录失败: ${settingsGradlePath}文件不存在, 跳过拷贝`);
            return "";
        }
        const content = fs.readFileSync(settingsGradlePath, 'utf8');
        
        // 方法1: 匹配 project(':app').name = "xxx"
        let match = content.match(/project\s*\(\s*['"]?:app['"]?\s*\)\s*\.\s*name\s*=\s*["']([^"']+)["']/);
        if (match) {
            return match[1];
        }
        
        // 方法2: 匹配 rootProject.name = "xxx"
        match = content.match(/rootProject\s*\.\s*name\s*=\s*["']([^"']+)["']/);
        if (match) {
            return match[1];
        }
        Logger.warn("无法从 settings.gradle 中读取模块名");
        return '';
    }

    /** 
     * 安卓包签名 
     * @private
     * @returns {Promise<void>}
     */
    async signature() {
        let apkfile = path.join(DataHelper.base.project, 'publish', this._apkname);
        Logger.tips(`给apk签名:${apkfile}`);

        // 检查环境变量 apksigner 是否设置
        const apksigner = process.env.APKSIGNER;
        Logger.log("检查环境变量 apksigner:" + apksigner);
        const checkResult = await RunCommand(apksigner, ['--version']);
        if (checkResult.code !== 0) {
            throw new Result(ErrCode.AndriodSignerNotFound, "未找到apksigner工具，请确保已安装Android SDK并设置APKSIGNER环境变量", checkResult);
        }

        let options = ["sign",
            "--ks", DataHelper.certificates.getCert(this._platform, this._mode),
            "--ks-key-alias", DataHelper.certificates.getAlias(this._platform, this._mode),
            "--ks-pass", `pass:${DataHelper.certificates.getStorePassword(this._platform, this._mode)}`,
            "--key-pass", `pass:${DataHelper.certificates.getKeyPassword(this._platform, this._mode)}`,
            "--v1-signing-enabled", "true",
            "--v2-signing-enabled", "true",
            apkfile
        ];
        let result = await RunCommand(apksigner, options);
        if (result.code == 0) {
            Logger.success("签名成功");
        } else {
            throw new Result(ErrCode.AndroidSignFailed, `android包签名失败 code:${result.code} message:${result.message}`, result);
        }
    }

    /**
     * 上传apk到cdn
     * @private
     * @returns {Promise<void>}
     */
    async ossUpload() {
        let apkfile = path.join(DataHelper.base.project, 'publish', this._apkname);
        await new OssUpload(apkfile, `publish/${this._version}`, 300).start();
    }
}

module.exports = AndroidBuilder;