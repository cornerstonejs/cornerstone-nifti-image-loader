const path = require('path');

const rootPath = process.cwd();
const context = path.join(rootPath, 'src');
const outputPath = path.join(rootPath, 'dist');
const bannerPlugin = require('./plugins/banner');

module.exports = {
  context,
  entry: {
    cornerstoneNIFTIImageLoader: './imageLoader/index.js'
    // cornerstoneNIFTIImageLoaderWebWorker: './webWorker/index.js'
  },
  target: 'web',
  output: {
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd',
    path: outputPath,
    umdNamedDefine: true
  },
  devtool: 'source-map',
  externals: {
    'nifti-reader': {
      commonjs: 'nifti',
      commonjs2: 'nifti',
      amd: 'nifti',
      root: 'nifti'
    }
  },
  module: {
    rules: [{
      enforce: 'pre',
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'eslint-loader',
      options: {
        failOnError: true
      }
    }, {
      test: /\.js$/,
      exclude: /(node_modules)/,
      use: [{
        loader: 'babel-loader'
      }]
    }]
  },
  plugins: [
    bannerPlugin()
  ]
};
