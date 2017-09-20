const fs = require('fs')
    , rollup = require('rollup')
    , commonjs = require('rollup-plugin-commonjs')
    , nodeResolve = require('rollup-plugin-node-resolve')
    , buble = require('rollup-plugin-buble')
    , uglify = require('rollup-plugin-uglify')


module.exports = rollup.rollup({
  input: 'src/srcdoc/index.js',
  plugins: [
    commonjs(),
    nodeResolve(),
    buble(),
    uglify({ mangle: { reserved: ['flemsLoadScript'] }, compress: true })
  ]
})
.then(bundle => bundle.generate({ format: 'iife' }))
.then(runtime =>
  fs.writeFileSync('dist/runtime.html', [
    '<!DOCTYPE html>',
    '<script type="text/javascript" charset="utf-8">',
    '\t' + runtime.code + '//# sourceURL=runtime.js',
    '</script>'
  ].join('\n'))
)
