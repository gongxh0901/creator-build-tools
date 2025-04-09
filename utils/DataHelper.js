/**
 * @Author: Gongxh
 * @Date: 2025-04-01
 * @Description: 
 */
const path = require('path');
const config = require('../config.json');
const colors = require('./Colors');

class DataHelper {
    static instance = new DataHelper();
    /** 所有渠道的列表 */
    __all_channels = [];

    /** 渠道配置字典 */
    __channel_maps = new Map();

    /** 平台配置字典 */
    __platform_maps = new Map();

    /** 热更新配置字典 按平台分类 */
    __hotupdate_maps = new Map();

    constructor() {
        // 检查配置格式
        if (!config.creator) {
            throw new Error('creator 路径配置不存在 请检查config.json');
        }
        console.log(colors('magenta', "creator路径" + config.creator));

        if (!config.project) {
            throw new Error('project 路径配置不存在 请检查config.json');
        }
        console.log(colors('magenta', "project路径" + config.project));

        if (!Array.isArray(config.channels) || config.channels.length == 0) {
            throw new Error('channels 配置不存在 请检查config.json');
        }
        if (!Array.isArray(config.platforms) || config.platforms.length == 0) {
            throw new Error('platforms 配置不存在 请检查config.json');
        }
        if (!process.env.OSS_URL || !this.region || !this.bucket) {
            throw new Error('oss 配置错误 请检查环境变量配置');
        }
        if (!config.oss || !this.publish) {
            throw new Error('oss 配置错误 请检查 config.json');
        }
        if (!config.feishu) {
            throw new Error('feishu 配置不存在 请检查config.json');
        }

        // 热更新配置检查
        if (!config.hotupdate) {
            console.warn('热更新配置不存在 请检查config.json 如果不需要请忽略');
        }
        this.__initHotupdateMaps();
        this.__initChannelInfos();
        this.__initPlatformInfos();
    }

    /** 
     * 获取项目路径 项目绝对路径
     * @returns {string}
     */
    get project() {
        return config.project;
    }

    /** 获取creator路径 */
    get creator() {
        return config.creator;
    }

    /** 脚本项目路径 */
    get path() {
        return path.join(__dirname, '..');
    }

    /***************** cdn相关配置获取 begin ****************/
    /** 
     * 获取oss的域名
     * @returns {string} 返回以/结尾的url
     */
    get ossUrl() {
        let ossUrl = process.env.OSS_URL || "";
        if (!ossUrl.endsWith("/")) {
            ossUrl += "/";
        }
        return ossUrl;
    }

    /** 
     * 获取oss的region
     * @returns {string}
     */
    get region() {
        return process.env.OSS_REGION || "";
    }

    /** 
     * 获取oss的bucket
     * @returns {string}
     */
    get bucket() {
        return process.env.OSS_BUCKET || "";
    }

    /** 
     * 获取发布包上传路径
     * @returns {string}
     */
    get publish() {
        return config.oss.publish;
    }
    /***************** cdn相关配置获取 end ****************/

    /***************** 飞书相关配置获取 begin ****************/
    /** 
     * 飞书图片上传机器人的appid
     * @returns {string}
     */
    get feishuAppid() {
        return process.env.FEISHU_ROBOT_APPID || "";
    }

    /** 
     * 飞书图片上传机器人的Secret
     * @returns {string}
     */
    get feishuSecret() {
        return process.env.FEISHU_ROBOT_SECRET || "";
    }

    /** 
     * 获取飞书webhook通知地址
     * @param {boolean} isDebug 是否为调试模式
     * @returns {string}
     */
    getWebhook(isDebug) {
        if (isDebug) {
            return process.env.FEISHU_ROBOT_WEBHOOK_DEBUG || "";
        } else {
            return process.env.FEISHU_ROBOT_WEBHOOK || "";
        }
    }
    /***************** 飞书相关配置获取 end ****************/


    /***************** 渠道相关配置获取 begin ****************/
    /** 
     * 获取所有渠道 包含特殊渠道: all(全渠道), native(原生渠道), minigame(小游戏渠道)
     * @returns {string[]}
     */
    allChannels() {
        return this.__all_channels;
    }

    /** 
     * 判断渠道是否有效
     * @param {string} channel 渠道
     * @returns {boolean}
     */
    isValidChannel(channel) {
        return this.__channel_maps.has(channel);
    }

