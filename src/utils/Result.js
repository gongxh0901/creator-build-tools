/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 结果类 
 */

class Result {
    _code = 0;
    _message = "";
    _signal = null;

    /**
     * 
     * @param {number} code 一般情况下 成功是0
     * @param {string} message 描述文本
     * @param {Error} signal 错误信息
     */
    constructor(code, message, signal = null) {
        this._code = code;
        this._message = message;
        this._signal = signal;
    }

    get code() {
        return this._code;
    }

    get message() {
        return this._message;
    }

    get signal() {
        return this._signal;
    }
}

module.exports = Result