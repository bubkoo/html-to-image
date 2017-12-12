const path = require('path')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const modules = {
  rules: [
    {
      test: /\.js?$/,
      include: [
        path.resolve(__dirname, 'src'),
      ],
      loader: 'babel-loader',
    },
  ],
}

module.exports = [
  {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'html-to-image.js',
      library: 'html2image',
      libraryTarget: 'umd',
    },
    module: modules,
  },
  {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'html-to-image.min.js',
      library: 'html2image',
      libraryTarget: 'umd',
    },
    module: modules,
    devtool: 'source-map',
    plugins: [new UglifyJSPlugin({ sourceMap: true })],
  },
]