    /** 获取渠道对应的平台 */
    getChannelPlatform(channel) {
        return this.__channelInfo(channel).platform;
    }

    /** 获取渠道名称 */
    getChannelName(channel) {
        return this.__channelInfo(channel).name;
    }

    /** 获取渠道对应的打包配置文件路径 */
    getChannelConfig(channel) {
        return this.__channelInfo(channel).config;
    }

    /** 是否是原生渠道 */
    isNative(channel) {
        if (channel === "native" || channel === "all") {
            return true;
        }
        let platform = this.getChannelPlatform(channel);
        if (platform === "ios" || platform === "android" || platform === "ohos") {
            return true;
        }
        return false;
    }

    /** 是否是桌面渠道 */
    isDesktop(channel) {
        if (channel === "all") {
            return true;
        }
        let platform = this.getChannelPlatform(channel);
        if (platform === "mac") {
            return true;
        }
        return false;
    }

    /** 是否是小游戏渠道 */
    isMini(channel) {
        if (channel === "minigame" || channel === "all") {
            return true;
        }
        let platform = this.getChannelPlatform(channel);
        if (platform === "wechatgame" || platform === "bytedance-mini-game" || platform === "alipay-mini-game" || platform === "huawei-quick-game" || platform === "xiaomi-quick-game" || platform === "vivo-mini-game" || platform === "oppo-mini-game" || platform === "taobao-mini-game") {
            return true;
        }
        return false;
    }

    /***************** 渠道相关配置获取 end ****************/

    /***************** 平台相关配置获取 begin ****************/

    /** 
     * 获取 原生平台 native 工程路径 (小游戏没有这个)
     * @param {string} platform 平台
     * @returns {string} 相对config中的 project 的路径
     */
    getPlatformNativePath(platform) {
        return this.__platformInfo(platform).native;
    }

    /** 
     * 获取build工程路径
     * @param {string} platform 平台
     * @returns {string} 相对config中的 project 的路径
     */
    getPlatformBuildPath(platform) {
        return this.__platformInfo(platform).build;
    }

    /** 
     * 获取打包证书 keystore 路径 (针对android平台)
     * @param {string} platform 平台
     * @returns {string} 绝对路径
     */
    getKeystore(platform) {
        let keystore = this.__platformInfo(platform).keystore;
        // 如果是绝对路径
        if (path.isAbsolute(keystore)) {
            return keystore;
        }
        return path.join(this.path, keystore);
    }

    /** 
     * 获取打包证书别名
     * @param {string} platform 平台
     * @returns {string} 
     */
    getAlias(platform) {
        return this.__platformInfo(platform).alias;
    }

    /** 
     * 获取打包证书密码 (针对android平台的 keystore)
     * @param {string} platform 平台
     * @returns {string}
     */
    getPassword(platform) {
        return this.__platformInfo(platform).password;
    }

    /** 
     * 获取小游戏appid
     * @param {string} platform 平台
     * @returns {string}
     */
    getAppid(platform) {
        return this.__platformInfo(platform).appid;
    }

    /** 
     * 获取小游戏私钥 (微信小游戏 cli打包上传需要配置私钥)
     * @param {string} platform 平台
     * @returns {string} 相对config文件的相对路径
     */
    getPrivateKey(platform) {
        return path.join(this.path, this.__platformInfo(platform).privateKey);
    }

    /** 
     * 获取小游戏远程资源上传的路径 所属存储桶下的路径
     * 最终上传会拼接上一部分路径 `remote` + dev/prod + 平台类型 + v版本号
     * @param {string} platform 平台
     * @returns {string} 
     */
    getRemote(platform) {
        return this.__platformInfo(platform).remote;
    }

    /**
     * 获取拼接后的远程资源路径
     * @param {string} channel 渠道
     * @param {boolean} isDebug 是否为调试模式
     * @param {string} version 版本号
     * @returns {string}
     */
    getRemoteUrl(channel, isDebug, version) {
        let ossUrl = this.ossUrl;
        let platform = this.getChannelPlatform(channel);
        let remote = this.getRemote(platform);
        if (!remote.endsWith("/")) {
            remote += "/";
        }
        return ossUrl + remote + (isDebug ? "dev" : "prod") + `/${platform}/v${version}`;
    }

    /***************** 平台相关配置获取 end ****************/

