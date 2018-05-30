import m from 'mithril'
import b from 'bss'

import toolbarButton from '../components/toolbarbutton'
import shareIcon from '../icons/share.svg'
import closeIcon from '../icons/close.svg'
import refreshIcon from '../icons/refresh.svg'
import playIcon from '../icons/play.svg'
import pauseIcon from '../icons/pause.svg'

export default (model, actions) =>
  m('.toolbar'
    + b.w('100%').h(model.toolbar())
    .p(4, 6)
    .position('relative')
    .flexShrink(0)
    .justifyContent('flex-end')
    .alignItems('center')
    .d('flex')
    .c('gray')
    .zi(20)
    .background('rgb(246,246,246)')
    .boxShadow('0 1px 1px rgba(0,0,0,0.35)')
  ,
    toolbarButton(model.state.autoReload ? pauseIcon : playIcon, {
      title: (model.state.autoReload ? 'Disable' : 'Enable') + ' auto reload',
      onclick: actions.toggleAutoReload
    }),
    model.state.reloadButton && toolbarButton(model.loading
      ? closeIcon
      : refreshIcon
    , {
      onclick: e => actions.refresh({ force: true }),
      attention: model.hasChanges,
      title: 'Refresh'
    }),
    model.state.shareButton && m('a' + b.color('inherit'), {
      href: 'https://flems.io',
      target: '_blank',
      oncreate: actions.setShareUrl
    },
      toolbarButton(shareIcon, {
        title: 'Open / share on flems.io'
      })
    )
  )
