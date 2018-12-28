/**
 * 公共库 dll 打包
 */

require('./script/del-dll.js');

var webpack = require('webpack');
var path = require('path');
var dirVars = require('./config/dir-vars.config.js');

module.exports = {
    entry: {
        vendor: [
            'babel-polyfill',
            path.resolve(dirVars.rootDir, 'src/js/lib/rem750.js'),
            'vue/dist/vue.min.js', // !天坑 必须写成这个，否则会出现源文件中也会有vue
            'axios'
        ],
    },
    output: {
        path: path.resolve(dirVars.outputDir),
        filename: 'js/[name].min.js',
        library: '[name]_library'
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
            },
        }),
        // new webpack.DllPlugin({
        //     path: path.resolve(dirVars.rootDir, "manifest.json"),
        //     name: '[name]_library',
        //     context: dirVars.rootDir
        // })
    ]
};