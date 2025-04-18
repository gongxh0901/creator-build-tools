/**
 * @Author: Gongxh
 * @Date: 2025-03-13
 * @Description: 构建Creator3.8项目
 */

const fs = require('fs');
const path = require('path');
const { RunCommand } = require('../utils/Command');
const ManifestGenerator = require('../hotupdate/ManifestGenerator');
const Result = require('../utils/Result');
const DataHelper = require('../utils/DataHelper');
class BuildCreator3_8 {
    /**
     * 开始
     * @param {string} channel 
     * @param {string} version 
     * @param {boolean} isDebug  
     */
    static async start(channel, version, isDebug) {
        let creator = DataHelper.instance.creator;
        let project = DataHelper.instance.project;

        let result = await this.modifyGameVersion(version, project);
        if (result.code != 0) {
            throw new Result(-1, result.message);
        }

        await this.build(creator, project, channel, version, isDebug);
        // 构建成功后 如果需要 执行热更新manifest文件生成

        let platform = DataHelper.instance.getChannelPlatform(channel);
        if (platform === "ios" || platform === "android" || platform === "ohos") {
            // 修改main.js文件 插入热更新代码
            this.modifyMainJs(platform, version);

            // 执行热更新manifest文件生成脚本
            new ManifestGenerator().start(version, "0", platform, isDebug);
        }
    }

    /** 修改游戏内配置的版本号 跟包本身的版本号无关 */
    static async modifyGameVersion(version, project) {
        return new Promise((resolve, reject) => {
            let versionJson = path.join(project, 'assets', 'version.json');
            let data = {
                "version": version
            }
            fs.writeFile(versionJson, JSON.stringify(data), (err) => {
                if (err) {
                    reject(new Result(-1, "修改游戏内配置的版本号失败", err));
                } else {
                    console.log("项目中配置版本号修改成功");
                    resolve(new Result(0, "修改完成"));
                }
            });
        });
    }

    static async build(creator, project, channel, versionCode, isdebug) {
        let platform = DataHelper.instance.getChannelPlatform(channel);
        let buildParam = `stage=build;platform=${platform}`;

        if (isdebug && platform !== "wechatgame" && platform !== "bytedance-mini-game") {
            buildParam += ";debug=true";
        } else {
            buildParam += ";debug=false";
        }
        // 如果是小游戏平台 设置server地址
        if (DataHelper.instance.isMini(channel)) {
            buildParam += `;server=${DataHelper.instance.getRemoteUrl(channel, isdebug, versionCode)}`;
        }

        let buildConfigPath = DataHelper.instance.getChannelConfig(channel);
        if (buildConfigPath && fs.existsSync(path.join(process.cwd(), buildConfigPath))) {
            buildParam += `;configPath=${buildConfigPath}`;
        }

        let options = [
            "--project", project,
            "--build", buildParam
        ];
        let result = await RunCommand(creator, options);
        if (result.code == 36) {
            console.log("构建成功");
        } else {
            throw result;
        }
    }

    /** 修改main.js文件 插入热更新代码 */
    static modifyMainJs(platform, version) {
        if (!DataHelper.instance.hasHotupdatePlatform(platform)) {
            console.warn(`平台【${platform}】没有热更新配置 跳过修改main.js文件`);
            return;
        }
        let mainJsPath = path.join(DataHelper.instance.getHotupdateSrc(platform), "main.js");
        if (!fs.existsSync(mainJsPath)) {
            throw new Result(-1, "main.js文件不存在:" + mainJsPath);
        }

        let inject_script = `
(function () {
    if (typeof window.jsb === 'object') {
        // 保存的版本号
        let saveVersion = localStorage.getItem('hotupdate::version');
        // 保存的搜索路径
        let searchPaths = localStorage.getItem('hotupdate::searchpaths');
        // 获取游戏包的版本号
        let version = "0.0.1";
        if (!saveVersion || saveVersion != version ) {
            console.log('版本不同，清理资源搜索路径 游戏版本号:' + version + ' 保存的版本号:' + saveVersion);
            localStorage.setItem('hotupdate::searchpaths', null);
            searchPaths = null;
        }
        console.log('保存的搜索路径:' + searchPaths);
        if (searchPaths) {
            let paths = JSON.parse(searchPaths);
            jsb.fileUtils.setSearchPaths(paths);

            let fileList = [];
            let storagePath = paths[0] || '';
            let tempPath = storagePath + '_temp/';
            let baseOffset = tempPath.length;

            if (jsb.fileUtils.isDirectoryExist(tempPath) && !jsb.fileUtils.isFileExist(tempPath + 'project.manifest.temp')) {
                jsb.fileUtils.listFilesRecursively(tempPath, fileList);
                fileList.forEach(srcPath => {
                    let relativePath = srcPath.substr(baseOffset);
                    let dstPath = storagePath + relativePath;

                    if (srcPath[srcPath.length] == '/') {
                        jsb.fileUtils.createDirectory(dstPath);
                    } else {
                        if (jsb.fileUtils.isFileExist(dstPath)) {
                            jsb.fileUtils.removeFile(dstPath);
                        }
                        jsb.fileUtils.renameFile(srcPath, dstPath);
                    }
                })
                jsb.fileUtils.removeDirectory(tempPath);
            }
        }
    }
})();
`;
        // 替换游戏版本号
        inject_script = inject_script.replace('let version = "0.0.1"', `let version = "${version}"`);

        let data = fs.readFileSync(mainJsPath, 'utf-8');
        var newStr = inject_script + data;
        fs.writeFileSync(mainJsPath, newStr);
    }
}

module.exports = BuildCreator3_8
