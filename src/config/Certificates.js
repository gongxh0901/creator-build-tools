/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 敏感数据 
 * 添加 .gitignore 忽略
 * 不同平台的敏感数据并不相同 
 *
 * 我这里是按照平台区分的, 如果同平台、不同渠道需要的数据也不一样，需要自行修改
 */

// android平台对应的敏感数据
// {
//     "cert": "keystore文件的绝对路径",
//     "storePassword": "",
//     "alias": "别名",
//     "keyPassword": ""
// }

// harmonyos-next平台对应的敏感数据
// {
//     "cert": "cer文件的绝对路径",
//     "storePassword": "",
//     "alias": "别名",
//     "keyPassword": "",
//     "profile": "p7b文件的绝对路径",
//     "signAlg": "SHA256withECDSA",
//     "storeFile": "p12文件的绝对路径"
// }

const fs = require('fs')
const ConfigLoader = require('./ConfigLoader');
const Result = require('../utils/Result');
const { ModeType } = require('../header/Header');

class Certificates extends ConfigLoader {

    /**
     * 平台对应的敏感数据配置
     * @type {Map<string, {certificate: {debug: {cert: string, storePassword: string, alias: string, keyPassword: string, profile: string, signAlg: string, storeFile: string}, release: {cert: string, storePassword: string, alias: string, keyPassword: string, profile: string, signAlg: string, storeFile: string}}, appid: string, privateKey: string }>}
     */
    __maps = new Map();

    /**
     * 初始化 Certificates
     * @param {string} filename 文件名
     * @public
     */
    constructor(filename = 'certificates.json') {
        super(filename);
        if (!this.__data) {
            throw new Result(-1, `${filename} 未配置或格式错误`);
        }
        if (!Array.isArray(this.__data)) {
            throw new Result(-1, `${filename} 格式错误, 必须是数组`);
        }

        for (const info of this.__data) {
            if (info.platform === "android") {
                this.checkAndroidCertificate(info);
            } else if (info.platform === "harmonyos-next") {
                this.checkHarmonyosNextCertificate(info);
            }
            this.__maps.set(info.platform, info);
        }
    }

    /**
     * 是否存在平台对应的敏感数据配置
     * @param {string} platform 平台
     * @returns {boolean} true/false
     * @public
     */
    has(platform) {
        return this.__maps.has(platform);
    }

    /****************************** 小游戏的敏感数据 begin ******************************/
    /** 
     * 获取平台appID (用于小游戏平台)
     * @param {string} platform 平台
     * @returns {string} appID
     * @public
     */
    getAppID(platform) {
        if (!this.has(platform)) {
            throw new Result(-1, `平台:【${platform}】对应的敏感数据配置不存在, 请检查certificates.json`);
        }
        return this.__maps.get(platform).appid;
    }

    /**
     * 获取平台对应的私钥 (用于微信小游戏平台的命令行上传)
     * @param {string} platform 平台
     * @returns {string} 私钥绝对路径
     * @public
     */
    getPrivateKey(platform) {
        if (!this.has(platform)) {
            throw new Result(-1, `平台:【${platform}】对应的敏感数据配置不存在, 请检查certificates.json`);
        }
        let filepath = this.__maps.get(platform).privateKey;
        // 判断文件是否存在
        if (!filepath || !fs.existsSync(filepath)) {
            throw new Result(-1, `平台:【${platform}】对应的私钥文件不存在`);
        }
        return filepath;
    }
    /****************************** 小游戏的敏感数据 end ******************************/


    /****************************** 原生平台的敏感数据 begin ******************************/
    /**
     * 获取平台对应的证书
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} 证书绝对路径
     * @public
     */
    getCert(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.cert;
    }

    /**
     * 获取平台对应的证书密码
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} 证书密码
     * @public
     */
    getStorePassword(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.storePassword;
    }

    /**
     * 获取平台对应的证书别名
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} 证书别名
     * @public
     */
    getAlias(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.alias;
    }

    /**
     * 获取平台对应的证书私钥密码
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} 证书私钥密码
     * @public
     */
    getKeyPassword(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.keyPassword;
    }

    /**
     * 获取平台对应的证书profile
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} p7b profile 绝对路径
     * @public
     */
    getProfile(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.profile;
    }

