/**
 * @Author: Gongxh
 * @Date: 2025-03-13
 * @Description: 生成热更新用的manifest文件
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const colors = require('../utils/Colors');
const Result = require('../utils/Result');
const DataHelper = require('../utils/DataHelper');

let manifest = {
    remoteManifestUrl: '',
    remoteVersionUrl: '',
    version: '',
    assets: {},
    searchPaths: []
};

class ManifestGenerator {
    async start(gameVersion, hotVersion, platform, isDebug) {
        if (!DataHelper.instance.hasHotupdatePlatform(platform)) {
            throw new Result(-1, `平台[${platform}]对应的热更新配置不存在，请检查配置文件 config.json`);
        }

        // 检查url是否以/结尾 如果不是则添加/
        let cdnUrl = DataHelper.instance.getHotupdateCdn(platform, isDebug);
        if (cdnUrl.endsWith('/')) {
            cdnUrl = cdnUrl.slice(0, -1);
        }
        manifest.packageUrl = `${cdnUrl}/v${gameVersion}/${platform}/${hotVersion}`;
        manifest.remoteManifestUrl = `${manifest.packageUrl}/project.manifest`;
        manifest.remoteVersionUrl = `${cdnUrl}/v${gameVersion}/${platform}/version.manifest`;
        manifest.version = hotVersion + "";

        let src = DataHelper.instance.getHotupdateSrc(platform);
        let dest = DataHelper.instance.getHotupdateDest(platform);

        await this.readDir(path.join(src, 'src'), manifest.assets, src);
        await this.readDir(path.join(src, 'assets'), manifest.assets, src);
        await this.readDir(path.join(src, 'jsb-adapter'), manifest.assets, src);

        // 先写入到project.manifest
        let destManifest = path.join(dest, 'project.manifest');
        let writeResult1 = await this.writeFile(destManifest, JSON.stringify(manifest));
        if (writeResult1.code != 0) {
            throw writeResult1;
        }

        // 再查找项目构建后的资源中的manifest文件 并替换内容
        let manifestFiles = this.findManifestFiles(DataHelper.instance.getHotupdateManifest(platform));
        let manifestFile = manifestFiles.length > 0 ? manifestFiles[0] : null;
        // 这里应该就只有一个
        // 如果找到了manifest文件，则替换内容
        if (manifestFile) {
            let writeResult2 = await this.writeFile(manifestFile, JSON.stringify(manifest));
            if (writeResult2.code != 0) {
                throw writeResult2;
            }
        } else {
            console.log(colors("red", '资源目录下未找到manifest文件'));
        }

        // 最后删除assets和搜索路径 写入version.manifest
        delete manifest.assets;
        delete manifest.searchPaths;
        let destVersion = path.join(dest, 'version.manifest');
        let writeResult3 = await this.writeFile(destVersion, JSON.stringify(manifest));
        if (writeResult3.code != 0) {
            throw writeResult3;
        }
        console.log(colors("green", '生成热更新manifest文件成功'));
    }

    /**
     * 递归读取目录下的所有文件 生成assets内容
     * @param {*} dir 
     * @param {*} assets 
     */
    async readDir(dir, assets, src) {
        try {
            let stat = fs.statSync(dir);
            if (!stat.isDirectory()) {
                return;
            }
            let subpaths = fs.readdirSync(dir), subpath, size, md5, compressed, relative;
            for (let i = 0; i < subpaths.length; ++i) {
                if (subpaths[i][0] === '.') {
                    continue;
                }
                subpath = path.join(dir, subpaths[i]);
                stat = fs.statSync(subpath);
                if (stat.isDirectory()) {
                    this.readDir(subpath, assets, src);
                } else if (stat.isFile()) {
                    // Size in Bytes
                    size = stat['size'];
                    md5 = crypto.createHash('md5').update(fs.readFileSync(subpath)).digest('hex');
                    compressed = path.extname(subpath).toLowerCase() === '.zip';
    
                    relative = path.relative(src, subpath);
                    relative = relative.replace(/\\/g, '/');
                    relative = encodeURI(relative);
                    assets[relative] = {
                        'size': size,
                        'md5': md5
                    };
                    if (compressed) {
                        assets[relative].compressed = true;
                    }
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * 写入文件
     * @param {*} dest 文件路径
     * @param {*} content 内容字符串
     */
    async writeFile(dest, content) {
        return new Promise((resolve, reject) => {
            fs.writeFile(dest, content, (err) => {
                if (err) {
                    reject(new Result(-1, '写入文件失败', err));
                } else {
                    resolve(new Result(0, '写入文件成功'));
                }
            });
        });
    }

    /**
     * 查找src下的manifest文件
     * @param {*} dir 
     */
    findManifestFiles(dir) {
        // 在文件夹下及其子文件夹下查找后缀是.manifest的文件
        // 递归查找文件夹及其子文件夹中的.manifest文件
        let results = [];
        let list = fs.readdirSync(dir);
        list.forEach((file) => {
            let filePath = path.join(dir, file);
            let stat = fs.statSync(filePath);
            
            if (stat && stat.isDirectory()) {
                // 递归查找子文件夹
                results = results.concat(this.findManifestFiles(filePath));
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