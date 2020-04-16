const path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// 'production' か 'development' を指定
const MODE = "production";
// ソースマップの利用有無(productionのときはソースマップを利用しない)
const enabledSourceMap = MODE === "development";


module.exports = {
    // モード値を production に設定すると最適化された状態で、
    // development に設定するとソースマップ有効でJSファイルが出力される
    mode: MODE,
    entry: `./src/index.js`,


    module: {
        rules: [
            //対象の拡張子のファイルに対してuse配列内のLoader処理を下から順番に適用する。
            {
                //sass-loader: sassをcssにコンパイル
                //postcss-loader: ベンダープレフィクス自動付与とファイルサイズ縮小
                //css-loader: css内のurl()メソッドや@import文をJavaScriptのrequire()メソッドに変換など
                //MiniCssExtractPlugin：CSSファイルをバンドルせず個別に出力
                test: /\.(sass|scss)$/, // 対象となるファイルの拡張子
                use: [

                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    {
                        loader: "css-loader",
                        options: {
                            url: false,
                            sourceMap: enabledSourceMap,
                            importLoaders: 2
                        }
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            sourceMap: enabledSourceMap,
                            plugins: [
                                require("autoprefixer")({
                                    grid: true,
                                }),
                                require("cssnano"),
                            ]
                        }
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: enabledSourceMap
                        }
                    }
                ]
            },
            {
                //画像ファイルのバンドル
                test: /\.(gif|png|jpg|eot|wof|woff|woff2|ttf|svg)$/,

                loader: "url-loader",
                options: {
                    esModule: false,
                    limit: 200000, //200KBまではバンドル。それ以上は画像ファイルとして出力
                    name: '../[name].[ext]'
                },
            }
        ]
    },
    plugins: [
        //CSSファイルをバンドルせず個別に出力
        new MiniCssExtractPlugin({
            filename: 'bundle.css', //dest/bundle.cssに出力
        }),
        //HTMLファイルの出力。バンドルファイルのリンク自動付与
        new HtmlWebpackPlugin({
            template: './src/index.html',
            favicon: './src/images/favicon.ico',
        }),

    ],
    output: {
        path: `${__dirname}/dest/`, //dest/bundle.jsを出力
        // 出力ファイル名(hash値を付けることでキャッシュ対策。HTML内のscriptタグもこの名前で自動生成される)
        filename: "bundle.js"
    },
    devServer: {
        contentBase: "dest",
        watchContentBase: true,
        port: 3000,
        open: true,
    }
};