/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 入口文件
 */

const HotUpdatePlugin = require("./plugins/hotupdate/HotUpdatePlugin");
const AndroidBuilder = require("./plugins/platforms/AndroidBuilder");
const WechatBuilder = require("./plugins/platforms/WechatBuilder");

// new AndroidBuilder('official', '1.0.1', 'debug', '2').start();
// new HotUpdatePlugin("android", "1.0.6", "4", "debug", true).start();

new WechatBuilder('wechatgame', '1.0.1', 'debug', 2, '测试打包').start();