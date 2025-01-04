import type { Options } from 'tsup'

export const tsup: Options = {
  entry: [
    'src/*.ts',
  ],
  format: 'esm',
  dts: true,
  splitting: true,
  clean: true,
  shims: false,
  external:['alien-signals'],
}
