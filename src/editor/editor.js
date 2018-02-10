import m from 'mithril'
import b from 'bss'
import { endsWith } from '../utils'

import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript'
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
  html: {
    name: 'htmlmixed',
    lineWrapping: true
  },
  js: {
    name: 'javascript',
    statementIndent: 2
  },
  ts: {
    name: 'text/typescript',
    statementIndent: 2
  },
  css: 'css'
}

const noSmartIndent = {
  ',': true,
  '.': true
}

export default (model, actions) =>
  m('.editor'
  + b.position('absolute')
    .w('100%')
    .top(model.toolbar()).left(0).bottom(0).right(0)
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
      const docs = {}
          , blockStart = /[\{\(\[]$/
          , onlyBlocks = /[^\{\}\[\]\(\)]/g

      const cm = CodeMirror(dom, {
        theme: 'material',
        readOnly: !model.state.editable,
        autoCloseBrackets: true,
        autoCloseTags: true,
        matchBrackets: true,
        styleActiveLine: true,
        lineNumbers: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        tabSize: 2,
        keyMap: 'sublime',
        extraKeys: {
          'Alt-F': 'findPersistent',
          'Shift-Tab': 'indentLess',
          'Cmd-L': false,
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

            if (fat || block)
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

      const initialDoc = cm.getDoc()

      model.refreshCm.map(() => cm.refresh())
      model.focus.map(({ line, column }) => {
        cm.setCursor(line - 1, column - 1)
        cm.focus()
      })

      model.selectedFile
      .map(file => {
        if (!file)
          return

        let doc = docs[file.url || file.name]

        const content = file.content || model.linkPatched[file.url] || ''
            , mode = modes[file.name.split('.').pop()] || 'javascript'

        const editable = model.state.editable && file.editable !== false

        cm.setOption('lineWrapping', mode.lineWrapping || false)

        cm.setOption('readOnly', !editable)

        if (!doc) {
          doc = CodeMirror.Doc(content, mode)

          doc.on('change', e =>
            actions.fileChange(file, doc.getValue())
          )

          docs[file.url || file.name] = doc
        }

        if (content !== doc.getValue())
          doc.setValue(content)

        const focusAfter = cm.getDoc() !== initialDoc || model.state.autoFocus

        cm.swapDoc(doc)

        if (focusAfter)
          cm.focus()
      })

      if (model.state.autoHeight)
        model.cmHeight = dom.querySelector('.CodeMirror-sizer').offsetHeight
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
