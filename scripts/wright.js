const wright = require('wright')
    , rollup = require('rollup')
    , commonjs = require('rollup-plugin-commonjs')
    , nodeResolve = require('rollup-plugin-node-resolve')
    , replace = require('rollup-plugin-replace')
    , codemirrorCss = require('./codemirrorcss')
    , pkg = require('../package.json')
    , svg = require('./svg')

wright({
  main: 'scripts/wright.html',
  serve: 'dist',
  // run: 'm.redraw',
  debug: true,
  js: {
    watch: 'src/**/*.js',
    path: 'flems.js',
    compile: roll
  },
  execute: {
    watch: 'src/srcdoc/index.js',
    command: 'npm run build:runtime'
  }
})

let cache = null
function roll(dev) {
  return rollup.rollup({
    input: 'src/index.js',
    cache: cache,
    treeshake: false,
    plugins: [
      replace({
        'process.env.FLEMS_VERSION': JSON.stringify(pkg.version),
        codemirrorStyles: JSON.stringify(codemirrorCss)
      }),
      svg(),
      commonjs(),
      nodeResolve()
    ]
  })
  .then(bundle => {
    cache = bundle
    return bundle.generate({
      name: 'Flems',
      format: 'umd'
    })
  })
  .then(result => result.code)
}
