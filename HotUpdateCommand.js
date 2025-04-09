/**
 * @Author: Gongxh
 * @Date: 2025-03-20
 * @Description: 热更新命令行
 */

const AutoHotUpdate = require('./hotupdate/AutoHotUpdate');

let autoHotUpdate = new AutoHotUpdate();
autoHotUpdate.start();