/**
 * @Author: Gongxh
 * @Date: 2025-10-31
 * @Description: 信息收集工具
 */

const { ModeType } = require("src/header/Header");

const MessageType = {
    /**
     * 构建
     * @type {"build"}
     */
    BUILD: "build",
    /**
     * 热更新
     * @type {"hotupdate"}
     */
    HOTUPDATE: "hotupdate",
}

class Message {
    /**
     * 信息类型
     * @type {"build" | "hotupdate"}
     * @private
     */
    _type = MessageType.BUILD;
    /**
     * 是否成功
     * @type {boolean}
     * @private
     */
    _succeed = true;
    /**
     * 版本号
     * @type {string}
     * @private
     */
    _version = "";
    /**
     * 模式
     * @type {"debug" | "release"}
     * @private
     */
    _mode = ModeType.DEBUG;
    
    /**
     * BuildCode
     * @type {string}
     * @public
     */
    build = "";

    /**
     * 资源版本号
     * @type {string}
     * @public
     */
    resVersion = "";

    /**
     * Robot
     * @type {number}
     * @public
     */
    robot = 0;

    /**
     * Channel
     * @type {string}
     * @public
     */
    channel = "";

    /**
     * Platform
     * @type {string}
     * @public
     */
    platform = "";

    /**
     * Message
     * @type {string}
     * @public
     */
    message = "";

    /**
     * 下载地址
     * @type {string}
     * @public
     */
    url = "";

    /**
     * 
     * @param {"build" | "hotupdate"} type 信息类型
     * @param {string} version 版本号
     * @param {"debug" | "release"} mode 构建模式
     * @param {boolean} succeed 是否成功
     */
    constructor(type, version, mode, succeed = true) {
        this._type = type;
        this._version = version;
        this._mode = mode;
        this._succeed = succeed;
    }

    get type() { return this._type; }
    get succeed() { return this._succeed; }
    get version() { return this._version; }
    get mode() { return this._mode; }
}

class MessageHelper {
    /**
     * 信息列表
     * @type {Message[]}
     * @static 
     * @private 
     */
    static _messages = [];

    /**
     * 添加信息
     * @param {Message} message 信息
     * @static
     * @public
     */
    static addMessage(message) {
        this._messages.push(message);
    }
}

module.exports = { MessageHelper, Message, MessageType }