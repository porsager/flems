import m from 'mithril'
import b from 'bss'

import icon from '../components/icon'
import lockIcon from '../icons/lock.svg'

export default (model, actions) =>
  m('nav.toolbar'
    + b
      .position('relative')
      .f('left')
      .display('flex')
      .c('gray')
      .w('100%')
      .minHeight(model.toolbar())
      .background('rgb(246,246,246)')
      .fontSize(14)
      .zi(20)
      .boxShadow('0 1px 1px rgba(0,0,0,0.35)')
      .$after(
        b
        .content('')
        .w(2)
        .h('100%')
        .position('absolute')
        .right(-2)
        .bc('inherit')
      )
    ,
    m('.tabs'
      + b.display('flex')
        .overflowX('auto')
        .overflowY('hidden')
        .flexGrow(1)
      ,
        model.state.fileTabs && fileTabs(model, actions)
      ,
        model.state.linkTabs && linkTabs(model, actions)
    )
  )

function linkTabs(model, actions) {
  return model.state.links.map(link =>
    tab(
      m('div' + b.display('flex'),
        m('a' + b.c('inherit'), {
          href: link.url,
          target: '_blank',
          onclick: e => link.content && e.preventDefault()
        }, link.name),
        link.patches && m('span' + b.$animate('0.3s', {
          from: b.maxWidth(0).o(0),
          to: b.maxWidth(120).o(1)
        }).fontStyle('italic').ml(2).mt(2).fs(12), {
          onbeforeremove: ({ dom }) => {
            dom.style.animation = b.$animate('0.3s', {
              from: b.maxWidth(120).o(1),
              to: b.maxWidth(0).o(0)
            }).style.animation
            return new Promise(res => setTimeout(res, 300))
          }
        }, '(modified)'),
        link.editable === false && icon({ size: 16, class: b.ml(6).class }, lockIcon)
      ),
      () => link.content && actions.select(link),
      link === model.selected(),
      model
    )
  )
}

function fileTabs(model, actions) {
  return model.state.files.map(file =>
    tab(
      m('div' + b.display('flex'),
        file.name,
        file.editable === false && icon({ size: 16, class: b.ml(6).class }, lockIcon)
      ),
      () => actions.select(file),
      file === model.selected(),
      model
    )
  )
}

function tab(title, onclick, selected, model) {
  return m('.tab' + b
    .display('flex')
    .ai('center')
    .transition('background .3s, color .3s')
    .minWidth(40)
    .maxWidth(200)
    .cursor('pointer')
    .flexShrink(2)
    .$hover(
      b
      .flexShrink(0)
      .background('#ddd')
      .c('#333')
    )
  , {
    style: selected
      ? b
      .background(model.state.color)
      .zi(1)
      .c('white')
      .flexShrink(0)
      .style
      : {},
    onclick: onclick
  },
    m('span'
      + b.flexGrow(1)
      .overflow('hidden')
      .ta('center')
      .whiteSpace('nowrap')
      .p('0 12px')
    ,
      title
    )
  )
}
