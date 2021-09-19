import m from 'mithril'
import b from 'bss'

export default model =>
  m('.loading'
    + b
    .position('absolute')
    .background('white')
    .pointerEvents('none')
    .top(model.toolbar() + 1).left(0).bottom(0).right(0)
    .display('flex')
    .jc('center')
    .ai('center')
    .transition('opacity 0.3s')
  , {
    style: b.o(model.loading ? 1 : 0).style
  },
    m('div'
      + b
      .w(120)
      .h(120)
      .borderRadius(30)
      .bc('gray')
      .o(0.25)
      .$animate('2s linear infinite', {
        from: b.transform('rotate(0deg)'),
        to: b.transform('rotate(360deg)')
      })
    )
  )
