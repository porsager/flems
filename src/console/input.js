import m from 'mithril'
import b from 'bss'
import { wait } from '../utils'

export default (model, actions) =>
  m('.input'
    + b
      .display('flex')
      .p(2, 0)
      .flexShrink(0)
      .w('100%')
      .ff('Source Code Pro, monospace')
  , {
    onbeforeremove: wait(300)
  },
    m('label'
      + b
        .display('flex')
        .ai('center')
        .m('0 6px 0 10px')
        .flexShrink(0)
        .c('blue')
    , {
      for: 'input'
    },
      '>'
    ),
    m('textarea#input'
      + b
        .p(0)
        .flexGrow(1)
        .fs(12)
        .lineHeight(model.console.lineHeight)
        .bc('transparent')
        .resize('none')
        .outline('none')
        .maxHeight(model.console.lineHeight * 5)
        .border('none')
    , {
      resize: false,
      style: b
        .minHeight(model.console.inputHeight())
        .maxHeight(model.console.inputHeight())
        .style,
      oninput: actions.onConsoleInput,
      onkeydown: actions.onConsoleKeyDown
    }, model.console.input)
  )
