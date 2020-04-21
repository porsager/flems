import m from 'mithril'
import b from 'bss'
import { endsWith, ext } from '../utils'

import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/coffeescript/coffeescript'
import 'codemirror/mode/css/css'
import 'codemirror/mode/htmlmixed/htmlmixed'
import 'codemirror/keymap/sublime'
import 'codemirror/addon/comment/comment'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/closetag'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import 'codemirror/addon/dialog/dialog.js'
import 'codemirror/addon/search/search.js'
import 'codemirror/addon/search/searchcursor.js'
import 'codemirror/addon/fold/foldcode.js'
import 'codemirror/addon/fold/foldgutter.js'
import 'codemirror/addon/fold/brace-fold.js'
import 'codemirror/addon/fold/xml-fold.js'
import 'codemirror/addon/fold/comment-fold.js'

import logoIcon from '../icons/logo.svg'

const logoIcon64 = btoa(logoIcon)

const modes = {
  document: {
    name: 'htmlmixed',
    lineWrapping: true
  },
  script: {
    name: 'javascript',
    statementIndent: 2
  },
  ts: {
    name: 'text/typescript',
    statementIndent: 2
  },
  coffee: {
    name: 'text/coffeescript',
    statementIndent: 2
  },
  style: 'css'
}

// Legacy support
modes.js = modes.script
modes.html = modes.document

