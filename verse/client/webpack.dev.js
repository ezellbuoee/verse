import Dns from "node:dns";

import { merge } from "webpack-merge";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import ReactRefreshTypeScript from "react-refresh-typescript";

import common from "./webpack.common.js";
import Pkg from "./package.json" with { type: "json" };

// Fix localhost resolving in Node 17+
Dns.setDefaultResultOrder("ipv4first");

export default merge({}, common, {
    mode: "development",
    devtool: "eval-source-map",
    devServer: {
        hot: true,
        port: Pkg.webpackPort,
        devMiddleware: {
            publicPath: "/"
        },
        historyApiFallback: true,
        proxy: [
            {
                context: ["/api/actuator"],
                target: "http://localhost:8082",
                pathRewrite: { "^/api/actuator": "/actuator" },
                secure: false,
                changeOrigin: true,
                logLevel: "debug"
            },
            {
                context: ["/api"],
                target: "http://localhost:8082",
                secure: false,
                changeOrigin: true,
                logLevel: "debug"
            }
        ]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true,
                            onlyCompileBundledFiles: true,
                            getCustomTransformers: () => ({
                                before: [ReactRefreshTypeScript()]
                            })
                        }
                    }
                ],
                exclude: /[\\/](node_modules|test)[\\/]/
            }
        ]
    },
    plugins: [new ReactRefreshWebpackPlugin()]
});
