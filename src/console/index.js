import m from 'mithril'
import b from 'bss'

import input from './input'
import { wait } from '../utils'

import toolbarButton from '../components/toolbarbutton'
import arrowIcon from '../icons/arrow.svg'

export default (model, actions) =>
  m('.console' + b
      .bs('0 0 8px rgba(0,0,0,.2)')
      .position('relative')
      .maxHeight(30)
      .zi(30)
      .d('flex')
      .transition('max-height 0.3s')
      .fd('column')
      .background('rgb(246,246,246)')
  , {
    oncreate: ({ dom }) => model.console.dom = dom,
    style: b.maxHeight(model.state.console === true && '50%').style
  },
    m('div'
      + b.d('flex').c('#777').flexShrink(0)
    ,
      m('span'
        + b.fs(12).tt('uppercase').p('8px 10px')
      ,
        m('span' + b.mr(4), 'Console'),
        bubble('#d82c2c', model.console.errors()),
        bubble('gray', model.console.infos())
      ),
      m('div' + b.d('flex').ml('auto').p(2, 6).rel,
        toolbarButton(arrowIcon, {
          iconClass: b.transition('transform 0.3s').transform(model.state.console === true && 'rotate(180deg)'),
          title: model.state.console === true ? 'Hide console' : 'Show console',
          onclick: actions.toggleConsole
        })
      )
    ),
    model.state.console === true && m('.scroll'
      + b.overflow('auto')
    , {
      onscroll: (e) => {
        e.redraw = false
        if (model.ignoreScroll) {
          model.ignoreScroll = false
          return
        }

        model.console.manualScroll =
          e.target.scrollTop !== e.target.scrollHeight - e.target.offsetHeight
      },
      onbeforeremove: wait(300),
      oncreate: ({ dom }) => {
        dom.scrollTop = dom.scrollHeight - dom.clientHeight
      },
      onupdate: ({ state, dom }) => {
        if (model.console.manualScroll)
          return

        model.ignoreScroll = true
        dom.scrollTop = dom.scrollHeight - dom.clientHeight
      }
    },
      model.console.output.slice(-200).map(log =>
        m('.logLine' + b.d('flex')
          .ff('Source Code Pro, monospace')
          .alignItems('center')
          .p(2, 10)
          .minHeight(22)
          .fs(12)
          .borderBottom('1px solid #eee')
          .c('#555')
          .whiteSpace('pre-wrap')
          .alignItems('center')
        , {
          key: log.number,
          onclick: () => log.expand = !log.expand,
          title: log.date
        }, [
          m('div' + b.flexGrow(1)
          ,
            log.content.length > 1 && log.content[0].indexOf('%c') > -1
              ? log.content[0].split('%c').map((p, i) =>
                  m('span' + b(log.content[i] || ''), p)
                )
              : log.content.map(p => m('span' + b.d('inline-block').mr(10), p))
          ),
          log.stack && m('.stack' + b
              .ta('right')
              .flexShrink(0)
              .overflow('hidden'),
            log.stack.slice(0, !log.expand && log.type !== 'error' ? 1 : undefined).map(s =>
              m('div',
                (s.function || '') + ' at ',
                m('a' + (s.file ? b.textDecoration('underline').cursor('pointer') : ''), {
                  onclick: e => {
                    e.stopPropagation()
                    s.select && actions.select(s.select)
                  }
                }, (s.file || 0) + ':' + (s.line || 0) + ':' + (s.column || 0))
              )
            )
          )
        ])
      )
    ),
    model.state.console === true && input(model, actions)
  )

function bubble(background, count) {
  return m('span'
    + b.bc(background)
      .position('relative')
      .m(0, 4)
      .p(0, 10)
      .ta('center')
      .c('white')
      .d('inline-block')
      .br(50)
      .o(0.2)
      .transition('opacity 0.5s')
  , {
    style: b.o(count > 0 && 1).style
  },
    count
  )
}
