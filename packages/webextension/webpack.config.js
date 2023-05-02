const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/inject/inject.js',
  mode: 'production',
  output: {
    filename: 'inject/inject.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src', to: './' },
      ],
    }),
  ],
};

