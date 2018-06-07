const useDefaultConfig = require('@ionic/app-scripts/config/webpack.config.js');
const ManifestPlugin = require('webpack-manifest-plugin');
useDefaultConfig.prod.output.filename = '[name].[chunkhash:10].js';
useDefaultConfig.prod.plugins.push(new ManifestPlugin({
  fileName: '../../build-manifest.json'
}));
module.exports = useDefaultConfig;
