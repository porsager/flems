import inspect from 'object-inspect'
import 'mithril/promise/promise'
import { endsWith } from '../utils'

let id = window.name
let currentScript = {}
let consoleCount = 0

const parent = window.parent
const blobUrls = {}
const moduleExports = {}

try {
  window.parent = null
  window.frameElement = null
  delete window.parent
  delete window.frameElement
} catch (e) {
  // noop
}

document.write = function(html) {
  document.body.innerHTML += html
}

Error.stackTraceLimit = Infinity

const monkeys = ['log', 'error', 'trace', 'warn', 'info', 'time', 'timeEnd']
    , log = window.console.log

monkeys.forEach(monkey => {
  const original = window.console[monkey]

  window.console[monkey] = patch(original, monkey)
})

window.p = patch(null, 'print', true)

window.onerror = function(msg, file, line, col, err) { // eslint-disable-line
  err = (!err || typeof err === 'string') ? { message: msg || err } : err

  err.stack = (!err.stack || String(err) === err.stack)
    ? ('at ' + (file || currentScript.name || 'unknown') + ':' + line + ':' + col)
    : err.stack

  err.currentScript = currentScript.name
  consoleOutput(err.message || String(err), 'error', err)
}

window.addEventListener('unhandledrejection', (e) =>
  window.p('Unhandled rejection:', e.reason)
)

window.addEventListener('resize', () => send('resize'))
window.addEventListener('message', ({ data }) => {
  if (data.name === 'init') {
    init(data.content)
  } else if (data.name === 'css') {
    const style = document.getElementById(data.content.name)
    style
      ? style.textContent = data.content.content
      : location.reload()
  } else if (data.name === 'eval') {
    try {
      consoleOutput(cleanLog([window.eval(data.content)]), 'log', { stack: '' }) // eslint-disable-line
    } catch (err) {
      consoleOutput(cleanLog([String(err)]), 'error', { stack: '' })
    }
  }
})

function send(name, content) {
  parent.postMessage({
    flems: id,
    name: name,
    content: content
  }, '*')
}

function init(data) {
  id = data.id

  const state = data.state
  const body = state.files.filter(f => endsWith('.html', f.name))[0]
  const title = document.title

  document.documentElement.innerHTML = body ? body.content : ''

  if (!document.title)
    document.title = title

  const scripts = Array
    .prototype
    .slice
    .call(document.getElementsByTagName('script'))
    .map(s => ({
      url: s.src,
      name: '.html',
      type: 'script',
      content: s.textContent,
      el: s
    }))

  state
    .links
    .filter(l => l.type === 'style' && !l.content)
    .forEach(loadRemoteStyle)

  state.files
    .filter(f => f.type === 'style')
    .concat(state.links.filter(l => l.type === 'style' && l.content))
    .forEach(loadStyle)

  Promise
    .all(
      state.links
      .filter(l => l.type === 'script')
      .map(loadRemoteScript)
      .concat(scripts.map(s => s.url
        ? loadRemoteScript(s)
        : flemsLoadScript(s)
      ))
    )
    .then(() => {
      send('loaded')
      state.files.filter(f => f.type === 'script').forEach(flemsLoadScript)
    })
    .catch(err => {
      consoleOutput('Error loading:\n\t' + err.join('\n\t'), 'error', { stack: '' })
    })
}

function patch(original, monkey, returnFirst) {
  return function(first) {
    (original || log).apply(console, arguments)
    consoleOutput(cleanLog(arguments), monkey, new Error(), 1)
    return returnFirst && first
  }
}

function cleanLog(args) {
  return [].slice.apply(args).map(a =>
    (typeof a === 'string' ? a : inspect(a).replace(/\\n/g, '\n'))
  )
}

function consoleOutput(content, type, err, slice = 0) {
  const stack = (err.stack || '').split('\n')
    .map(parseStackLine)
    .filter(a => a)
    .slice(slice)

  let cutoff = -1

  stack.forEach((s, i) => {
    if (cutoff === -1 && s.function.indexOf('flemsLoadScript') > -1)
      cutoff = i
  })
  send('console', {
    number: consoleCount++,
    file: err.currentScript,
    content: (Array.isArray(content) ? content : [content]).map(s => s === '' ? '\'\'' : String(s)),
    stack: cutoff > -1 ? stack.slice(0, cutoff) : stack,
    type: type,
    date: new Date()
  })
}

