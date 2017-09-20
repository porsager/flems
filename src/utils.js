import lz from 'lz-string'

export function endsWith(suffix, str) {
  if (arguments.length === 1)
    return str => endsWith(suffix, str)

  return str.indexOf(suffix, str.length - suffix.length) > -1
}

export function assign(obj, obj2) {
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key))
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

export const memoize = (fn, cache = new Map()) => item =>
  cache.has(item)
    ? cache.get(item)
    : cache.set(item, fn(item)).get(item)

export const ext = f => f.lastIndexOf('.') > -1 && f.slice(f.lastIndexOf('.') + 1)

export const isJs = endsWith('.js')
export const isTs = endsWith('.ts')
export const isLs = endsWith('.ls')
export const isCss = endsWith('.css')
export const isHtml = endsWith('.html')
export const isScript = f => isJs(f) || isTs(f) || isLs(f)

export const urlRegex = /^https?:\/\//
export const filenameRegex = /^[\w-_.]*$/
