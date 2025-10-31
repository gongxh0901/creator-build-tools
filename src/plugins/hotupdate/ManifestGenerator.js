/**
 * @Author: Gongxh
 * @Date: 2025-03-13
 * @Description: 生成热更新用的manifest文件
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DataHelper = require('../../utils/DataHelper');
const FileUtils = require('../../utils/FileUtils');
const Result = require('../../utils/Result');
const Logger = require('../../utils/Logger');

class ManifestGenerator {
    /**
     * @param {string} version 游戏版本号
     * @param {string} resVersion 资源版本号
     * @param {string} platform 平台
     * @param {string} modeType 构建模式 支持 debug, release
     */
    constructor(version, resVersion, platform, modeType) {
        this._version = version;
        this._resVersion = resVersion;
        this._platform = platform;
        this._modeType = modeType;

        this._manifest = {
            remoteManifestUrl: '',
            remoteVersionUrl: '',
            version: '',
            assets: {},
            searchPaths: []
        };
    }

    /**
     * 开始生成manifest文件
     */
    async start() {
        try {
            // 设置基础信息
            this.onBaseInfo();
            // 生成资产md5  
            await this.generateMD5();
            // 写入manifest文件到项目中
            await this.onWriteManifestToProject();
            // 向构建后的资源中的manifest文件中写入内容
            await this.onWriteManifestToBuildSrc();
            // 写入version.manifest
            await this.onWriteVersionManifest();
        } catch (error) {
            Logger.error(`生成热更新manifest文件失败: ${error.message}`);
            throw new Result(-1, `生成热更新manifest文件失败: ${error.message}`);
        }
    }


    /**
     * 设置基础信息
     * @private
     */
    onBaseInfo() {
        let url = DataHelper.oss.getHotupdateRemotePath(this._modeType, this._version, this._platform);

        // 资源在cdn上的地址 拼接上资源版本号
        this._manifest.packageUrl = `${url}/${this._resVersion}`;
        // project.manifest在cdn上的地址
        this._manifest.remoteManifestUrl = `${url}/${this._resVersion}/project.manifest`;
        // version.manifest在cdn上的地址
        this._manifest.remoteVersionUrl = `${url}/version.manifest`;
        // 资源版本号
        this._manifest.version = this._resVersion;

        Logger.log(`packageUrl: ${this._manifest.packageUrl}`);
        Logger.log(`remoteManifestUrl: ${this._manifest.remoteManifestUrl}`);
        Logger.log(`remoteVersionUrl: ${this._manifest.remoteVersionUrl}`);
        Logger.log(`version: ${this._manifest.version}`);
    }

    /**
     * 获取creator编译后产出的文件, 生成文件的md5比对码,
     * 之后写入到 this._manifest 中的 assets中
     * @private
     */
    async generateMD5() {
        try {
            const src = DataHelper.hotupdate.getSrc(this._platform);
            Logger.log(`编译后的资源路径:${src}`);

            const srcFiles = FileUtils.getAllFiles(path.join(src, 'src'));
            for (let file of srcFiles) {
                let {key, size, md5, compressed} = this.generateAssetMD5(src, path.join('src', file));
                this._manifest.assets[key] = { 'size': size, 'md5': md5 };
                if (compressed) {
                    this._manifest.assets[key].compressed = true;
                }
            }

            const assetsFiles = FileUtils.getAllFiles(path.join(src, 'assets'));
            for (let file of assetsFiles) {
                let {key, size, md5, compressed} = this.generateAssetMD5(src, path.join('assets', file));
                this._manifest.assets[key] = { 'size': size, 'md5': md5 };
                if (compressed) {
                    this._manifest.assets[key].compressed = true;
                }
            }

            const jsbAdapterFiles = FileUtils.getAllFiles(path.join(src, 'jsb-adapter'));
            for (let file of jsbAdapterFiles) {
                let {key, size, md5, compressed} = this.generateAssetMD5(src, path.join('jsb-adapter', file));
                this._manifest.assets[key] = { 'size': size, 'md5': md5 };
                if (compressed) {
                    this._manifest.assets[key].compressed = true;
                }
            }
        } catch (error) {
            throw new Result(-1, `生成资产md5失败: ${error.message}`);
        }
    }


    /**
     * 生成单个资产的md5
     * @param {string} src 源文件夹路径
     * @param {string} filepath 文件路径
     */
    generateAssetMD5(src, filepath) {
        const fullpath = path.join(src, filepath);
        const stat = fs.statSync(fullpath);
        const size = stat['size'];
        const md5 = crypto.createHash('md5').update(fs.readFileSync(fullpath)).digest('hex');
        let compressed = path.extname(fullpath).toLowerCase() === '.zip';
        // windows路径转linux路径
        const key = filepath.replace(/\\/g, '/');
        return {key, size, md5, compressed};
    }

    /**
     * 写入manifest文件到项目中
     * @private
     */
    async onWriteManifestToProject() {
        let dest = DataHelper.hotupdate.getDest(this._platform);
        let filepath = path.join(dest, 'project.manifest');
        await FileUtils.writeFile(filepath, JSON.stringify(this._manifest));
    }

    /**
     * 向构建后的资源中的manifest文件中写入内容
     * @private
     */
    async onWriteManifestToBuildSrc() {
        let dir = DataHelper.hotupdate.getManifest(this._platform);
        let manifestFiles = this._findManifestFiles(dir);
        if (manifestFiles.length === 0) {
            throw new Result(-1, `【hotupdate.json】文件中配置的【manifest】路径下不存在 manifest文件`);
        }
        if (manifestFiles.length > 1) {
            throw new Result(-1, `【hotupdate.json】文件中配置的【manifest】路径下存在多个manifest文件`);
        }
        let manifestFile = manifestFiles[0];
        await FileUtils.writeFile(manifestFile, JSON.stringify(this._manifest));
    }

    /**
     * 最后删除assets和搜索路径 写入version.manifest
     * @private
     */
    async onWriteVersionManifest() {
        // 最后删除assets和搜索路径 写入version.manifest
        delete this._manifest.assets;
        delete this._manifest.searchPaths;
        let filepath = path.join(DataHelper.hotupdate.getDest(this._platform), 'version.manifest');
        await FileUtils.writeFile(filepath, JSON.stringify(this._manifest));
    }


    /**
     * 在配置的文件夹中递归查找 .manifest 后缀的文件
     * @private
     * @param {string} dir 源文件夹路径
     * @returns {string[]} 返回所有找到的.manifest文件的绝对路径数组
     * @private
     */
    _findManifestFiles(dir) {
        let results = [];
        let list = fs.readdirSync(dir);
        list.forEach((file) => {
            let filePath = path.join(dir, file);
            let stat = fs.statSync(filePath);
            
            if (stat && stat.isDirectory()) {
                // 递归查找子文件夹
                results = results.concat(this._findManifestFiles(filePath));
            } else {
                // 检查文件扩展名
                if (path.extname(file).toLowerCase() === '.manifest') {
                    results.push(filePath);
                }
            }
        });
        return results;
    }
}

module.exports = ManifestGenerator;