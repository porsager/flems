import b from 'bss'
import m from 'mithril'

const iframe = (model, actions) =>
  m('iframe'
    + b
      .flexGrow(1)
      .userSelect('none')
      .minHeight(50)
      .width('100%')
      .h(0)
  , {
    name: model.id,
    title: 'Runtime iframe',
    style: b.pointerEvents(model.dragging && 'none').style,
    sandbox: 'allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-presentation',
    allow: 'geolocation; microphone; camera; midi; encrypted-media',
    allowfullscreen: true,
    frameborder: '0',
    oncreate: vnode => actions.initIframe(vnode.dom)
  })

const iframeInScroller = (model, actions) =>
  m('.iframeScroller'
    + b
    .overflowScrolling('touch')
    .flexGrow(1)
    .overflowY('scroll')
    .d('flex')
    .fd('column')
    .w('100%')
  ,
    iframe(model, actions)
  )

export default (model, actions) =>
  model.iOS
    ? iframeInScroller(model, actions)
    : iframe(model, actions)
