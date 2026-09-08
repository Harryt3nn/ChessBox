/*apps/desktop/webpack.plugins.ts*/

import path from 'path';
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
    typescript: {
      configFile: path.resolve(__dirname, '..', '..', 'tsconfig.json'),
    },
  }),
];