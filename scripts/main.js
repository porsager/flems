console.time('build') // eslint-disable-line

const rollup = require('rollup')
    , commonjs = require('rollup-plugin-commonjs')
    , nodeResolve = require('rollup-plugin-node-resolve')
    , buble = require('rollup-plugin-buble')
    , uglify = require('rollup-plugin-uglify')
    , filesize = require('rollup-plugin-filesize')
    , replace = require('rollup-plugin-replace')
    , string = require('rollup-plugin-string')
    , codemirrorCss = require('./codemirrorcss')
    , pkg = require('../package.json')

// UMD
rollup.rollup({
  input: 'src/index.js',
  plugins: [
    replace({
      'process.env.FLEMS_VERSION': JSON.stringify(pkg.version),
      'window.m = m // wright hmr': '',
      'b.setDebug(true)': '',
      codemirrorStyles: JSON.stringify(codemirrorCss)
    }),
    string({ include: 'src/**/*.svg' }),
    commonjs(),
    nodeResolve(),
    buble(),
    uglify({ mangle: { reserved: ['flemsLoadScript'] }, compress: true }),
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
