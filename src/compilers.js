import inspect from 'object-inspect'
import { memoize } from './utils'

const load = memoize(url =>
  new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.async = false
    el.charset = 'utf-8'
    el.src = url
    document.body.appendChild(el)
    el.onload = resolve
    el.onerror = err => {
      reject('Could not load compiler from ' + url + '\n\n' + inspect(err))
    }
  })
)

const compilers = {
  ts: file => load('https://unpkg.com/typescript@2.4.2/lib/typescriptServices.js').then(() => {
    const result = window.ts.transpileModule(file.content, {
      fileName: file.name,
      compilerOptions: {
        sourceMap: true,
        jsx: 'react'
      }
    })

    return {
      code: result.outputText.substring(0, result.outputText.lastIndexOf('\n')),
      map: result.sourceMapText
    }
  }),
  babel: file => load('https://unpkg.com/babel-standalone@6/babel.min.js').then(() =>
    window.Babel.transform(file.content, {
      presets: ['es2015', 'react'],
      sourceMaps: true,
      sourceFileName: file.name,
      sourceMapTarget: file.name
    })
  ),
  ls: file => load('https://rawgit.com/gkz/LiveScript/master/browser/livescript.js').then(() => {
    if (!window.liveScript)
      window.livescript = window.require('livescript')

    const result = window.livescript.compile(file.content, {
      map: 'notInCode',
      filename: file.name
    })

    return {
      code: result.code,
      map: result.map.toString()
    }
  })
}

export default compilers
