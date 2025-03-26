import type { Options } from 'tsup'

export const tsup: Options = {
  entry: [
    'src/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  clean: true,
  shims: false,
  minify: true,
  noExternal: ['alien-signals'],
}
