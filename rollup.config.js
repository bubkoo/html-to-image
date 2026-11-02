import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/index.ts',
  plugins: [
    typescript({ declaration: false, module: 'esnext' }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    terser(),
  ],
  output: [
    {
      name: 'htmlToImage',
      format: 'umd',
      file: 'dist/html-to-image.js',
      sourcemap: true,
    },
  ],
}
