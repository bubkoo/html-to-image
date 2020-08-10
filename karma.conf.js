module.exports = function (config) {
  const configuration = {
    frameworks: ['jasmine', 'karma-typescript'],
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
    preprocessors: {
      'src/**/*.ts': ['karma-typescript'],
      'test/spec/**/*.ts': ['karma-typescript'],
    },
    reporters: ['spec', 'karma-typescript'],
    browsers: ['Chrome'],
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.json',
      include: ['src/**/*.ts', 'test/spec/**/*.ts'],
      bundlerOptions: { sourceMap: true },
      coverageOptions: {
        instrumentation: true,
        exclude: /test\/spec\/.*\.ts$/,
      },
      reports: {
        html: 'test/coverage',
        lcovonly: 'test/coverage',
        'text-summary': '',
      },
    },
    customLaunchers: {
      ChromeTravisCI: {
        base: 'Chrome',
        flags: ['--no-sandbox'],
      },
    },
    client: { jasmine: { random: false } },
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: true,
    concurrency: Infinity,
  }

  if (process.env.TRAVIS) {
    configuration.browsers = ['ChromeTravisCI']
  }

  config.set(configuration)
}
