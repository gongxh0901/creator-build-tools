/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 
 */

const ConfigLoader = require('./ConfigLoader');
const Result = require('../utils/Result');
const Logger = require('../utils/Logger');

class Base extends ConfigLoader {
    constructor(filename = 'base.json') {
        super(filename);
        if (!this.__data) {
            throw new Result(-1, `${filename} 未配置或格式错误`);
        }
        if (!this.__data.creator) {
            throw new Result(-1, `${filename} [creator] 未配置`);
        }
        if (!this.__data.project) {
            throw new Result(-1, `${filename} [project] 未配置`);
        }
        Logger.blue(`====================基础数据====================`);
        Logger.blue(`creator路径:${this.creator}`);
        Logger.blue(`项目路径:${this.project}`);

        if (this.isCustomEngine) {
            Logger.blue(`使用自定义引擎`);
            Logger.blue(`自定义引擎路径:${this.customEngine}`);
        } else {
            Logger.blue(`未使用自定义引擎`);
        }
    }

    /**
     * @returns {string} creator路径
     */
    get creator() { return this.__data.creator }

    /**
     * @returns {string} 项目路径
     */
    get project() { return this.__data.project }

    /**
     * @returns {string} 自定义引擎路径 如果未配置则返回空字符串
     */
    get customEngine() { return this.__data.customEngine || '' }

    /**
     * 是否使用自定义引擎
     * @returns {boolean}
     */
    get isCustomEngine() {
        return this.customEngine !== '';
    }
}

module.exports = Base;