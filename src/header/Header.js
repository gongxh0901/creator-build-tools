/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 
 */

const ModeType = {
    /**
     * 调试模式
     * @type {"debug"}
     */
    DEBUG: "debug",
    /**
     * 发布模式
     * @type {"release"}
     */
    RELEASE: "release",
};


/** 
 * @enum {number}
 * @description 错误码
 */
const ErrCode = {
    /** 成功 */
    Success: 0,

    /** android 打包失败 */
    AndroidError: -101,
    /** ios 打包失败 */
    IosError: -102,
    /** 鸿蒙打包失败 */
    HarmonyError: -103,
    /** 微信小游戏打包失败 */
    WechatError: -104,
    /** 抖音小游戏打包失败 */
    ByteDanceError: -105,
    /** 支付宝小游戏打包失败 */
    AlipayError: -106,
    /** 华为快游戏打包失败 */
    HuaweiQuickError: -107,

    /** ========================== 内部错误码 ========================== */
    /** 文件不存在 */
    FileNotFound: -1001,

    /** ========================== Android ========================== */
    /** 清理构建缓存失败 */
    GradlewClean: -1101,
    /** 打包构建失败 */
    GradlewBuild: -1102,
    /** 未找到apksigner工具，请确保已安装Android SDK并设置APKSIGNER环境变量 */
    AndriodSignerNotFound: -1103,
    /** android包签名失败 */
    AndroidSignFailed: -1104,

    /** ========================== 微信小游戏 ========================== */
    /** 微信小游戏上传资源失败 */
    WechatUploadRes: 1201,
    /** 上传项目到微信后台失败 */
    WechatUploadProject: 1202,

    /** ========================== oss 上传 ========================== */
    /** 资源上传失败 */
    OssUploadFailed: 1301,
}

module.exports = { ModeType, ErrCode };