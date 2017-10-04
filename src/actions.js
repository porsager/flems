import m from 'mithril'
import compilers from './compilers'
import { isCss, ext, assign, createFlemsIoLink } from './utils'
import { diff, patch } from './dmp'
import SourceMap from 'source-map'

const firefox = navigator.userAgent.indexOf('Firefox') !== -1

export default function(model) {
  let resizeTimer = null
    , debounceTimer = null

  const actions = {
    onchange      : () => { /* no-op */ },
    setMiddle     : size => model.state.middle = size,
    toggleConsole : change(hide => model.state.console = model.state.console === true ? 'collapsed' : true),
    resetSize     : change(() => actions.setMiddle(50)),
    loaded        : () => model.loading = false,
    toggleAutoReload,
    onConsoleKeyDown,
    onConsoleInput,
    consoleOutput,
    startDragging,
    stopDragging,
    changeMiddle,
    setShareUrl,
    fileChange,
    initIframe,
    setState,
    resizing,
    refresh,
    getLink,
    select
  }

  getLinks()

  return actions

  function getLinks() {
    Promise.all(model.state.links.map(getLink)).then(() =>
      refresh({ force: true })
    )
  }

  function change(fn) {
    return function(value) {
      fn(value)
      changed()
    }
  }

  function changed() {
    actions.onchange(model.state)
  }

  function setState(state) {
    assign(model.state, state)

    model.linkContent = model.state.links.reduce((acc, link) => {
      acc[link.url] = model.linkContent[link.url]
      return acc
    }, {})

    model.linkPatched = model.state.links.reduce((acc, link) => {
      acc[link.url] = model.linkPatched[link.url]
      return acc
    }, {})

    getLinks()

    if (model.selected() !== state.selected)
      model.selected(state.selected)

    refresh()
    m.redraw()
  }

  function setShareUrl({ dom }) {
    dom.addEventListener('mousedown', e => {
      dom.href = createFlemsIoLink(model.state)
    }, true)

  }

  function startDragging() {
    model.dragging = true
  }

  function stopDragging() {
    model.dragging = false
    model.refreshCm(true)
    changed()
  }

  function toggleAutoReload() {
    model.state.autoReload = !model.state.autoReload
    changed()
    if (model.state.autoReload)
      refresh()
  }

  function onConsoleInput(e) {
    model.console.input = e.target.value
  }

  function onConsoleKeyDown(e) {
    if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      evaluate()
      return false
    } else if ((e.key === 'ArrowUp' || e.keyCode === 38) && (model.console.historyNavigated || e.target.selectionStart === 0)) {
      e.preventDefault()
      consoleHistoryBack()
    } else if ((e.key === 'ArrowDown' || e.keyCode === 40) && (model.console.historyNavigated || model.console.input === '')) {
      e.preventDefault()
      consoleHistoryForward()
    } else {
      model.console.historyNavigated = false
    }
  }

  function evaluate(e) {
    if (!model.console.input)
      return

    model.iframe.contentWindow.postMessage({
      name: 'eval',
      content: model.console.input
    }, '*')
    model.console.position = model.console.history.push(model.console.input)
    model.console.input = ''
  }

  function consoleHistoryBack() {
    model.console.historyNavigated = true

    if (model.console.position >= 0)
      model.console.position -= 1

    model.console.input = model.console.history[model.console.position] || ''
  }

  function consoleHistoryForward() {
    model.console.historyNavigated = true

    if (model.console.position < model.console.history.length)
      model.console.position += 1

    model.console.input = model.console.history[model.console.position] || ''
  }

  function getLink(link) {
    if (model.linkContent[link.url])
      return

    model.linkContent[link.url] = undefined

    return m.request(link.url, {
      deserialize: v => v
    }).then(content => {
      content = content.replace(/\r\n/g, '\n')
      if (content.length > 200000) // Too large files are slow
        return

      model.linkContent[link.url] = content
      model.linkPatched[link.url] = link.patches
        ? patch(content, link.patches)[0]
        : content

      if (model.state.selected === link.url)
        select(link.url)
    }).catch(() => {
      // Ignore errors and stay with script src=url
    })
  }

  function select(name, file) {
    model.selected(name)
    file && model.focus(file)
    changed()
  }

  function initIframe(iframe) {
    model.iframe = iframe
    model.iframe.addEventListener('load', iframeReady)
  }

  function iframeReady() {
    Promise.all(model.state.files.filter(f => f.content).map(getContent))
    .then(files => {
      model.iframe.contentWindow.postMessage({
        name: 'init',
        content: {
          id: model.id,
          state: {
            files: files,
            links: model.state.links.map(link => ({
              type: link.type || (isCss(link.name) ? 'css' : 'js'),
              name: link.name,
              url : link.url,
              content: model.linkPatched[link.url]
            }))
          }
        }
      }, '*')
    })
  }

  function getContent(file) {
    const compile = typeof file.compiler === 'function'
      ? file.compiler
      : compilers[file.compiler || ext(file.name)]

    if (!compile)
      return file

    return compile(file).then(result => {
      model.sourceMaps[file.name] = result.map
      return {
        name: file.name,
        content: result.code
      }
    }).catch(err => {
      consoleOutput({
        content: String(err),
        stack: []
      })
      return file
    })
  }

  function consoleOutput(data) {
    const file = model.findFile(model.state, data.file)

    if (file && data.type === 'error' && data.content.indexOf('<') > -1 && !window.Babel) {
      file.compiler = 'babel'
      refresh()
      return
    }

    data.stack.forEach(s => {
      const file = model.findFile(model.state, s.file)
      if (!file || !(file.name in model.sourceMaps))
        return

      const smc = new SourceMap.SourceMapConsumer(model.sourceMaps[file.name])
      const result = smc.originalPositionFor({
        line: s.line,
        column: s.column
      })
      s.line = result.line
      s.column = result.column
    })

    model.console.output.push(data)
  }

  function fileChange(file, content) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (file.url)
        model.linkPatched[file.url] = content
      else
        file.content = content

      if (file.url)
        file.patches = diff(model.linkContent[file.url], model.linkPatched[file.url])

      changed()

      if (model.state.autoReload && (file.type === 'css' || isCss(file.name))) {
        model.iframe.contentWindow.postMessage({
          name: 'css',
          content: {
            name: file.name,
            url: file.url,
            content: model.linkPatched[file.url] || file.content
          }
        }, '*')
      } else {
        refresh()
      }
      m.redraw()
    }, 400)
  }

  function changeMiddle(e) {
    const { top, left } = model.dom.getBoundingClientRect()

    model.state.middle = Math.min(Math.max(Math.round(
      (model.vertical()
        ? (e.clientY - top + 5) / (model.dom.offsetHeight)
        : (e.clientX - left + 5) / (model.dom.offsetWidth)
      ) * 10000
    ) / 100, 0), 100)

    m.redraw()
  }

  function resizing() {
    if (model.iOS)
      return

    model.resizing = true
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      model.resizing = false
      m.redraw()
    }, 1000)
  }

  function refresh(options = {}) {
    if (!options.force && !model.state.autoReload)
      return model.hasChanges = true

    model.hasChanges = false
    model.loading = true
    model.console.output = []

    reloadIframe()

    m.redraw()
  }

  function reloadIframe() {
    if (firefox)
      model.iframe.src += '?'

    model.iframe.src = model.runtimeUrl
  }
}
