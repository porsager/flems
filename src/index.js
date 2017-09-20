import './styles.js'
import m from 'mithril'

import app from './app'

import { assign } from './utils'
import Model, { defaults } from './model'
import Actions from './actions'
import message from './message'

let resizeRegistrered = false
window.m = m // wright hmr
function Flems(dom, state = {}, runtimeUrl) {
  const model = Model(dom, state, runtimeUrl)
      , actions = Actions(model)

  if (!resizeRegistrered) {
    window.addEventListener('resize', () => m.redraw())
    resizeRegistrered = true
  }

  message.listen(model, actions)

  m.mount(dom, {
    view: () => app(model, actions)
  })

  return {
    focus: model.focus,
    reload: () => actions.refresh({ force: true }),
    onchange: fn => actions.onchange = fn,
    set: state => {
      assign(model.state, state)
      model.selected(state.selected)
      actions.refresh()
      m.redraw()
    }
  }
}

Flems.defaults = defaults

export default Flems

