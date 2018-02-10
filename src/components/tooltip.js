import m from 'mithril'
import b from 'bss'

const setTriangle = ({ dom }) => {
  const rect = dom.parentNode.getBoundingClientRect()
  if (rect.top < 40) {
    dom.style.bottom = 0
    dom.style.borderBottom = '5px solid white'
  } else {
    dom.style.top = 0
    dom.style.borderTop = '5px solid white'
  }
}

const position = ({ dom }) => {
  const rect = dom.parentNode.getBoundingClientRect()

  const left = Math.min(
    -dom.clientWidth / 2 + dom.parentNode.clientWidth / 2,
    -dom.clientWidth + rect.width + (window.innerWidth - rect.right - 2)
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
  dom.parentNode.classList.add(
    b.$nest(':hover .tooltip',
      b.o(1).transform('scale(1)')
    ).class
  )
  position({ dom })
}

export default ({
  zIndex = 11,
  title = ''
}) => [
  m('.tooltip'
   + b
    .position('absolute')
    .o(0)
    .c('gray')
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
]
