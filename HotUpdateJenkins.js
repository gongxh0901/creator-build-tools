/**
 * @Author: Gongxh
 * @Date: 2025-03-20
 * @Description: jenkins热更新 外部传入参数
 */

const AutoHotUpdate = require('./hotupdate/AutoHotUpdate');

let platform = "android";
let gameVersion = "0.0.1";
let hotVersion = 1;
let isDebug = true;
let notification = true;
let immediately = true;

// 解析参数
var i = 2;
while (i < process.argv.length) {
    var arg = process.argv[i];

    switch (arg) {
        case '-p':
            platform = process.argv[i+1];
            i += 2;
            break;
        case '-v':
            gameVersion = process.argv[i + 1];
            i += 2;
            break;
        case '-hot':
            hotVersion = process.argv[i + 1];
            i += 2;
            break;
        case '-d':
            isDebug = process.argv[i + 1] == "true" ? true : false;
            i += 2;
            break;
        case '-n':
            notification = process.argv[i + 1];
            i += 2;
            break;
        case '-i':
            immediately = process.argv[i + 1] == "true" ? true : false;
            i += 2;
            break;
        default:
            i++;
            break;
    }
}

//TODO::test
// platform = 'android'
// gameVersion = '0.1.11'
// hotVersion = 1
// isDebug = true
// notification = true

let autoHotUpdate = new AutoHotUpdate();
autoHotUpdate.customStart(platform, gameVersion, hotVersion, isDebug, immediately, notification);