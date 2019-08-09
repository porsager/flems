import { endsWith, findFile } from './utils'
import { sanitize } from './state'
import stream from 'mithril/stream'
import b from 'bss'

const scripts = document.getElementsByTagName('script')
    , flems = scripts[scripts.length - 1]
    , runtimeUrlGuess = endsWith('flems.html', flems ? flems.src : '') && flems.src

export default function(dom, state, runtimeUrl) {
  state = sanitize(state)

  const id = randomId()

  const model = {
    id,
    dom,
    state,
    selected      : stream(findFile(state, state.selected)),
    iOS           : 'overflowScrolling' in b,
    runtimeUrl    : runtimeUrl || runtimeUrlGuess || 'flems.html',
    console       : {
      input         : '',
      inputNumber   : 0,
      output        : [],
      history       : [],
      position      : 0,
      manualScroll  : false,
      lineHeight    : 22,
      errors        : () => model.console.output.filter(o => o.type === 'error').length,
      infos         : () => model.console.output.filter(o => o.type !== 'error').length,
      inputHeight   : () => Math.min(
        model.console.lineHeight * model.console.input.split('\n').length,
        model.console.lineHeight * 5
      )
    },
    cmHeight      : null,
    iframe        : null,
    loading       : true,
    resizing      : false,
    hideError     : true,
    dragging      : false,
    refreshCm     : stream(),
    focus         : stream(),
    vertical      : () => dom.offsetWidth * 1.25 < dom.offsetHeight,
    toolbar       : () => model.state.toolbar ? 40 : 0
  }

  return model
}

function randomId() {
  return ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3) +
         ('000' + ((Math.random() * 46656) | 0).toString(36)).slice(-3)
}
