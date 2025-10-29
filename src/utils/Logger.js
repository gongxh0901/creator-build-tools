/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 日志打印
 * 支持颜色
 * 红色: red
 * 绿色: green
 * 黄色: yellow
 * 蓝色: blue
 * 洋红色: magenta
 * 青色: cyan
 * 白色: white
 */

class colors {
    /**
     * 红色
     * @param {string} text
     */
    static red(text) {
        return '\x1B[31m' + text + '\x1B[0m';
    }

    /**
     * 黄色
     * @param {string} text
     */
    static yellow(text) {
        return '\x1B[33m' + text + '\x1B[0m';
    }

    /**
     * 洋红色
     * @param {string} text
     */
    static magenta(text) {
        return '\x1B[35m' + text + '\x1B[0m';
    }

    /**
     * 绿色
     * @param {string} text
     */
    static green(text) {
        return '\x1B[32m' + text + '\x1B[0m';
    }

    /**
     * 蓝色
     * @param {string} text
     */
    static blue(text) {
        return '\x1B[34m' + text + '\x1B[0m';
    }
    
    /**
     * 青色
     * @param {string} text
     */
    static cyan(text) {
        return '\x1B[36m' + text + '\x1B[0m';
    }
}

class Logger {
    /**
     * 普通日志 白色
     * @param {...any} args
     */
    static log(...args) {
        console.log(...args);
    }

    /**
     * 调试日志 白色
     * @param {...any} args
     */
    static debug(...args) {
        console.log(...args);
    }

    /**
     * 错误日志 红色
     * @param {string} message
     */
    static error(message) {
        console.log(colors.red("[error]" + message));
    }

    /**
     * 警告日志 黄色
     * @param {string} message
     */
    static warn(message) {
        console.log(colors.yellow("[warn]" + message));
    }

    /**
     * 成功日志 绿色
     * @param {string} message
     */
    static success(message) {
        console.log(colors.green("[success]" + message));
    }

    /**
     * 提示日志 洋红色
     * @param {any} message
     */
    static tips(message) {
        console.log(colors.magenta(message));
    }

    /**
     * 蓝色日志 蓝色
     * @param {any} message
     */
    static blue(message) {
        console.log(colors.blue(message));
    }

    /**
     * 青色
     * @param {string} message
     */
    static cyan(message) {
        console.log(colors.cyan(message));
    }
}

module.exports = Logger;