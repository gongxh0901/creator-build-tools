const fs = require('fs');
const path = require('path');

class FileUtils {
    /** 
     * 获取指定目录下的所有文件
     * @param {string} local - 要搜索的目录路径 local有可能是一个文件 local是一个绝对路径
     * @param {string} [baseDir] - 基础目录路径，用于计算相对路径（默认与local相同）
     * @returns {string[]} - 所有文件的相对路径数组
     */
    static getAllFiles(local, baseDir = local) {
        let files = [];
        // console.log("local", local);
        const stat = fs.statSync(local);
        if (stat.isFile()) {
            if (path.basename(local) == ".DS_Store") {
                return files;
            }
            if (local == baseDir) {
                // 设置 baseDir 为 local的文件夹
                baseDir = path.dirname(local);
                // 将local的文件名添加到files中
                files.push(path.basename(local));                
            } else {
                // 计算相对于baseDir的路径
                const relativePath = path.relative(baseDir, local);
                files.push(relativePath);
            }
        } else if (stat.isDirectory()) {
            // 读取目录内容
            const items = fs.readdirSync(local);
            // 遍历目录中的每一项
            for (const item of items) {
                // console.log("item", item);
                const absolutePath = path.join(local, item);
                files = files.concat(this.getAllFiles(absolutePath, baseDir));
            }
        }
        return files;
    }

}

// 导出函数以便其他模块使用
module.exports = FileUtils;