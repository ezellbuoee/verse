import { merge } from "webpack-merge";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";

import common from "./webpack.common.js";

export default merge({}, common, {
    mode: "production",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true,
                            onlyCompileBundledFiles: true
                        }
                    }
                ],
                exclude: /[\\/](node_modules|test)[\\/]/
            }
        ]
    },
    plugins: [new CleanWebpackPlugin()],
    // React and the app together are ~270 KiB; webpack's default hint (244 KiB) would warn on every build
    performance: { maxAssetSize: 400 * 1024, maxEntrypointSize: 400 * 1024 },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: /^\**!|@preserve|@license|@cc_on|copyright/i
            })
        ]
    }
});
