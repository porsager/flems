import { memoize } from './utils'

const load = memoize(url =>
  new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.async = false
    el.charset = 'utf-8'
    el.src = url
    document.body.appendChild(el)
    el.onload = resolve
    el.onerror = err =>
      reject('Could not load compiler from ' + url)
  })
)

const compilers = {
  styl: file => load('https://static.flems.io/compilers/stylus.min.js').then(() => ({
    code: window.stylus.render(file.content)
  })),
  scss: file => load('https://static.flems.io/compilers/sass.sync.js').then(() =>
    new Promise((resolve, reject) =>
      window.Sass.compile(file.content, result => {
        result.message
          ? reject(result.message)
          : resolve({ code: result.text })
      })
    )
  ),
  sass: file => load('https://static.flems.io/compilers/sass.sync.js').then(() =>
    new Promise((resolve, reject) =>
      window.Sass.compile(file.content, {
        indentedSyntax: true
      }, result => {
        result.message
          ? reject(result.message)
          : resolve({ code: result.text })
      })
    )
  ),
  less: file => load('https://static.flems.io/compilers/less.min.js').then(() =>
    window.less.render(file.content).then(result => ({ code: result.css }))
  ),
  ts: file => load('https://static.flems.io/compilers/typescriptServices.js').then(() => {
    const result = window.ts.transpileModule(file.content, {
      fileName: file.name,
      compilerOptions: {
        module: 'esnext',
        target: 'esnext',
        sourceMap: true,
        jsx: 'react'
      }
    })

    return {
      code: result.outputText.substring(0, result.outputText.lastIndexOf('\n')),
      map: result.sourceMapText
    }
  }),
  babel: file => load('https://static.flems.io/compilers/babel.min.js').then(() =>
    window.Babel.transform(file.content, {
      presets: [['es2015', { modules: false }], 'stage-2', 'react'],
      sourceMaps: true,
      sourceType: 'unambiguous',
      sourceFileName: file.name
    })
  ),
  ls: file => load('https://static.flems.io/compilers/livescript-min.js').then(() => {
    if (!window.livescript)
      window.livescript = window.require('livescript')

    const result = window.livescript.compile(file.content, {
      map: 'linked',
      filename: file.name
    })

    return {
      code: result.code,
      map: result.map.toString()
    }
  }),
  coffee: file => Promise.all([
    load('https://static.flems.io/compilers/babel.min.js'),
    load('https://static.flems.io/compilers/coffeescript.js')
  ]).then(() => {
    const coffee = window.CoffeeScript.compile(file.content, {
      sourceMap: true,
      filename: file.name
    })

    const data = window.Babel.transform(coffee.js, {
      presets: [['es2015', { modules: false }], 'stage-2', 'react'],
      sourceMaps: true,
      inputSourceMap: JSON.parse(coffee.v3SourceMap),
      sourceFileName: file.name
    })

    return data
  }),
  sibilant: file => load('https://static.flems.io/compilers/sibilant.js').then(() => {
    return {
      code: window.sibilant.sibilize(file.content)
    }
  })
}

export default compilers
