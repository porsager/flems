import m from 'mithril'
import b from 'bss'

import toolbarButton from '../components/toolbarbutton'
import closeIcon from '../icons/close.svg'
import refreshIcon from '../icons/refresh.svg'
import playIcon from '../icons/play.svg'
import pauseIcon from '../icons/pause.svg'
import shareIcon from '../icons/share.svg'

export default (model, actions) =>
  m('.toolbar'
    + b.w('100%').h(38)
    .p(4)
    .position('relative')
    .flexShrink(0)
    .justifyContent('flex-end')
    .alignItems('center')
    .d('flex')
    .c('gray')
    .background('rgb(246,246,246)')
    .boxShadow('0 1px 0 rgb(183, 183, 183)')
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
