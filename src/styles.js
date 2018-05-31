import b from 'bss'

b.setDebug(true)
b.helper({
  rel: b.position('relative'),
  abs: b.position('absolute'),
  resize: v => b({ resize: v })
})

b.css({
  '.flems input, .flems textarea': b.fontFamily('inherit').m(0).p(0),
  '.flems': b.boxSizing('border-box').lh(18).fs(16),
  '.flems *, .flems *:before, .flems *:after': b.boxSizing('inherit').fw('normal'),
  '.flems svg': b.fill('currentColor').va('middle'),
  '.flems svg:not(:root)': b.overflow('hidden'),
  '.flems a, .flems a:link, .flems a:visited': b.c('inherit').td('none').border('none')
})

const sheet = document.createElement('style')
sheet.textContent = codemirrorStyles // eslint-disable-line
document.head.appendChild(sheet, sheet)
