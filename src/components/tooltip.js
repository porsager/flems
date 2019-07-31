import m from 'mithril'
import b from 'bss'

function closest(el, s) {
  const match = el.querySelector(s)
  return match || (el.parentElement ? closest(el.parentElement, s) : null)
}

const getBounds = (dom) => {
  const container = closest(dom, '.flems') || document.body
  const outer = container.parentElement.getBoundingClientRect()
      , inner = dom.parentElement.getBoundingClientRect()

  return {
    top: inner.top - outer.top,
    bottom: inner.bottom - outer.bottom,
    right: inner.right - outer.right,
    width: inner.width
  }
}

const setTriangle = ({ dom }) => {
  const rect = getBounds(dom)
  if (rect.top < 40) {
    dom.style.bottom = 0
    dom.style.borderBottom = '5px solid white'
  } else {
    dom.style.top = 0
    dom.style.borderTop = '5px solid white'
  }
}

const position = ({ dom }) => {
  const rect = getBounds(dom)

  const left = Math.min(
    -dom.clientWidth / 2 + dom.parentElement.clientWidth / 2,
    -dom.clientWidth + rect.width + ( -rect.right - 4)
  )

  dom.style.left = left + 'px'

  if (rect.top < 40) {
    dom.style.transformOrigin = Math.abs(left) + rect.width / 2 + 'px 0px'
    dom.style.bottom = '-26px'
  } else {
    dom.style.transformOrigin = Math.abs(left) + rect.width / 2 + 'px 26px'
    dom.style.top = '-26px'
  }
}

const oncreate = ({ dom }) => {
  dom.parentElement.classList.add(
    b.$nest(':hover .tooltip',
      b.o(1).transform('scale(1)')
    ).class
  )
  position({ dom })
}

export default ({
  zIndex = 11,
  title = ''
}) => m('.tooltip'
   + b
    .position('absolute')
    .o(0)
    .c('gray')
    .zi(zIndex)
    .transform('scale(0)')
    .w('auto')
    .h(26)
    .fontSize(12)
    .br(2)
    .p('5px 8px')
    .bc('white')
    .bs('0 2px 8px rgba(0,0,0,0.35)')
    .transition('opacity 0.3s, transform 0.3s')
    .pointerEvents('none')
    .textTransform('uppercase')
    .textAlign('right')
    .whiteSpace('nowrap')
  ,
    {
      key: 'tooltip',
      oncreate
    }
  ,
    title,
    m('.tooltip_triangle'
     + b
      .pointerEvents('none')
      .o(0)
      .zi(zIndex + 1)
      .transform('scale(0)')
      .position('absolute')
      .transformOrigin('bottom center')
      .transition('opacity 0.3s, transform 0.3s')
      .l('calc(50% - 5px)')
      .w(0)
      .h(0)
      .borderLeft('5px solid transparent')
      .borderRight('5px solid transparent')
      .textAlign('right')
    , {
      oncreate: setTriangle
    })
  )
