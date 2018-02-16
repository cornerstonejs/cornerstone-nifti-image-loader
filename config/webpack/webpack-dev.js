const baseConfig = require('./webpack-base');
const merge = require('./merge');
const LiveReloadPlugin = require('webpack-livereload-plugin');

const devConfig = {
  plugins: [
    new LiveReloadPlugin({
      appendScriptTag: true,
      port: 45001
    })
  ]
};

module.exports = merge(baseConfig, devConfig);
