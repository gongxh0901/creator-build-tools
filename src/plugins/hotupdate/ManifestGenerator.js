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
const Logger = require('src/utils/Logger');

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
            await this.generateAssetMD5();
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
     */
    onBaseInfo() {
        let url = DataHelper.oss.getRemoveUrl(this._modeType, this._platform, this._version);
        
        // 资源在cdn上的地址 拼接上资源版本号
        this._manifest.packageUrl = `${url}/${this._resVersion}`;
        // project.manifest在cdn上的地址
        this._manifest.remoteManifestUrl = `${url}/${this._resVersion}/project.manifest`;
        // version.manifest在cdn上的地址
        this._manifest.remoteVersionUrl = `${url}/version.manifest`;
        // 资源版本号
        this._manifest.version = this._resVersion;
    }

    /**
     * 获取creator编译后产出的文件, 生成文件的md5比对码,
     * 之后写入到 this._manifest 中的 assets中
     */
    async generateAssetMD5() {
        try {
            const src = DataHelper.hotupdate.getSrc(this._platform);
            const srcFiles = FileUtils.getAllFiles(path.join(src, 'src'));
            const assetsFiles = FileUtils.getAllFiles(path.join(src, 'assets'));
            const jsbAdapterFiles = FileUtils.getAllFiles(path.join(src, 'jsb-adapter'));
            // 所有文件路径相对于src的路径
            let allFiles = srcFiles.concat(assetsFiles).concat(jsbAdapterFiles);
    
            for (let file of allFiles) {
                const filepath = path.join(src, file);
                const stat = fs.statSync(filepath);
                const size = stat['size'];
                const md5 = crypto.createHash('md5').update(fs.readFileSync(filepath)).digest('hex');
                let compressed = path.extname(filepath).toLowerCase() === '.zip';
    
                this._manifest.assets[file] = {
                    'size': size,
                    'md5': md5
                };
                if (compressed) {
                    this._manifest.assets[file].compressed = true;
                }
            }
        } catch (error) {
            throw new Result(-1, `生成资产md5失败: ${error.message}`);
        }
    }

    /**
     * 写入manifest文件到项目中
     */
    async onWriteManifestToProject() {
        let dest = DataHelper.hotupdate.getDest(this._platform);
        let filepath = path.join(dest, 'project.manifest');
        await FileUtils.writeFile(filepath, JSON.stringify(this._manifest));
    }

    /**
     * 向构建后的资源中的manifest文件中写入内容
     */
    async onWriteManifestToBuildSrc() {
        let dir = DataHelper.hotupdate.getManifest(this._platform);
        let manifestFiles = this._findManifestFiles(dir);
        if (manifestFiles.length === 0) {
            throw new Result(-1, `【hotupdate.json】文件中配置的【manifest】路径下不存在 manifest文件`);
        }
        if (manifestFiles.length >= 1) {
            throw new Result(-1, `【hotupdate.json】文件中配置的【manifest】路径下存在多个manifest文件`);
        }
        let manifestFile = manifestFiles[0];
        await FileUtils.writeFile(manifestFile, JSON.stringify(this._manifest));
    }

    /**
     * 最后删除assets和搜索路径 写入version.manifest
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

//TODO:: ManifestGenerator
// new ManifestGenerator().start("0.5.3", 1, "android", true);