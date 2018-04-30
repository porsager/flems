import './styles.js'

import m from 'mithril'
import b from 'bss'

import editor from './editor'
import runtime from './runtime'
import console from './console'

export default (model, actions) =>
  m('.flems'
    + b
      .fontFamily('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"')
      .overflow('hidden')
      .position('relative')
      .d('flex')
      .fd('column')
  , {
    style: b
      .h(!model.state.autoHeight && '100%')
      .userSelect(model.dragging && 'none')
      .style
  },
    m('main'
     + b
      .flexGrow(1)
      .d('flex')
      .flexDirection(model.vertical() && 'column')
      .position(model.vertical() && 'relative')
    , {
      style: b.ai(!model.vertical() && 'stretch').style
    },
      m('.editor'
       + b
        .position('relative')
        .minWidth(50)
        .minHeight(model.toolbar())
        .background(model.state.color)
        .zIndex(1)
        .flexGrow(1)
      , {
        style: b
          .position(model.vertical() && 'absolute')
          .width(model.vertical() && '100%')
          .height(model.vertical() && (model.state.middle + '%'))
          .maxWidth(!model.vertical() && (model.state.middle + '%'))
          .style
      },
        editor(model, actions)
      ),
      m('.runtime'
        + b.position('relative')
          .minWidth(50)
          .minHeight(model.toolbar())
          .b(0)
          .r(0)
          .d('flex')
          .fd('column')
          .flexGrow(1)
      , {
        style: b
          .position(model.vertical() && 'absolute')
          .width(model.vertical() && '100%')
          .height(model.vertical() && ((100 - model.state.middle) + '%'))
          .maxWidth(!model.vertical() && ((100 - model.state.middle) + '%'))
          .style
      },
        runtime(model, actions)
      )
    ),
    model.state.console && console(model, actions)
  )
