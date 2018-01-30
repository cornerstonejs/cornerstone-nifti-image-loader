const extendConfiguration = require('./karma-extend.js');

module.exports = function (config) {
  config.set(extendConfiguration({
    singleRun: true,
    reporters: ['progress', 'coverage'],
    browsers: ['ChromeHeadless']
  }));
};
