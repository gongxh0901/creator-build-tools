/**
 * @Author: Gongxh
 * @Date: 2025-03-12
 * @Description: 用来执行系统命令
 * 
 * 自己定义的 成功 code=0
 * 失败 code!=0 signal=string
 * 
 * 非自己定义的原样返回
 */

const { exec, spawn } = require('child_process');
const colors = require('./Colors');
const Result = require('./Result');

async function RunCommand(command, options = []) {
    return new Promise((resolve, reject) => {
        console.log(colors("cyan", "执行命令:" + command + " " + options.join(" ")));
        // console.log("工作目录:", process.cwd());
        const child = spawn(command, options, {encoding: 'utf-8'});
        child.stdout.on('data', (data) => {
            let output = data.toString('utf-8').trim();
            console.log(output);
        });

        child.stderr.on('data', (data) => {
            let error = data.toString('utf-8').trim();
            console.log(error);
        });
        
        /**
         * 至少有一个不是null
         * @param {number} code 子进程退出码
         * @param {any} signal 子进程结束信号
         */
        child.on('exit', (code, signal) => {
            resolve(new Result(code, "exit", signal));
        });
    });
}

module.exports = {
    RunCommand
};