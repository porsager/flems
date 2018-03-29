import lz from 'lz-string'

export const ext = f => f.lastIndexOf('.') > -1 && f.slice(f.lastIndexOf('.') + 1)

export const urlRegex = /^https?:\/\//
export const filenameRegex = /^[\w-_.]*$/

export const findFile = (state, name) =>
  state.files.filter(f => f.name === name)[0] ||
  state.links.filter(l => l.url === name)[0]

export function endsWith(suffix, str) {
  if (arguments.length === 1)
    return str => endsWith(suffix, str)

  return str.indexOf(suffix, str.length - suffix.length) > -1
}

export const wait = ms => () => new Promise(res => setTimeout(res, ms))

export function assign(obj, obj2 = {}) {
  const newObj = {}
  Object.keys(obj).concat(Object.keys(obj2)).forEach(key =>
    newObj[key] = Object.prototype.hasOwnProperty.call(obj2, key) ? obj2[key] : obj[key]
  )
  return newObj
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
