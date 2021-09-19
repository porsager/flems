import m from 'mithril'
import b from 'bss'

import input from './input'
import icon from '../components/icon'
import { wait } from '../utils'

import toolbarButton from '../components/toolbarbutton'
import arrowIcon from '../icons/arrow.svg'
import closeIcon from '../icons/close.svg'

export default (model, actions) =>
  m('.console' + b
      .bs('0 0 8px rgba(0,0,0,.2)')
      .position('relative')
      .maxHeight(34)
      .zi(30)
      .display('flex')
      .transition('max-height 0.3s')
      .fd('column')
      .background('rgb(246,246,246)')
  , {
    oncreate: ({ dom }) => model.console.dom = dom,
    style: b.maxHeight(model.state.console === true && '50%').style
  },
    m('div'
      + b.display('flex').jc('space-between').c('#777').flexShrink(0)
    , {
      onclick: actions.toggleConsole
    },
      m('div'
        + b.display('flex').fs(12).tt('uppercase').p('8px 10px')
      ,
        m('span' + b.mr(4), 'Console'),
        bubble('#d82c2c', actions.clearErrors, model.console.errors()),
        bubble('gray', actions.clearLogs, model.console.infos())
      ),
      m('div' + b.display('flex').p(2, 6),
        toolbarButton(arrowIcon, {
          iconClass: b.transition('transform 0.3s').transform(model.state.console === true && 'rotate(180deg)'),
          title: model.state.console === true ? 'Hide console' : 'Show console'
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
        m('.logLine' + b.display('flex')
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
          m('div' + b.flexGrow(1).$nest('>span', b.mr(10)),
            log.content.length > 1
              && log.content[0].indexOf('%c') > -1
              && m('span',
                log.content[0].split('%c').filter(x => x).map((p, i) =>
                  m('span' + b(log.content[i + 1] || ''), p)
                )
              ),

            log.content.slice(
              log.content.length > 1 && log.content[0].indexOf('%c') > -1
                ? log.content[0].match(/%c/g).length + 1
                : 0
            ).map((p, i) =>
              m('span', p)
            )
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
                    model.focus({ line: s.line, column: s.column, scrollTo: true })
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

function bubble(background, onclick, count) {
  return m('span'
    + b.bc(background)
      .position('relative')
      .m(0, 4)
      .p(0, 10)
      .ta('center')
      .c('white')
      .display('flex')
      .ai('center')
      .br(50)
      .o(0.2)
      .transition('opacity 0.5s')
  , {
    style: b.o(count > 0 && 1).style
  },
    count,
    count > 0 && icon({
      size: 14,
      onclick: e => {
        e.stopPropagation()
        onclick(e)
      },
      class: b
        .p(3)
        .ml(4)
        .mr(-8)
        .br(20)
        .cursor('pointer')
        .transition('opacity 0.3s')
        .$hover(b
          .transform('scale')
          .bc('rgba(255,255,255,0.25)')
        ).class
    }, closeIcon)
  )
}
