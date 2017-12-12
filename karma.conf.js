module.exports = function anonymous(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai'],
    files: [
      {
        pattern: 'test/spec/resources/**/*',
        included: false,
        served: true,
      },
      'test/spec/main.spec.js',
    ],
    exclude: [],
    preprocessors: {
      'src/*.js': ['babel', 'coverage'],
      'test/**/*.spec.js': ['webpack'],
    },
    webpackPreprocessor: {
      configPath: './webpack.config.test.js',
    },
    reporters: ['mocha', 'coverage', 'coveralls'],
    coverageReporter: {
      reporters: [
        { type: 'lcov', dir: 'test/coverage/' },
        { type: 'text-summary' },
      ],
    },
    browsers: ['chrome'],
    customLaunchers: {
      chrome: {
        base: 'Chrome',
        flags: ['--no-sandbox'],
      },
    },
    concurrency: 1,
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    client: {
      captureConsole: true,
    },
    autoWatch: true,
    singleRun: false,
    browserNoActivityTimeout: 60000,
  })
}
