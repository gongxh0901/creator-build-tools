/**
 * @Author: Gongxh
 * @Date: 2025-03-14
 * @Description: 结果类
 */

class Result {
    _code = 0;
    _message = "";
    _error = null;

    /**
     * 
     * @param {*} code 一般情况下 成功是0
     * @param {*} message 描述文本
     * @param {*} error 错误信息
     */
    constructor(code, message, error) {
        this._code = code;
        this._message = message;
        this._error = error;
    }

    get code() {
        return this._code;
    }

    get message() {
        return this._message;
    }

    get error() {
        return this._error;
    }
}

module.exports = Result