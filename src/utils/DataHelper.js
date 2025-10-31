/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 
 */

const Channels = require("../config/Channels");
const Base = require("../config/Base");
const Platforms = require("../config/Platforms");
const Logger = require("./Logger");
const Certificates = require("../config/Certificates");
const Oss = require("../config/Oss");
const HotUpdate = require("../config/HotUpdate");

class DataHelper {
    constructor() {
        Logger.log("数据初始化");
        this.__init();
    }

    /**
     * 初始化数据
     * @returns {DataHelper}
     */
    __init() {
        try {
            this.base = new Base('base.json');
            this.oss = new Oss('oss.json');
            this.platforms = new Platforms('platforms.json');
            this.channels = new Channels(this.platforms, 'channels.json');
            this.certificates = new Certificates('certificates.json');
            this.hotupdate = new HotUpdate(this.base, 'hotupdate.json');            
        } catch (error) {
            Logger.error(`${error.message}`);
            throw new Error(`数据初始化失败`);
        }
        return this;
    }
}

module.exports = new DataHelper();
