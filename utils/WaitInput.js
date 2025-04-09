/**
 * @Author: Gongxh
 * @Date: 2025-03-12
 * @Description: 等待用户输入
 */

const readline = require('readline');

function WaitInput(message) {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
       
        rl.question(message, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

module.exports = WaitInput
  