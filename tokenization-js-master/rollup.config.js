import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const pkgName = 'guesty-tokenization-js';

const tsconfigOverride = {
  exclude: ['node_modules', '**/*.test.ts'],
};

export default [
  {
    input: 'src/index.ts',
    plugins: [typescript({ ...tsconfigOverride })],
    output: [
      {
        file: `lib/esm/${pkgName}.js`,
        format: 'esm',
      },
      {
        file: `lib/esm/${pkgName}.min.js`,
        format: 'esm',
        plugins: [terser()],
      },
      {
        file: `lib/cjs/${pkgName}.js`,
        format: 'cjs',
      },
      {
        file: `lib/cjs/${pkgName}.min.js`,
        format: 'cjs',
        plugins: [terser()],
      },
    ],
  },
];
