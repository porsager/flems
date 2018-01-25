import b from 'bss'

b.setDebug(true)
b.helper({
  rel: b.position('relative'),
  abs: b.position('absolute'),
  resize: v => b({ resize: v })
})

b.css({
  '.flems input, .flems textarea': b.fontFamily('inherit'),
  '.flems': b.boxSizing('border-box'),
  '.flems *, .flems *:before, .flems *:after': b.boxSizing('inherit'),
  '.flems svg': b.fill('currentColor').va('middle'),
  '.flems svg:not(:root)': b.overflow('hidden')
})

const sheet = document.createElement('style')
sheet.textContent = codemirrorStyles // eslint-disable-line
document.head.appendChild(sheet, sheet)
