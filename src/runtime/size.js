import m from 'mithril'
import b from 'bss'

export default (model, actions) =>
  m('.size'
    + b.position('absolute')
      .fontFamily('Source Code Pro, monospace')
      .zi(1)
      .fontSize(14)
      .top(model.toolbar() + 8)
      .p('4px 8px')
      .right(8)
      .background('white')
      .o(0.65)
      .transition('opacity 0.3s')
      .$animate('.3s', {
        from: b.o(0),
        to: b.o(1)
      })
      .boxShadow('0 0 3px rgba(0, 0, 0, .35)')
  , {
    onbeforeremove: fadeRemove
  },
    model.iframe.clientWidth,
    ' x ',
    model.iframe.clientHeight
  )

function fadeRemove(vnode) {
  vnode.dom.style.opacity = 0
  return new Promise(r => setTimeout(r, 300))
}
