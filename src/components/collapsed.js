import m from 'mithril'
import b from 'bss'

import icon from './icon'

export default (iconName, onclick) =>
  m('div' + b
    .position('absolute')
    .w('100%')
    .h('100%')
    .zi(50)
    .t(0)
    .cursor('pointer')
    .background('rgb(255,255,255)')
    .transition('opacity 0.5s')
    .$animate('0.5s', {
      from: b.o(0),
      to: b.o(1)
    })
    .boxShadow('0 0 10px rgba(0,0,0,.35)')
    .display('flex')
    .jc('center')
    .ai('center')
    ,
      {
        onbeforeremove: (vnode) => {
          vnode.dom.style.opacity = 0
          return new Promise(r => setTimeout(r, 500))
        },
        onclick: onclick
      }
    ,
      icon({ class: b.h(28).w(28).class }, iconName)
  )
