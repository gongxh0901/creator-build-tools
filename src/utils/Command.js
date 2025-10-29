/**
 * @Author: Gongxh
 * @Date: 2025-10-27
 * @Description: 用来执行系统命令
 */

const { exec, spawn } = require('child_process');
const Result = require('./Result');
const Logger = require('./Logger');

/**
 * 执行命令
 * @param {string} command 命令
 * @param {string[]} options 命令参数
 * @returns {Promise<Result>}
 */
async function RunCommand(command, options = []) {
    return new Promise((resolve, reject) => {
        Logger.cyan(`执行命令:${command} ${options.join(" ")}`);
        const child = spawn(command, options);
        
        if (child.stdout) {
            child.stdout.on('data', (data) => {
                let output = data.toString('utf-8').trim();
                Logger.log(output);
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (data) => {
                let error = data.toString('utf-8').trim();
                Logger.log(error);
            });
        }
        
        /**
         * 至少有一个不是null
         * @param {number} code 子进程退出码
         * @param {NodeJS.Signals | null} signal 子进程结束信号
         */
        child.on('exit', (code, signal) => {
            resolve(new Result(code, "exit", signal ? new Error(signal) : null));
        });
    });
}

module.exports = { RunCommand };