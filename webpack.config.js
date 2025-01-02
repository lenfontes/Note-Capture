const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/js/background.js',
    popup: './src/js/popup.js',
    'google-api': './src/js/google-api.js'
  },
  output: {
    path: path.resolve(__dirname, 'extension-dist'),
    filename: '[name].js',
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
