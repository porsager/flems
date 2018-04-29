import lz from 'lz-string'
import { assign, ext, urlRegex, findFile } from './utils'
import compilers from './compilers'

const extMap = {
  html      : 'document',
  js        : 'script',
  ts        : 'script',
  ls        : 'script',
  coffee    : 'script',
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

export function sanitize(state) {
  const clean = assign(defaults(), state)

  Object.keys(state).forEach(key => {
    if (key in clean)
      clean[key] = state[key]
  })

  clean.middle = Math.min(Math.max(clean.middle, 0), 100)

  clean.files.forEach(f => {
    f.type = f.type || extMap[ext(f.name)]
    f.content = f.content || ''

    if (typeof f.compiler === 'string' && !(f.compiler in compilers))
      throw new Error(f.compiler + ' is not supported')
  })

  if (clean.files.some(f => f.name.toLowerCase() === name.toLowerCase()))
    throw new Error('Multiple files with the same name: ' + name + ' cannot exist')

  clean.links.forEach(f => {
    if (!urlRegex.test(f.url))
      throw new Error('Link url\'s should start with http:// or https://')

    f.type = extMap[f.type] || f.type
    f.name = f.name || f.url.slice(f.url.lastIndexOf('/') + 1)
  })

  if (!findFile(clean, clean.selected))
    clean.selected = (clean.files[0] || {}).name || (clean.links[0] || {}).url

  return clean
}

const d = defaults()

export const createFlemsIoLink = state => {
  return 'https://flems.io/#0=' + lz.compressToEncodedURIComponent(
    JSON.stringify(state, function Include(key, value) {
      if (this !== state || value === state)
        return value

      if (key === 'links' && value.length === 0)
        return

      if (key === 'files' && value && value.length === d.files.length
        && d.files.every((f, i) => value[i].name === f.name && value[i].content === f.content))
        return

      if (value === state.files)
        return state.files.map(({ name, content, compiler, selections }) => ({ name, content, compiler, selections }))

      if (value === state.links)
        return state.links.map(({ name, url, type, patches, selections }) => ({ name, url, type, patches, selections }))

      if (key in d && d[key] !== value)
        return value
    })
  )
}
