import m from 'mithril'
import b from 'bss'

export default (attrs, svg) =>
  m('i' + b
    .w(attrs.size)
    .h(attrs.size)
    .display('flex')
    .jc('center')
    .ai('center')
    .$nest('svg',
      b.w('100%').h('100%')
    )
    ,
      attrs
    ,
      m.trust(svg)
  )

