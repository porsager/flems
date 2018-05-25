import m from 'mithril'
import { assign } from './utils'

export default function(model, actions) {
  const tabs = Array.from(Array(9)).reduce((acc, x, i) => (
    acc[i + 1] = () => actions.selectFileByIndex(i),
    acc
  ), {})

  const combos = assign({
    b: actions.toggleAutoReload,
    Dead: actions.toggleConsole,
    '`': actions.toggleConsole
  }, tabs)

  window.addEventListener('keydown', e => {
    if ((!e.metaKey && !e.ctrlKey) || !model.dom.contains(e.target))
      return

    const combo = combos[e.key]

    if (!combo)
      return

    e.preventDefault()
    e.stopPropagation()
    combo()
    m.redraw()
  }, true)
}
