import lz from 'lz-string'

export function endsWith(suffix, str) {
  if (arguments.length === 1)
    return str => endsWith(suffix, str)

  return str.indexOf(suffix, str.length - suffix.length) > -1
}

export function assign(obj, obj2) {
  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key))
      obj[key] = obj2[key]
  }
  return obj
}

export const createFlemsIoLink = state => {
  return 'https://flems.io/#0=' + lz.compressToEncodedURIComponent(
    JSON.stringify(state)
  )
}

export function find(fn, array) {
  let match = null
  array.some(item => {
    match = fn(item)
    return match
  })
  return match
}

export const memoize = (fn, cache = {}) => item =>
  item in cache
    ? cache[item]
    : cache[item] = fn(item)

export const ext = f => f.lastIndexOf('.') > -1 && f.slice(f.lastIndexOf('.') + 1)

export const isJs = endsWith('.js')
export const isTs = endsWith('.ts')
export const isLs = endsWith('.ls')
export const isCoffee = endsWith('.coffee')
export const isCss = endsWith('.css')
export const isHtml = endsWith('.html')
export const isScript = f => isJs(f) || isTs(f) || isLs(f) || isCoffee(f)

export const urlRegex = /^https?:\/\//
export const filenameRegex = /^[\w-_.]*$/
