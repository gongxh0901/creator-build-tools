/**
 * @Author: Gongxh
 * @Date: 2025-03-12
 * @Description: log输出带颜色的内容
 */

/** 
 * 支持颜色
 * 
 * 红色: red
 * 绿色: green
 * 黄色: yellow
 * 蓝色: blue
 * 洋红色: magenta
 * 青色: cyan
 * 白色: white
 */
function colors(color, text) {
    if (color == "red") {
        // 红色
        return '\x1B[31m' + text + '\x1B[0m';
    } else if (color == "green") {
        // 绿色
        return '\x1B[32m' + text + '\x1B[0m';
    } else if (color == "yellow") {
        // 黄色
        return '\x1B[33m' + text + '\x1B[0m';
    } else if (color == "blue") {
        // 蓝色
        return '\x1B[34m' + text + '\x1B[0m';
    } else if (color == "magenta") {
        // 洋红色
        return '\x1B[35m' + text + '\x1B[0m';
    } else if (color == "cyan") {
        // 青色
        return '\x1B[36m' + text + '\x1B[0m';
    } else if (color == "white") {
        // 白色
        return '\x1B[37m' + text + '\x1B[0m';
    } else {
        return text;
    }
}

module.exports = colors