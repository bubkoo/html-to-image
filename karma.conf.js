/* eslint-disable */

const cpuCount = require('os').cpus().length
const reportsDir = 'test/coverage'

module.exports = function (config) {
  const hasFlag = (flag) => process.argv.some((arg) => arg === flag)
  const isDebug = hasFlag('--debug')
  const isWatch = hasFlag('--auto-watch')

  config.set({
    files: [
      {
        pattern: 'test/spec/resources/**/*',
        included: false,
        served: true,
      },
      {
        pattern: 'node_modules/@fortawesome/fontawesome-free/css/*.*',
        included: false,
        served: true,
      },
      {
        pattern: 'node_modules/@fortawesome/fontawesome-free/webfonts/*.*',
        included: false,
        served: true,
      },
      'node_modules/imagediff/imagediff.js',
      'src/**/*.ts',
      'test/spec/**/*.ts',
    ],
    frameworks: ['jasmine', 'karma-typescript'],
    preprocessors: {
      '**/*.ts': ['karma-typescript'],
    },
    reporters: ['spec', 'karma-typescript'],
    specReporter: {
      suppressPassed: isWatch || isDebug,
    },
    browsers: [process.env.CI ? 'ChromeHeadless' : 'ChromeHeadless'],
    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--headless',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-translate',
          '--disable-extensions',
          '--remote-debugging-port=9222',
        ],
      },
    },
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.json',
      include: ['src/**/*.ts', 'test/spec/**/*.ts'],
      bundlerOptions: { sourceMap: true },
      coverageOptions: {
        instrumentation: !isDebug,
        exclude: /\.test|spec\.ts$/,
      },
      reports: {
        html: reportsDir,
        lcovonly: {
          directory: reportsDir,
          subdirectory: './',
          filename: 'lcov.info',
        },
        cobertura: {
          directory: reportsDir,
          subdirectory: './',
          filename: 'coverage.xml',
        },
        'text-summary': '',
      },
    },

    client: {
      jasmine: {
        random: false,
      },
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: cpuCount || Infinity,
  })
}
