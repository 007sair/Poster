/**
 * production
 */

require('./script/del-dist.js');

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
// const CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");

var dirVars = require('./config/dir-vars.config.js');
var _getEntry = require('./config/entry.config.js');
var _resolve = require('./config/resolve.config.js');
var postcssConfig = require('./config/postcss.config.js');

var config = {
    entry: _getEntry(),
    output: {
        path: path.resolve(dirVars.outputDir),
        filename: "js/[name].min.js?v=[chunkhash:10]",
        // publicPath: "/",
        chunkFilename: "js/[name].min.js?v=[chunkhash:10]",
    },
    module: {
        rules: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
            {
                test: /\.(css|scss)$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true,
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                plugins: postcssConfig,
                                sourceMap: true
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true
                            }
                        }
                    ]
                })
            },
            {
                test: /\.(png|jpg|gif|jpeg)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 2,
                            name: 'images/[path][name].[ext]?v=[hash:10]',
                            context: path.resolve(dirVars.rootDir, 'src/assets/img/'),
                        },
                    }
                ]
            },
            {
                test: /\.html$/,
                use: ['html-loader']
            },
        ]
    },
    resolve: _resolve,
    plugins: [
        new webpack.DefinePlugin({ //环境判断 用于js文件中
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            },
            __DEV__: JSON.stringify(JSON.parse(process.env.DEBUG || 'false'))
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
            },
        }),
        new webpack.NoEmitOnErrorsPlugin(), // 配合CLI的--bail，一出error就终止webpack的编译进程
        new ExtractTextPlugin('css/style.css?v=[contenthash:10]'),
    ]
};

//set pages
config.plugins = config.plugins.concat(
    require('./config/page.config.js'),
);

module.exports = config;