    /**
     * 获取平台对应的证书签名算法
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} 证书签名算法
     * @public
     */
    getSignAlg(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.signAlg;
    }

    /**
     * 获取平台对应的证书文件
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {string} p12证书文件绝对路径
     * @public
     */
    getStoreFile(platform, mode = ModeType.RELEASE) {
        let info = this.__getCertificate(platform, mode);
        return info.storeFile;
    }

    /**
     * 获取平台对应的敏感数据配置
     * @param {string} platform 平台
     * @param {string} mode 模式
     * @returns {{cert: string, storePassword: string, alias: string, keyPassword: string, profile: string, signAlg: string, storeFile: string}} 敏感数据
     * @private
     */
    __getCertificate(platform, mode = ModeType.RELEASE) {
        if (!this.has(platform)) {
            throw new Result(-1, `平台:【${platform}】对应的敏感数据配置不存在, 请检查certificates.json`);
        }
        let certificateInfo = this.__maps.get(platform).certificate;
        if (!certificateInfo) {
            throw new Result(-1, `平台:【${platform}】对应的敏感数据配置不存在, 请检查certificates.json下的【certificate】字段`);
        }
        let info = mode === ModeType.DEBUG ? certificateInfo.debug : certificateInfo.release;
        if (!info) {
            throw new Result(-1, `平台:【${platform}】对应的敏感数据配置不存在, 请检查certificates.json下的【certificate.${mode}】字段下的配置`);
        }
        return info;
    }


    /**
     * 检查android证书
     * @param {object} info 证书信息
     * @returns {void}
     * @private
     */
    checkAndroidCertificate(info) {
        if (!info.certificate) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在, 请检查certificates.json`);
        }
        if (!info.certificate.debug) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在 debug 字段, 请检查certificates.json`);
        }
        if (!info.certificate.release) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在 release 字段, 请检查certificates.json`);
        }

        if (!info.certificate.debug.cert || !info.certificate.release.cert) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在 debug或release下的 cert 字段, 请检查certificates.json`);
        }         
        if (!info.certificate.debug.storePassword || !info.certificate.release.storePassword) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在 debug或release下的 storePassword 字段, 请检查certificates.json`);
        }
        
        if (!info.certificate.debug.alias || !info.certificate.release.alias) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在 debug或release下的 alias 字段, 请检查certificates.json`);
        }

        if (!info.certificate.debug.keyPassword || !info.certificate.release.keyPassword) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置不存在 debug或release下的 keyPassword 字段, 请检查certificates.json`);
        }

        // 检查证书文件是否存在
        if (!fs.existsSync(info.certificate.debug.cert) || !fs.existsSync(info.certificate.release.cert)) {
            throw new Result(-1, `certificates.json 中 android平台对应的敏感数据配置 debug或release下的 cert 字段对应的证书文件不存在, 请检查certificates.json`);
        }
    }

    /**
     * 检查鸿蒙证书
     * @param {object} info 证书信息
     * @returns {void}
     * @private
     */
    checkHarmonyosNextCertificate(info) {
        if (!info.certificate) {
            throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在, 请检查certificates.json`);
        }
        if (!info.certificate.debug) {
            throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 debug 字段, 请检查certificates.json`);
        }
        if (!info.certificate.release) {
            throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 release 字段, 请检查certificates.json`);
        }

        // if (!info.certificate.debug.cert || !info.certificate.release.cert) {
        //     throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 debug或release下的 cert 字段, 请检查certificates.json`);
        // }

        // if (!info.certificate.debug.storePassword || !info.certificate.release.storePassword) {
        //     throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 debug或release下的 storePassword 字段, 请检查certificates.json`);
        // }
        
        // if (!info.certificate.debug.alias || !info.certificate.release.alias) {
        //     throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 debug或release下的 alias 字段, 请检查certificates.json`);
        // }

        // if (!info.certificate.debug.keyPassword || !info.certificate.release.keyPassword) {
        //     throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 debug或release下的 keyPassword 字段, 请检查certificates.json`);
        // }

        // if (!info.certificate.debug.profile || !info.certificate.release.profile) {
        //     throw new Result(-1, `certificates.json 中 harmonyos-next平台对应的敏感数据配置不存在 debug或release下的 profile 字段, 请检查certificates.json`);
        // }
    }
}

module.exports = Certificates;