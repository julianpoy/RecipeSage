const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    "inject/inject.js": path.resolve(__dirname, "src/inject/inject.js"),
    "inject/clip.js": path.resolve(__dirname, "src/inject/clip.js"),
  },
  mode: "production",
  output: {
    filename: "[name]",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "src", to: "./" }],
    }),
  ],
  optimization: {
    minimize: false,
  },
};
