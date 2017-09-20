import m from 'mithril'
import b from 'bss'

function closest(el, className) {
  while (!el.classList.contains(className))
    el = el.parentElement

  return el
}

const setTriangle = ({ dom }) => {
  const container = closest(dom, 'flems').getBoundingClientRect()
      , parent = dom.parentNode.getBoundingClientRect()

  if (parent.top - container.top < 40) {
    dom.style.bottom = 0
    dom.style.borderBottom = '5px solid white'
  } else {
    dom.style.top = 0
    dom.style.borderTop = '5px solid white'
  }
}

const position = dom => {
  const container = closest(dom, 'flems').getBoundingClientRect()
      , parent = dom.parentNode.getBoundingClientRect()

  const left = Math.min(
    -dom.clientWidth / 2 + dom.parentNode.clientWidth / 2,
    -dom.clientWidth + parent.width + (container.width - (parent.right - container.left) - 2)
  )
  dom.style.left = left + 'px'

  if (parent.top - container.top < 40) {
    dom.style.transformOrigin = Math.abs(left) + parent.width / 2 + 'px 0px'
    dom.style.bottom = '-26px'
  } else {
    dom.style.transformOrigin = Math.abs(left) + parent.width / 2 + 'px 26px'
    dom.style.top = '-26px'
  }
}

const oncreate = ({ dom }) => {
  dom.parentNode.classList.add(
    b.$nest(':hover .tooltip',
      b.o(1).transform('scale(1)')
    ).class
  )
  position(dom)
}

export default title => [
  m('.tooltip'
   + b
    .position('absolute')
    .o(0)
    .transform('scale(0)')
    .zi(1)
    .w('auto')
    .h(26)
    .fs(12)
    .br(2)
    .p('4px 8px')
    .bc('white')
    .c('#555')
    .bs('0 2px 8px rgba(0,0,0,0.35)')
    .transition('all 0.3s')
    .pointerEvents('none')
    .textTransform('uppercase')
    .textAlign('right')
    .whiteSpace('nowrap')
  ,
    {
      oncreate
    }
  ,
    title
  )
,
  m('.tooltip'
   + b
    .pointerEvents('none')
    .o(0)
    .zi(1)
    .transform('scale(0)')
    .position('absolute')
    .transformOrigin('bottom center')
    .transition('all 0.3s')
    .l('calc(50% - 5px)')
    .w(0)
    .h(0)
    .borderLeft('5px solid transparent')
    .borderRight('5px solid transparent')
    .textAlign('right')
  , {
    oncreate: setTriangle
  })
]
