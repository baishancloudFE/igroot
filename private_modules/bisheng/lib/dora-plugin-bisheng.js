'use strict';

var updateWebpackConfig = require('./utils/update-webpack-config');

module.exports = {
  'webpack.updateConfig': function webpackUpdateConfig(webpackConfig) {
    return updateWebpackConfig(webpackConfig);
  }
};