    /***************** 热更新相关配置获取 begin ****************/
    /**
     * 是否存在对应平台的热更新配置
     * @param {string} platform 平台
     * @returns {boolean}
     */
    hasHotupdatePlatform(platform) {
        return this.__hotupdate_maps.has(platform);
    }

    /**
     * 带域名的热更新的cdn路径
     * @param {string} platform 平台
     * @param {boolean} isDebug 是否为调试模式
     * @returns {string}
     */
    getHotupdateCdn(platform, isDebug) {
        return this.ossUrl + this.getHotupdateCdnPath(platform, isDebug);
    }

    /**
     * 不带域名的热更新的cdn路径
     * @param {string} platform 平台
     * @param {boolean} isDebug 是否为调试模式
     * @returns {string} 不带域名的路径
     */
    getHotupdateCdnPath(platform, isDebug) {
        let info = this.__hotupdateInfo(platform);
        let removeDir = isDebug ? info.cdnDebug : info.cdn;
        if (!removeDir.endsWith("/")) {
            removeDir += "/";
        }
        return removeDir;
    }

    /**
     * 热更新 menifest 文件生成的路径 相对于项目路径
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getHotupdateDest(platform) {
        let dest = this.__hotupdateInfo(platform).dest;
        if (path.isAbsolute(dest)) {
            return dest;
        }
        return path.join(this.project, dest);
    }
    
    /**
     * 获取热更新资源路径 相对于项目路径
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getHotupdateSrc(platform) {
        return path.join(this.project, this.__hotupdateInfo(platform).src);
    }

    /**
     * 热更新 manifest 文件 在build后的资源中的路径 相对于项目路径
     * 会用新生成的manifest文件 替换掉旧的manifest文件
     * @param {string} platform 平台
     * @returns {string} 返回绝对路径
     */
    getHotupdateManifest(platform) {
        return path.join(this.project, this.__hotupdateInfo(platform).manifest);
    }
    /***************** 热更新相关配置获取 end ****************/


    /**
     * 初始化渠道配置
     * 并且插入几个特殊的值: all(全渠道), native(原生渠道), minigame(小游戏渠道)
     */
    __initChannelInfos() {
        for (let info of config.channels) {
            if (!info.config) {
                console.warn(colors('yellow', `渠道 ${info.channel} 的 config 配置不存在 请检查config.json`));
                continue;
            }
            this.__channel_maps.set(info.channel, info);
            this.__all_channels.push(info.channel);
        }
        /** 插入几个特殊的值 */
        this.__channel_maps.set("all", { channel: "all", name: "全渠道", platform: "" });
        this.__channel_maps.set("native", { channel: "native", name: "原生平台", platform: "" });
        this.__channel_maps.set("minigame", { channel: "minigame", name: "小游戏", platform: "" });
    }

    /** 初始化平台配置 */
    __initPlatformInfos() {
        for (let info of config.platforms) {
            this.__platform_maps.set(info.platform, info);
        }
    }

    /** 初始化热更新配置 */
    __initHotupdateMaps() {
        for (let info of config.hotupdate || []) {
            this.__hotupdate_maps.set(info.platform, info);
        }
    }

    /** 
     * 获取渠道配置
     * @param {string} channel 渠道
     * 
     * channel: 渠道类型
     * name: 渠道名称
     * platform: 渠道平台
     * config: 渠道打包配置文件路径
     * @returns { channel: string, name: string, platform: string, config: string }
     */
    __channelInfo(channel) {
        if (!this.__channel_maps.has(channel)) {
            throw new Error(`渠道 ${channel} 不存在 请检查config.json中的 channels 字段下的配置`);
        }
        return this.__channel_maps.get(channel);
    }

    /** 获取平台配置信息 */
    __platformInfo(platform) {
        if (!this.__platform_maps.has(platform)) {
            throw new Error(`平台 ${platform} 不存在 请检查config.json中的 platforms 字段下的配置`);
        }
        return this.__platform_maps.get(platform);
    }

    __hotupdateInfo(platform) {
        if (!this.__hotupdate_maps.has(platform)) {
            throw new Error(`热更新配置中平台 ${platform} 信息不存在 请检查config.json中的 hotupdate 字段下的配置`);
        }
        return this.__hotupdate_maps.get(platform);
    }
}

// 导出函数以便其他模块使用
module.exports = DataHelper;