const locationRegex = /(.*)[ @(](.*):([\d]*):([\d]*)/i
function parseStackLine(string) {
  const [match, func, fileName, line, column] = (' ' + string.trim()).match(locationRegex) || []
      , file = blobUrls[fileName]

  return match && {
    function: func.trim().replace(/^(global code|at) ?/, ''),
    select: file ? (file.url || file.name) : fileName,
    file: file ? file.name : fileName,
    line: parseInt(line, 10),
    column: parseInt(column, 10)
  }
}

function loadRemoteStyle(style) {
  document.head.appendChild(create('link', {
    rel: 'stylesheet',
    type: 'text/css',
    href: style.url
  }))
}

function loadStyle(css) {
  document.head.appendChild(create('style', {
    id: css.name,
    textContent: css.content
  }))
}

function loadRemoteScript(script) {
  return new Promise((resolve, reject) => {
    if (script.content) {
      flemsLoadScript(script)
      return resolve()
    }
    const el = create('script', {
      charset: 'utf-8',
      async: false,
      defer: false,
      src: script.url
    })

    if (script.el)
      Array.prototype.slice.call(script.el.attributes).forEach(a => el.setAttribute(a.name, a.value))

    el.onload = () => resolve()
    el.onerror = err => reject([script.url, err])

    script.el
      ? script.el.parentNode.replaceChild(el, script.el)
      : document.body.appendChild(el)
  })
}

const isModuleRegex = /(^\s*|[}\);\n]\s*)(import\s*\(?(['"]|(\*[\s\S]+as[\s\S]+)?(?!type)([^"'\(\)\n;]+)[\s\S]*from[\s\S]*['"]|\{)|export\s*(['"]|(\*[\s\S]+as[\s\S]+)?(?!type)([^"'\(\)\n;]+)[\s\S]*from[\s\S]*['"]|\{|default|function|class|var|const|let|async[\s\S]+function|async[\s\S]+\())/
    , staticImportRegex = new RegExp('(import\\s*{?[a-zA-Z,\\s]*}?\\s*(?: from |)[\'"])([a-zA-Z0-9@/._-]*)([\'"])', 'g')
    , dynamicImportRegex = new RegExp('(import\\([\'"])([a-zA-Z0-9@/._-]*)([\'"]\\))', 'g')

function flemsLoadScript(script) {
  const isModule = isModuleRegex.test(script.content) ? 'module' : undefined

  const content = isModule
    ? Object.keys(moduleExports).reduce((acc, m) =>
      acc.replace(new RegExp(`(import\\s*{?[a-zA-Z,\\s]*}?\\s*(?: from |)['"]).?\\/${m}.?[a-z]*(['"])`, 'i'), '$1' + moduleExports[m] + '$2')
         .replace(new RegExp(`(import\\(['"]).?\\/${m}.?[a-z]*(['"]\\))`, 'ig'), '$1' + moduleExports[m] + '$2')
    , script.content)
      .replace(staticImportRegex, '$1https://unpkg.com/$2?module$3')
      .replace(dynamicImportRegex, '$1https://unpkg.com/$2?module$3')

    : script.content

  const url = URL.createObjectURL(new Blob([content], { type : 'application/javascript' }))

  blobUrls[url] = script
  if (isModule)
    moduleExports[script.name] = moduleExports[script.name.substring(0, script.name.lastIndexOf('.'))] = url

  const el = create('script', {
    src: url,
    charset: 'utf-8',
    async: false,
    defer: false,
    type: isModule ? 'module' : ''
  })

  if (script.el)
    Array.prototype.slice.call(script.el.attributes).forEach(a => el.setAttribute(a.name, a.value))

  el.onerror = err => consoleOutput(String(err), 'error', err)
  currentScript = script

  script.el
    ? script.el.parentNode.replaceChild(el, script.el)
    : document.body.appendChild(el)
}

function create(tag, options) {
  const el = document.createElement(tag)

  for (const key in options)
    el[key] = options[key]

  return el
}
