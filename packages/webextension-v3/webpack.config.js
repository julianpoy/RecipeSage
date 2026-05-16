const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
  entry: {
    "action/action.js": path.resolve(__dirname, "src/action/action.ts"),
    "settings/settings.js": path.resolve(__dirname, "src/settings/settings.ts"),
    "inject/inject.js": path.resolve(__dirname, "src/inject/inject.ts"),
  },
  mode: "production",
  output: {
    filename: "[name]",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, "tsconfig.app.json"),
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: path.resolve(__dirname, "tsconfig.app.json"),
            transpileOnly: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "src",
          to: "./",
          globOptions: {
            ignore: ["**/*.ts"],
          },
        },
      ],
    }),
  ],
  optimization: {
    minimize: false,
  },
};
