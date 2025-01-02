const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/js/background.js',
    popup: './src/js/popup.js'
  },
  output: {
    path: path.resolve(__dirname, 'extension-dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './src/manifest.json', to: 'manifest.json' },
        { from: './src/pages', to: 'pages' },
        { from: './src/icons', to: 'icons' },
        { from: './src/styles', to: 'styles' }
      ],
    }),
  ],
};
