console.time('build') // eslint-disable-line

const rollup = require('rollup')
    , commonjs = require('@rollup/plugin-commonjs')
    , { nodeResolve } = require('@rollup/plugin-node-resolve')
    , esbuild = require('rollup-plugin-esbuild')
    , filesize = require('rollup-plugin-filesize')
    , modify = require('rollup-plugin-modify')
    , svgo = require('rollup-plugin-svgo')
    , codemirrorCss = require('./codemirrorcss')
    , pkg = require('../package.json')

// UMD
rollup.rollup({
  input: 'src/index.js',
  plugins: [
    ...Object.entries({
      'process.env.FLEMS_VERSION': JSON.stringify(pkg.version),
      'window.m = m // wright hmr': '',
      'b.setDebug(true)': '',
      codemirrorStyles: JSON.stringify(codemirrorCss)
    }).map(([key, value]) => modify({
      find: key,
      replace: value
    })),
    svgo(),
    nodeResolve({
      browser: true
    }),
    commonjs(),
    esbuild({ minify: true }),
    filesize()
  ]
})
.then(bundle =>
  bundle.write({
    file: 'dist/flems.js',
    name: 'Flems',
    sourcemap: true,
    format: 'umd'
  })
)
.catch(console.error) // eslint-disable-line

process.on('exit', () => console.timeEnd('build')) // eslint-disable-line
