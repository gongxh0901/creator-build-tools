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

const ErrCode = {
    Success: { code: 0, message: "成功" },
    Error: { code: -1, message: "失败" },
    FileNotFound: { code: -100, message: "文件不存在" },

    BuildCodeEmpty: { code: -1000, message: "build号不能为空" },
    GradlewClean: { code: -1001, message: "清理构建缓存失败" },
    GradlewBuild: { code: -1002, message: "打包构建失败" },
    AndriodSignerTool: { code: -1003, message: "未找到apksigner工具，请确保已安装Android SDK并设置APKSIGNER环境变量" },
    AndroidSignFailed: { code: -1004, message: "android包签名失败" },
}

module.exports = { ModeType, ErrCode };