import m from 'mithril'
import b from 'bss'

export default (model, actions) =>
  m('.handle'
   + b
    .position('absolute')
    .zi(40)
  ,
    {
      style: model.vertical()
        ? b.height(6).bottom(0).left(0).cursor('row-resize').w('100%').style
        : b.top(0).width('6px').right(0).cursor('col-resize').h('100%').style,
      onmousedown: (down) => {
        actions.startDragging(true)
        window.addEventListener('mouseup', function mouseUp(up) {
          if (down.pageX === up.pageX && down.pageY === up.pageY)
            actions.setMiddle(0)

          window.removeEventListener('mousemove', actions.changeMiddle, false)
          window.removeEventListener('mouseup', mouseUp, false)
          actions.stopDragging(false)
          m.redraw()
        }, false)
        window.addEventListener('mousemove', actions.changeMiddle, false)
      }
    }
  )
