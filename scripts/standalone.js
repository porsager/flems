const fs = require('fs')

const main = fs.readFileSync('dist/flems.js', 'utf8')
    , runtime = fs.readFileSync('dist/runtime.html', 'utf8')

fs.writeFileSync('dist/flems.html', [
  '/*',
  runtime,
  '<!-- */',
  main + '// -->'
].join('\n'))
