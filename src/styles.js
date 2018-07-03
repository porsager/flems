import b from 'bss'

b.setDebug(true)
b.helper('resize', v => b({ resize: v }))

const sheet = document.createElement('style')
sheet.textContent = codemirrorStyles // eslint-disable-line
document.head.appendChild(sheet, sheet)
