import lz from 'lz-string'
import { ext, urlRegex, findFile } from './utils'
import compilers from './compilers'

const extMap = {
  html      : 'document',
  js        : 'script',
  mjs       : 'script',
  ts        : 'script',
  ls        : 'script',
  coffee    : 'script',
  sibilant  : 'script',
  css       : 'style',
  styl      : 'style',
  less      : 'style',
  scss      : 'style',
  sass      : 'style'
}

export const defaults = () => ({
  middle        : 50,
  selected      : '.js',
  color         : 'rgb(38,50,56)',
  theme         : 'material',
  layout        : 'auto',
  resizeable    : true,
  editable      : true,
  toolbar       : true,
  fileTabs      : true,
  linkTabs      : true,
  shareButton   : true,
  reloadButton  : true,
  console       : true,
  autoReload    : true,
  autoReloadDelay: 400,
  autoFocus     : false,
  autoHeight    : false,
  scroll        : null,
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

export function sanitize(state) {
  const d = defaults()

  Object.keys(d).forEach(key => {
    if (!(key in state))
      state[key] = d[key]
  })

  state.middle = Math.min(Math.max(state.middle, 0), 100)

  state.files.forEach(f => {
    f.type = f.type || extMap[ext(f.name)]
    f.content = f.content || ''

    if (typeof f.compiler === 'string' && !(f.compiler in compilers))
      throw new Error('Unknown compler: ' + f.compiler)
  })

  state.files.reduce((acc, f) => {
    if (acc.indexOf(f.name) > -1)
      throw new Error('Multiple files with the same name: ' + name)

    return acc.concat(f.name)
  }, [])

  state.links.forEach(f => {
    if (!urlRegex.test(f.url))
      throw new Error('Link url\'s should start with http:// or https://')

    f.type = extMap[f.type] || f.type || extMap[ext(f.url)] || 'script'
    f.name = f.name || f.url.slice(f.url.lastIndexOf('/') + 1)
  })

  if (!findFile(state, state.selected))
    state.selected = (state.files[0] || {}).name || (state.links[0] || {}).url

  return state
}

export const createFlemsIoLink = state => {
  return 'https://flems.io/#0=' + lz.compressToEncodedURIComponent(
    JSON.stringify(clean(state))
  )
}

function clean(state) {
  const clean = Object.keys(defaults()).reduce((acc, x) =>
    (x in state && state[x] !== defaults[x] && (acc[x] = state[x]), acc)
  , {})

  if (state.files && state.files.length)
    clean.files = pluck(state.files, ['name', 'content', 'compiler', 'selections'])

  if (state.links)
    clean.links = pluck(state.links, ['name', 'url', 'type', 'patches', 'selections'])

  return clean
}

function pluck(array = [], fields) {
  return array.map(a => fields.reduce((acc, x) => (acc[x] = a[x], acc), {}))
}
