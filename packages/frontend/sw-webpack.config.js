const path = require("path");

module.exports = {
  entry: "./src/service-worker.ts",
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "service-worker.js",
    path: path.resolve(__dirname, "src"),
  },
  optimization: {
    minimize: true,
  },
};
