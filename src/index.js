import './styles.js'
import m from 'mithril'

import app from './app'

import Model from './model'
import { defaults, createFlemsIoLink } from './state'
import Actions from './actions'
import message from './message'
import hotkeys from './hotkeys'

let resizeRegistrered = false
window.m = m // wright hmr
function Flems(dom, state = {}, runtimeUrl) {
  const model = Model(dom, state, runtimeUrl)
      , actions = Actions(model)

  if (!resizeRegistrered) {
    window.addEventListener('resize', redraw)
    resizeRegistrered = true
  }

  message.listen(model, actions)

  // Disable hotkeys until proper combos can be decided upon
  // hotkeys(model, actions)

  m.mount(dom, null)
  m.mount(dom, {
    view: () => app(model, actions)
  })

  return {
    focus: model.focus,
    reload: () => actions.refresh({ force: true }),
    onchange: fn => actions.onchange = fn,
    onload: fn => actions.onload = fn,
    onloaded: fn => actions.onloaded = fn,
    getLink: actions.getLink,
    set: actions.setState,
    redraw: redraw
  }

  function redraw() {
    m.redraw()
    model.refreshCm(true)
  }
}

Flems.defaults = defaults
Flems.createFlemsIoLink = createFlemsIoLink
Flems.version = process.env.FLEMS_VERSION // eslint-disable-line

export default Flems

