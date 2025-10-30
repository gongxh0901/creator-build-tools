/**
 * @Author: Gongxh
 * @Date: 2025-10-30
 * @Description: 测试文件
 */

const path = require('path');
const fs = require('fs');
const Logger = require('./utils/Logger');
const Result = require('./utils/Result');

class Test {
    constructor() {
        Logger.blue(`====================测试 ====================`);
    }

    async start() {
        try {
            let result1 = await this.test1();
            console.log("=======", result1);            
        } catch (error) {
            console.log(">>>", error);
        }
    }

    async test1() {
        // return new Result(0, "测试1成功");
        throw new Result(-1, "测试1成功");
    }
}


new Test().start();