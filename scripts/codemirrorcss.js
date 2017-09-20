const csso = require('csso')
    , fs = require('fs')

const sheets = [
  'node_modules/codemirror/lib/codemirror.css',
  'node_modules/codemirror/theme/material.css',
  'node_modules/codemirror/addon/fold/foldgutter.css',
  'node_modules/codemirror/addon/dialog/dialog.css'
]

module.exports = csso.minify(
  sheets
  .map(f =>
    fs.readFileSync(f, 'utf8')
      .replace('\\25BE', '▾')
      .replace('\\25B8', '▸')
  )
  .join('')
).css
