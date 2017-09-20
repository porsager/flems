import './styles.js'

import m from 'mithril'
import b from 'bss'

import editor from './editor'
import runtime from './runtime'
import console from './console'

export default (model, actions) =>
  m('.flems'
    + b
      .fontFamily('Open Sans, sans-serif')
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
      .$media('(max-width:600px)',
        b
        .flexDirection('column')
        .position('relative')
      )

    , {
      style: b.ai(!model.vertical() && 'stretch').style
    },
      m('.editor'
       + b
        .position('relative')
        .minWidth(50)
        .minHeight(50)
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
          .minHeight(50)
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
