const path = require("path");
const webpack = require("webpack");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const enableSourcemapUpload = process.env.SOURCEMAP_UPLOAD === "true";

module.exports = {
  entry: "./src/service-worker.ts",
  mode: "production",
  devtool: enableSourcemapUpload ? "source-map" : false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin(["ENVIRONMENT", "APP_VERSION"]),
    enableSourcemapUpload &&
      sentryWebpackPlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "recipesage",
        project: "recipesage-service-worker",
        release: {
          name: process.env.APP_VERSION,
        },
      }),
  ].filter(Boolean),
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, "tsconfig.json"),
      }),
    ],
  },
  output: {
    filename: "service-worker.js",
    path: path.resolve(__dirname, "src"),
  },
  optimization: {
    minimize: true,
  },
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
