/**
 * @Author: Gongxh
 * @Date: 2025-03-12
 * @Description: Jenkins构建 外部传入参数
 */

const AutoBuild = require('./AutoBuild');

let channel = "official";
let version = "0.0.1";
let build = 1;
let debug = true;
let robot = 1;
let message = "1. 修复已知bug";
let notification = true;

// 解析参数
var i = 2;
while (i < process.argv.length) {
    var arg = process.argv[i];

    switch (arg) {
        case '-p':
            channel = process.argv[i+1];
            i += 2;
            break;
        case '-v':
            version = process.argv[i + 1];
            i += 2;
            break;
        case '-b':
            build = process.argv[i + 1];
            i += 2;
            break;
        case '-d':
            debug = process.argv[i + 1] == "true" ? true : false;
            i += 2;
            break;
        case '-r':
            robot = process.argv[i + 1];
            i += 2;
            break;
        case '-m':
            message = process.argv[i + 1];
            i += 2;
            break;
        case '-n':
            notification = process.argv[i + 1];
            i += 2;
            break;
        default:
            i++;
            break;
    }
}

//TODO::test
// channel = 'official'
// channel = 'wechatgame'
// channel = 'alipay'
// channel = 'bytedance'
// channel = 'harmonyos-next'
// version = '0.0.1'
// build = 1
// debug = true
// robot = 24
// message = '1.这是一个测试版本'
// notification = false

// let autoBuild = new AutoBuild();
// autoBuild.customStart(channel, version, build, debug, robot, message, notification);

