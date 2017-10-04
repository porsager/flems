import { endsWith, urlRegex, filenameRegex } from './utils'
import compilers from './compilers'
import stream from 'mithril/stream'
import b from 'bss'

const scripts = document.getElementsByTagName('script')
    , flems = scripts[scripts.length - 1]
    , runtimeUrlGuess = endsWith('flems.html', flems ? flems.src : '') && flems.src
    , findFile = (state, name) =>
      state.files.filter(f => f.name === name)[0] ||
      state.links.filter(l => l.url === name)[0]

const defaults = () => ({
  middle        : 50,
  selected      : '.js',
  color         : 'rgb(38,50,56)',
  resizeable    : true,
  editable      : true,
  toolbar       : true,
  fileTabs      : true,
  linkTabs      : true,
  shareButton   : true,
  reloadButton  : true,
  console       : true,
  autoReload    : true,
  autoFocus     : false,
  autoHeight    : false,
  files : [{
    name: '.html',
    content: ''
  }, {
    name: '.js',
    content: ''
  }, {
    name: '.css',
    content: ''
  }],
  links : []
})

export { defaults }

export default function(dom, state, runtimeUrl) {
  state = validateAndCleanState(state)

  const id = randomId()
      , selected = stream(state.selected)
      , selectedFile = selected.map(s => findFile(state, s))

  state.middle = Math.min(Math.max(state.middle, 0), 100)
  selected.map(name => state.selected = name)

  const model = {
    id,
    dom,
    state,
    findFile,
    selected,
    selectedFile,
    iOS           : 'overflowScrolling' in b,
    linkPatched   : {},
    docs          : {},
    runtimeUrl    : runtimeUrl || runtimeUrlGuess || 'flems.html',
    linkContent   : {},
    sourceMaps    : {},
    console       : {
      input         : '',
      output        : [],
      history       : [],
      position      : 0,
      manualScroll  : false,
      lineHeight    : 22,
      errors        : () => model.console.output.filter(o => o.type === 'error').length,
      infos         : () => model.console.output.filter(o => o.type !== 'error').length,
      inputHeight   : () => Math.min(
        model.console.lineHeight * model.console.input.split('\n').length,
        model.console.lineHeight * 5
      )
    },
    cmHeight      : null,
    iframe        : null,
    loading       : true,
    resizing      : false,
    hideError     : true,
    dragging      : false,
    refreshCm     : stream(),
    focus         : stream(),
    vertical      : () => dom.offsetWidth < 600,
    toolbar       : () => model.state.toolbar ? 38 : 0
  }

  return model
}

function randomId() {
  return ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3) +
         ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3)
}

function validateAndCleanState(state) {
  const clean = defaults()

  Object.keys(state).forEach(key => {
    if (key in clean)
      clean[key] = state[key]
  })

  clean.files.forEach(f => {
    validateFilename(f.name)
    validateCompiler(f.compiler)
    f.content = f.content || ''
  })

  if (clean.files.some(f => f.name.toLowerCase() === name.toLowerCase()))
    throw new Error('Multiple files with the same name: ' + name + ' cannot exist')

  clean.links.forEach(f => {
    validateUrl(f.url)
    f.name = f.name || f.url.slice(f.url.lastIndexOf('/') + 1)
  })

  if (!findFile(clean, clean.selected))
    clean.selected = (clean.files[0] || {}).name || (clean.links[0] || {}).url

  return clean
}

function validateFilename(filename) {
  if (name.length > 60)
    throw new Error('File names can be no longer than 64 characters')

  if (!filenameRegex.test(name))
    throw new Error('File names can only include a-Z, 0-9, dash, underscore and period')
}

function validateUrl(url) {
  if (!urlRegex.test(url))
    throw new Error('Link url\'s should start with http:// or https://')
}

function validateCompiler(compiler) {
  if (compiler && !(compiler in compilers))
    throw new Error(compiler + ' is not supported')
}
