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

    f.name = f.name || f.url.slice(f.url.lastIndexOf('/') + 1)
  })

  if (!findFile(clean, clean.selected))
    clean.selected = (clean.files[0] || {}).name || (clean.links[0] || {}).url

  return clean
}
