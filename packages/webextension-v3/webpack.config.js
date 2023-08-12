const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/action/action.js",
  mode: "production",
  output: {
    filename: "action/action.js",
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
