import m from 'mithril'
import b from 'bss'

export default (model, actions) =>
  m('.input'
    + b
      .d('flex')
      .p(2, 0)
      .flexShrink(1)
      .w('100%')
      .ff('Source Code Pro, monospace')
  ,
    m('label'
      + b
        .d('block')
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
