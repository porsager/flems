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

export const debounced = (ms, fn, timer) => function() {
  clearTimeout(timer)
  timer = setTimeout(() => fn.apply(fn, arguments), ms)
}

export function assign(obj, obj2 = {}) {
  const newObj = {}
  Object.keys(obj).concat(Object.keys(obj2)).forEach(key =>
    newObj[key] = Object.prototype.hasOwnProperty.call(obj2, key) ? obj2[key] : obj[key]
  )
  return newObj
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

export function toposort(edges) {
  return topo(uniqueNodes(edges), edges)
}

function topo(nodes, edges) {
  let cursor = nodes.length
    , i = cursor

  const sorted = new Array(cursor)
      , visited = {}
      , outgoingEdges = makeOutgoingEdges(edges)
      , nodesHash = makeNodesHash(nodes)

  edges.forEach(edge => {
    if (!(edge[0] in nodesHash) || !(edge[1] in nodesHash))
      throw new Error('Unknown node. There is an unknown node in the supplied edges.')
  })

  while (i--)
    if (!visited[i]) visit(nodes[i], i, new Set())

  return sorted

  function visit(node, i, predecessors) {
    if (predecessors[node]) {
      let nodeRep

      try {
        nodeRep = ', node was:' + JSON.stringify(node)
      } catch (e) {
        nodeRep = ''
      }
      throw new Error('Cyclic dependency' + nodeRep)
    }

    if (!(node in nodesHash))
      throw new Error('Found unknown node. Make sure to provided all involved nodes. Unknown node: '+JSON.stringify(node))

    if (visited[i])
      return

    visited[i] = true

    let outgoing = outgoingEdges[node] || Object.create(null, {})
    outgoing = Object.keys(outgoing)

    if (outgoing.length) {
      i = outgoing.length
      predecessors[node] = true
      do {
        const child = outgoing[--i]
        visit(child, nodesHash[child], predecessors)
      } while (i)
      delete predecessors[node]
    }

    sorted[--cursor] = node
  }
}

function uniqueNodes(arr) {
  const res = Object.create(null, {})
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i]
    res[edge[0]] = true
    res[edge[1]] = true
  }
  return Object.keys(res)
}

function makeOutgoingEdges(arr) {
  const edges = Object.create(null, {})
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i]
    if (!(edge[0] in edges)) edges[edge[0]] = Object.create(null, {})
    if (!(edge[1] in edges)) edges[edge[1]] = Object.create(null, {})
    edges[edge[0]][edge[1]] = true
  }
  return edges
}

function makeNodesHash(arr) {
  const res = Object.create(null, {})
  for (let i = 0, len = arr.length; i < len; i++)
    res[arr[i]] = i

  return res
}

