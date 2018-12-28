//获取多页面的每个入口文件，用于配置中的entry
var fs = require('fs');
var path = require('path');
var dirVars = require('./dir-vars.config.js');

module.exports = function () {
    var jsPath = path.resolve(dirVars.srcDir, 'js');
    var dirs = fs.readdirSync(jsPath);
    var matchs = [], files = {};
    dirs.forEach(function (item) {
        matchs = item.match(/(.+)\.js$/);
        if (matchs) {
            files[matchs[1]] = path.resolve(dirVars.srcDir, 'js', item);
        }
    });
    return files;
}