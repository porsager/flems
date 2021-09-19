import m from 'mithril'
import inspect from 'object-inspect'
import compilers from './compilers'
import { ext, findFile } from './utils'
import { sanitize, createFlemsIoLink } from './state'
import { diff, patch } from './dmp'
import SourceMap from 'source-map'

const firefox = navigator.userAgent.indexOf('Firefox') !== -1

export default function(model) {
  let resizeTimer = null
    , debounceTimer = null
    , iframeState = []

  const changed = () => actions.onchange(model.state)
      , change = fn => value => (fn(value), changed())

  model.selected.map(s => model.state.selected = s.url || s.name)

  const actions = {
    onchange      : () => { /* no-op */ },
    setMiddle     : size => model.state.middle = size,
    toggleConsole : change(hide => model.state.console = model.state.console === true ? 'collapsed' : true),
    resetSize     : change(() => actions.setMiddle(50)),
    loaded        : () => {
      model.loading = false
      if (model.console.clearOnNext) {
        model.console.output = []
        model.console.clearOnNext = false
      }
      typeof actions.onloaded === 'function' && actions.onloaded(model.state)
    },
    fileSelectionChange,
    selectFileByIndex,
    toggleAutoReload,
    onConsoleKeyDown,
    onConsoleInput,
    consoleOutput,
    startDragging,
    stopDragging,
    changeMiddle,
    setShareUrl,
    clearErrors,
    clearLogs,
    fileChange,
    initIframe,
    setState,
    resizing,
    refresh,
    getLink,
    select,
    scroll
  }

  getLinks()

  return actions

  function getLinks() {
    Promise.all(model.state.links.map(getLink)).then(() =>
      refresh({ force: true })
    )
  }

  function clearConsole() {
    model.console.output = [{ content: [m('i', 'Console was cleared')] }]
  }

  function clearErrors() {
    model.console.output = model.console.output.filter(x => x.type !== 'error')
  }

  function clearLogs() {
    model.console.output = model.console.output.filter(x => x.type === 'error')
  }

  function setState(state) {
    model.state = sanitize(state)
    select(findFile(model.state, model.state.selected), true)
    refreshFile()
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

  function scroll(pos) {
    model.state.scroll = pos
    changed()
  }

  function onConsoleInput(e) {
    model.console.input = e.target.value
  }

  function onConsoleKeyDown(e) {
    if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      model.console.output.push({ type: 'input', content: ['> ' + model.console.input], number: 'i' + model.console.inputNumber++ })
      if (model.console.input.indexOf('console.clear()') === 0)
        clearConsole()
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
    if (link.content)
      return

    return m.request(link.url, {
      responseType: 'text'
    }).then(content => {
      content = content.replace(/\r\n/g, '\n')
      if (content.length > 300000) // Too large files are slow
        return

      link.content = content

      link.patched = link.patches
        ? patch(content, link.patches)[0]
        : content

      if (model.selected() === link)
        select(link)
    }).catch(() => {
      // Ignore errors and stay with script src=url
    })
  }

  function select(file, silent) {
    if (typeof file === 'string')
      file = findFile(model.state, file)

    model.selected(file)
    !silent && changed()
  }

  function selectFileByIndex(index) {
    const file = model.state.files.concat(model.state.links)[index]
    file && select(file)
  }

  function initIframe(iframe) {
    model.iframe = iframe
    model.iframe.addEventListener('load', iframeReady)
  }

  function iframeReady() {
    model.iframe.contentWindow.postMessage({
      name: 'init',
      content: {
        id: model.id,
        state: {
          scroll: model.state.scroll,
          files: iframeState,
          links: model.state.links.map(link => ({
            type: link.type,
            name: link.name,
            url : link.url,
            content: link.patched || link.content
          }))
        }
      }
    }, '*')
  }

  function getContent(file) {
    const compile = file.compiler === 'function'
      ? file.compiler
      : compilers[file.compiler || ext(file.name)]

    if (!compile)
      return {
        name: file.name,
        type: file.type,
        content: file.content
      }

    return compile(file).then(result => {
      if (result.error)
        consoleOutput(result.error)

      if (result.map)
        file.map = result.map

      return {
        name: file.name,
        type: file.type,
        content: result.code
      }
    }).catch(err => {
      consoleOutput({
        content: ['Error compiling ' + file.compiler + ':', inspect(err)],
        type: 'error',
        stack: []
      })
      return {
        name: file.name,
        type: file.type,
        content: file.content
      }
    })
  }

  function consoleOutput(data) {
    if (model.console.clearOnNext) {
      model.console.output = []
      model.console.clearOnNext = false
    }

    data.stack.forEach(s => {
      const file = findFile(model.state, s.file)
      if (!file || !file.map)
        return

      const smc = new SourceMap.SourceMapConsumer(file.map)
      const result = smc.originalPositionFor({
        line: s.line,
        column: s.column
      })
      s.line = result.line
      s.column = result.column
    })

    if (data.content && !Array.isArray(data.content))
      data.content = [data.content]

    model.console.output.push(data)
  }

  function fileChange(file, content, selections) {
    if (file.url)
      file.patched = content
    else
      file.content = content

    if (selections)
      file.selections = selections === '0:0' ? undefined : selections

    typeof actions.onload === 'function' && actions.onload()
    refreshFile(file)
    changed()
  }

  function refreshFile(file) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (!file)
        return refresh()

      if (file.url)
        file.patches = diff(file.content, file.patched)

      if (model.state.autoReload && (file.type === 'style' || file.type === 'css')) {
        model.iframe.contentWindow.postMessage({
          name: 'css',
          content: {
            name: file.name,
            url: file.url,
            content: file.patched || file.content
          }
        }, '*')
        typeof actions.onloaded === 'function' && actions.onloaded(model.state)
        changed()
      } else {
        refresh()
      }
    }, model.state.autoReloadDelay || 400)
  }


  function fileSelectionChange(file, selections) {
    selections = selections === '0:0' ? undefined : selections
    if (selections !== file.selections) {
      file.selections = selections
      changed()
    }
  }

  function changeMiddle(e) {
    const { top, left } = model.dom.getBoundingClientRect()

    model.state.middle = Math.min(Math.max(Math.round(
      (model.vertical()
        ? (e.clientY - top + 5) / (model.dom.offsetHeight - model.console.dom.offsetHeight)
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
    model.console.clearOnNext = true

    Promise.all(model.state.files.map(getContent)).then(reloadIframe)

    m.redraw()
  }

  function reloadIframe(files) {
    if (!model.iframe) // HACK - find proper fix - safari calls reloadIframe before initIframe
      return setTimeout(reloadIframe, 10, files)

    if (firefox)
      model.iframe.src += '?'

    iframeState = files
    model.iframe.src = model.runtimeUrl
  }
}
