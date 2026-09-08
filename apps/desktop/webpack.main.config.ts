/*apps/desktop/webpack.main.config.ts*/

import path from 'path';
import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

const mainRules = [
  ...rules,
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
];

export const mainConfig: Configuration = {
  entry: './src/index.ts',
  module: {
    rules: mainRules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@chessbox/shared/router': path.resolve(__dirname, '..', '..', 'vendor', 'chessbox-server', 'packages', 'shared', 'src', 'router.ts'),
      '@chessbox/shared': path.resolve(__dirname, '..', '..', 'vendor', 'chessbox-server', 'packages', 'shared', 'src'),
    },
  },
};