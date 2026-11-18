import path from 'path';
import { defineConfig } from 'vitest/config';

// mirrors the @chessbox/shared aliases in tsconfig.json and the webpack configs
const shared = path.resolve(import.meta.dirname, '../../vendor/chessbox-server/packages/shared/src');

export default defineConfig({
  resolve: {
    alias: [
      { find: '@chessbox/shared/router', replacement: path.join(shared, 'router.ts') },
      { find: '@chessbox/shared', replacement: shared },
    ],
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
