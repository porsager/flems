import m from 'mithril'
import b from 'bss'

import icon from './icon'
import tooltip from './tooltip'

export default (iconName, attrs = {}) =>
  m('.icon'
    + b
    .position('relative')
    .cursor('pointer')
  , {
    style: attrs.attention ? b.$animate('1s linear infinite', {
      '0%': b.transform('scale(1)').o(1),
      '50%': b.transform('scale(1.2)').o(0.5),
      '100%': b.transform('scale(1)').o(1)
    }).style : {}
  },
    icon({
      key: iconName,
      style: b.o(attrs.disabled && 0.65).style,
      onclick: attrs.onclick,
      size: 26,
      class: b.p(5)
        .borderRadius(3)
        .position('relative')
        .$hover(
          b.background('#ddd').color('gray')
        ).class
    }, iconName)
  ,
    Boolean(attrs.badge) && m('.badge'
      + b.position('absolute')
        .background('red')
        .borderRadius(7)
        .pointerEvents('none')
        .p('0 3px')
        .minWidth(14).h(14).top(0).right(0)
        .c('white').fontStyle('normal').fontSize(10).textAlign('center')
      ,
        attrs.badge
    )
  ,
    tooltip({ title: attrs.title })
  )
