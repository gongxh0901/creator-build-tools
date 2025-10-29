/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: Creator项目构建器
 */

const fs = require('fs');
const path = require('path');
const CreatorBuilderBase = require('../base/CreatorBuilder');
const Result = require('../../utils/Result');
const DataHelper = require('../../utils/DataHelper');
const { ModeType } = require('../../header/Header');
const { RunCommand } = require('../../utils/Command');
const Logger = require('../../utils/Logger');
const ManifestGenerator = require('../hotupdate/ManifestGenerator');
class CreatorBuilder3_8 extends CreatorBuilderBase {

    async onBuildBefore() {
        // 修改游戏内配置文件的版本号
        return new Promise((resolve, reject) => {
            let versionJson = path.join(this._project, 'assets', 'version.json');
            if (fs.existsSync(versionJson)) {
                let data = {
                    "version": this._version
                }
                fs.writeFile(versionJson, JSON.stringify(data), (err) => {
                    if (err) {
                        reject(new Result(-1, "修改【assets/version.json】文件失败", err));
                    } else {
                        resolve(new Result(0, "修改【assets/version.json】文件成功"));
                    }
                });
            } else {
                resolve(new Result(0, "项目assets/version.json文件不存在 跳过修改游戏内版本配置"));
            }
        });
    }

    async onBuild() {
        // 构建打包参数
        let buildParam = `stage=build;platform=${this._platform}`;

        if (this._modeType === ModeType.DEBUG) {
            buildParam += ";debug=true";
        } else {
            buildParam += ";debug=false";
        }

        // 如果是小游戏平台 设置server地址
        if (DataHelper.platforms.isRemote(this._platform)) {
            buildParam += `;server=${DataHelper.oss.getRemoveUrl(this._modeType, this._platform, this._version)}`;
        }

        let buildConfigPath = DataHelper.channels.getBuilderConfig(this._channel);
        if (buildConfigPath && fs.existsSync(path.join(process.cwd(), buildConfigPath))) {
            buildParam += `;configPath=${buildConfigPath}`;
        }

        let options = [
            "--project", this._project,
            "--build", buildParam
        ];
        // 自定义引擎配置
        if (DataHelper.base.isCustomEngine) {
            options.push("--engine", DataHelper.base.customEngine);
        }

        // 执行构建命令
        let result = await RunCommand(this._creator, options);
        if (result.code !== 36) {
            return result;
        }
        return new Result(0, `构建完成`);
    }

    async onBuildAfter() {
        // 处理热更新的manifest文件
        // 构建成功后 如果需要 执行热更新manifest文件生成
        let needHotUpdate = DataHelper.hotupdate.isNeed(this._platform);
        if (needHotUpdate) {
            // 修改main.js文件 插入热更新代码
            let modifyMainJsResult = await this.modifyMainJs();
            if (modifyMainJsResult.code !== 0) {
                return modifyMainJsResult;
            }

            // 生成manifest文件
            const result = await new ManifestGenerator(this._version, this._resVersion, this._platform, this._modeType).start();
            if (result.code !== 0) {
                return result;
            }
        } else {
            Logger.log(`平台【${this._platform}】不需要热更新 跳过修改main.js文件和生成manifest文件`);
        }
        return new Result(0, "构建后处理完成");
    }

    /** 修改main.js文件 插入热更新代码 */
    async modifyMainJs() {
        let mainJsPath = DataHelper.hotupdate.getMainJs(this._platform);
        if (!fs.existsSync(mainJsPath)) {
            return new Result(-1, "main.js文件不存在:" + mainJsPath);
        }
        let data = fs.readFileSync(mainJsPath, 'utf-8');
        if (data.startsWith("// 插入热更新代码到")) {
            Logger.log(`main.js文件已包含热更新代码 跳过修改`);
            return new Result(0, "main.js文件已包含热更新代码 跳过修改");
        }

        let contentPath = path.join(__dirname, '..', '..', '..', 'config', 'hot-mainjs.txt');
        if (!fs.existsSync(contentPath)) {
            return new Result(-1, "hot-mainjs.txt文件不存在 请检查config目录下是否存在该文件");
        }
        let content = fs.readFileSync(contentPath, 'utf-8');

        // 替换游戏版本号
        content = content.replace('let version = "0.0.1"', `let version = "${this._version}"`);

        var newStr = content + '\n' + data;
        fs.writeFileSync(mainJsPath, newStr);
        Logger.log(`修改main.js文件成功:${mainJsPath}`);
        return new Result(0, "修改main.js文件成功");
    }
}

module.exports = CreatorBuilder3_8;

new CreatorBuilder3_8("taptap", "1.0.0", "debug", "0").start();