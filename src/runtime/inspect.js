import m from 'mithril'
import b from 'bss'

export default (model, actions) =>
  m('div' + b`
    position absolute
    pointer-events none
    transition opacity 0.3s
    transform-origin ${ model.inspectRect.left + model.inspectRect.width / 2 }px ${ model.inspectRect.top + model.inspectRect.height / 2 }px
    l 0
    b 0
    r 0
    t ${ model.toolbar() + 1 }
  `.$animate('0.3s', {
    from: b`
      o 0
      transform scale(2)
    `
  }), {
    onbeforeremove: ({ dom }) => new Promise(res => (
      dom.style.opacity = 0,
      setTimeout(res, 300)
    ))
  },
    m('span' + b`
      ff monospace
      fs 10
      zi 1
      p 2 4
      bc white
      position absolute
      white-space nowrap
      br 3
      bs 0 0 3px rgba(0,0,0,.5)
      t ${ model.inspectRect.bottom + 8}
      l ${ model.inspectRect.left }
    `,
      Math.round(model.inspectRect.left) + ',' + Math.round(model.inspectRect.top) + ' <' + model.inspectRect.tag + '> ' + Math.round(model.inspectRect.width) + 'x' + Math.round(model.inspectRect.height)
    ),
    m('svg' + b`
      position absolute
      top 0
      left 0
    `, {
      width: '100%',
      height: '100%'
    },
      m('defs',
        m('mask#hole',
          m('rect', {
            width: 10000,
            height: 10000,
            fill: 'white'
          }),
          m('rect' + b`
            transition all 0.3s
          `, {
            fill: 'black',
            rx: 4,
            ry: 4,
            width: model.inspectRect.width + 8,
            height: model.inspectRect.height + 8,
            x: model.inspectRect.left - 4,
            y: model.inspectRect.top - 5
          })
        )
      ),
      m('rect', {
        fill: 'rgba(0, 0, 0, 0.25)',
        width: '100%',
        height: '100%',
        mask: 'url(#hole)'
      })
    )
  )