export default (model, actions) =>
  m('div'
  + b.position('absolute')
    .w('100%')
    .top(model.toolbar())
    .left(0)
    .bottom(0)
    .right(0)
    .overflow('hidden')
    .$after(
      b
      .content('')
      .position('absolute')
      .top('-7vh')
      .width('100%')
      .height('100vh')
      .zIndex(3)
      .opacity(0.1)
      .pointerEvents('none')
      .backgroundImage('url(data:image/svg+xml;base64,' + logoIcon64 + ')')
      .backgroundSize('120% auto')
      .backgroundRepeat('no-repeat')
      .backgroundPosition('center center')
    )
    .$nest('.CodeMirror',
      b.fontFamily('Source Code Pro, monospace')
      .lineHeight('22px')
      .cursor('text')
      .w('100%').h('100%')
      .fontSize(14)
    )
    .$nest('.cm-s-material.CodeMirror, .cm-s-material div.CodeMirror-gutters',
      b.backgroundColor(model.state.color)
    )
    .$nest('.CodeMirror-activeline',
      b.background('rgba(255,255,255,0.07)')
    )
  , {
    oncreate: ({ dom }) => {
      const blockStart = /[{([]$/
          , onlyBlocks = /[^{}[\]()]/g

      const cm = CodeMirror(dom, {
        theme: model.state.theme || 'material',
        readOnly: !model.state.editable,
        autoCloseBrackets: true,
        autoCloseTags: true,
        matchBrackets: true,
        styleActiveLine: true,
        lineNumbers: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        tabSize: 2,
        viewportMargin: model.state.autoHeight ? Infinity : 10,
        keyMap: 'sublime',
        extraKeys: {
          'Alt-F': 'findPersistent',
          'Shift-Tab': 'indentLess',
          'Cmd-L': false,
          'Cmd-M': false,
          'Ctrl-L': false,
          Enter: cm => {
            const cursor = cm.getCursor()
                , line = cm.getRange({ line: cursor.line, ch: 0 }, cursor).trim()
                , block = blockStart.test(line)
                , blockClosed = !block && blockStart.test(line.replace(onlyBlocks, ''))
                , fat = endsWith('=>', line)
                , comma = endsWith(',', line)

            cm.setOption('smartIndent', blockClosed && !comma)
            cm.execCommand('newlineAndIndent')
            cm.setOption('smartIndent', true)

            if (fat || block)
              cm.execCommand('insertSoftTab')
          },
          Tab: cm => {
            if (cm.somethingSelected())
              cm.indentSelection('add')
            else
              cm.execCommand('insertSoftTab')
          },
          Backspace: cm => {
            const cursor = cm.getCursor()
                , before = cm.getRange({ line: cursor.line, ch: 0 }, cursor)

            if (before.length % 2 === 0 && endsWith('  ', before))
              CodeMirror.commands.delCharBefore(cm)

            CodeMirror.commands.delCharBefore(cm)
          }
        }
      })

      cm.on('gutterClick', selectLineNumber)
      cm.on('scrollCursorIntoView', (cm, e) => {
        e.codemirrorIgnore = true
      })

      const initialDoc = cm.getDoc()

      model.refreshCm.map(() => cm.refresh())
      model.focus.map(({ line = 0, column = 0, scrollTo = false } = {}) => {
        cm.setCursor(line - 1, column - 1)
        cm.focus()
        scrollTo && requestAnimationFrame(() =>
          cm.scrollIntoView({
            line: line,
            ch: column
          }, 100)
        )
      })

      model.selected.map(file => {
        if (!file)
          return

        const content = file.patched || file.content || ''
            , mode = modes[ext(file.name)] || modes[file.type] || 'javascript'

        const editable = model.state.editable && file.editable !== false

        cm.setOption('lineWrapping', mode.lineWrapping || false)

        cm.setOption('readOnly', !editable)

        if (!file.doc) {
          file.doc = CodeMirror.Doc(content, mode)
          file.doc.ignoreCursor = true

          file.doc.on('change', (cm, change) => {
            if (change.origin === 'setValue')
              return

            file.doc.ignoreCursor = true
            Promise.resolve().then(() => file.doc.ignoreCursor = false)

            actions.fileChange(file, file.doc.getValue(), serializeSelections(file.doc.listSelections()))
          })

          file.doc.on('cursorActivity', (a, b) => {
            if (!file.doc.ignoreCursor)
              actions.fileSelectionChange(file, serializeSelections(file.doc.listSelections()))
          })
        }

        file.doc.ignoreCursor = true
        Promise.resolve().then(() => file.doc.ignoreCursor = false)

        if (content !== file.doc.getValue())
          file.doc.setValue(content)

        const focusAfter = cm.getDoc() !== initialDoc || model.state.autoFocus

        if (cm.getDoc() !== file.doc)
          cm.swapDoc(file.doc)

        const selections = deserializeSelections(file.selections)
        if (selections && selections.length) {
          file.doc.setSelections(selections)
          requestAnimationFrame(() => {
            cm.scrollIntoView(selections[0].head, 500)
          })
        }

        if (focusAfter)
          cm.focus()

        if (!model.cmHeight && model.state.autoHeight) {
          requestAnimationFrame(() =>
            model.cmHeight = dom.querySelector('.CodeMirror-sizer').offsetHeight * (model.vertical() ? 2 : 1) + (model.toolbar() * (model.vertical() ? 4 : 3))
          )
        }
      })

    }
  })

function selectLineNumber(cm, line, gutter, e) {
  if (gutter === 'CodeMirror-foldgutter')
    return

  const selections = cm.listSelections()
      , others = e.ctrlKey || e.metaKey ? selections : []
      , from = e.shiftKey && selections.length
        ? selections[0].anchor.line
        : line

  let to = e.shiftKey && selections.length && from > line
    ? line
    : line + 1

  update()

  const move = function(e) {
    const curLine = cm.lineAtHeight(e.clientY, 'client')
    if (curLine !== to) {
      to = curLine
      update()
    }
  }

  const up = (e) => {
    window.removeEventListener('mouseup', up)
    window.removeEventListener('mousemove', move)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)

  function update() {
    cm.setSelections(
      others.concat([{
        anchor: CodeMirror.Pos(from, to > from ? 0 : null),
        head: CodeMirror.Pos(to, 0)
      }]),
      others.length,
      { origin: '*mouse' }
    )
  }
}

function deserializeSelections(selections = '') {
  return selections.split(',').map(s => (
    s = s.split('-').map(c =>
      (c = c.split(':'), { line: parseInt(c[0]) || 0, ch: parseInt(c[1]) || 0 })
    ),
    {
      anchor: s[0],
      head: s[1] || s[0]
    })
  )
}

function serializeSelections(selections) {
  return selections.map(s =>
    s.anchor.line + ':' + s.anchor.ch +
    (
      s.head && (s.anchor.line !== s.head.line || s.anchor.ch !== s.head.ch)
        ? '-' + s.head.line + ':' + s.head.ch
        : ''
    )
  ).join(',')
}
