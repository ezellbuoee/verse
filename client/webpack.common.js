import Path from "node:path";
import Url from "node:url";

import HtmlWebpackPlugin from "html-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";

const __filename = Url.fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default {
    context: Path.join(__dirname),
    entry: {
        main: Path.join(__dirname, "src/index.tsx")
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"]
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"]
            },
            {
                test: /\.(png|jpe?g|gif|svg|woff|woff2)$/i,
                // More information here https://webpack.js.org/guides/asset-modules/
                type: "asset",
                generator: {
                    filename: "static/media/[hash][ext][query]"
                }
            },
            {
                test: /\.json$/,
                type: "json"
            }
        ]
    },
    output: {
        // Verse deep links (/poems/<id>, /poets/<id>): assets are always loaded from the site root
        publicPath: "/",
        path: Path.join(__dirname, "build/webpack"),
        filename: "[name].bundle.[contenthash:8].js",
        chunkFilename: "[name].chunk.[chunkhash:8].js"
    },
    plugins: [
        // Typescript type checking
        new ForkTsCheckerWebpackPlugin({
            typescript: { configOverwrite: { exclude: ["./test/**/*"] } }
        }),
        // minify
        new MiniCssExtractPlugin({
            filename: "[name].bundle.[contenthash:8].css"
        }),
        new HtmlWebpackPlugin({
            hash: true,
            template: "./resources/html/index.html",
            favicon: "./resources/html/images/favicon.svg",
            chunks: ["main"]
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: Path.join(__dirname, "resources/html/images"),
                    to: Path.resolve(__dirname, "build/webpack/images"),
                    noErrorOnMissing: true,
                    globOptions: { ignore: ["**/images/favicon.svg"] }
                }
            ]
        })
    ],
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".json"]
    }
};
