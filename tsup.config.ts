import type { Options } from 'tsup'

export const tsup: Options = {
  entry: [
    'src/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  shims: false,
  external: ['alien-signals'],
}
