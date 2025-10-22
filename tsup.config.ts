import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry settings
  tsconfig: 'tsconfig.build.json',
  entry: ['src/index.ts'],

  // Output settings
  outDir: 'dist',
  clean: true,

  // Module settings
  format: ['cjs'],
  target: 'node18',
  skipNodeModulesBundle: true,

  // Bundling settings
  bundle: true,
  dts: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
});
