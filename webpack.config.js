import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {},
  output: {
    path: path.resolve(__dirname, 'extension-dist'),
    clean: true
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/js/background.js', to: 'background.js' },
        { from: 'src/icons/*', to: 'icons/[name][ext]' }
      ]
    })
  ]
};
