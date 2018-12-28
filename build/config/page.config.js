/**
 * 多页面入口模版
*/

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [
    new HtmlWebpackPlugin({ //page1
        filename: 'index.html',
        template: './src/index.html',
        chunks: ['index']
    }),
];
