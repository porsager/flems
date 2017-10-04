import m from 'mithril'
import b from 'bss'

import input from './input'

import icon from '../components/icon'
import tooltip from '../components/tooltip'
import arrowIcon from '../icons/arrow.svg'

export default (model, actions) =>
  m('.console' + b
      .bs('0 0 8px rgba(0,0,0,.2)')
      .position('relative')
      .maxHeight(32)
      .zi(40)
      .d('flex')
      .transition('max-height 0.3s')
      .fd('column')
      .background('rgb(246,246,246)')
  , {
    style: b.maxHeight(model.state.console === true && '50%').style
  },
    m('div'
      + b.d('flex').c('#777').flexShrink(0)
    , {
      onclick: () => actions.toggleConsole()
    },
      m('span'
        + b.fs(12).tt('uppercase').p('8px 10px')
      ,
        m('span' + b.mr(4), 'Console'),
        bubble('#d82c2c', model.console.errors()),
        bubble('gray', model.console.infos())
      ),
      m('div' + b.ml('auto').rel,
        icon({
          size: 32,
          style:
            b.transform(model.state.console === true && 'rotate(180deg)').style,
          class: b
            .p(8)
            .background('inherit')
            .cursor('pointer')
            .transition('max-height 0.3s')
            .class
        }, arrowIcon),
        tooltip(model.state.console === true ? 'Hide console' : 'Show console')
      )
    ),
    m('.scroll'
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
      onupdate: ({ state, dom }) => {
        if (model.console.manualScroll)
          return

        model.ignoreScroll = true
        dom.lastChild && dom.lastChild.scrollIntoView(false)
      }
    },
      model.console.output.slice(-200).map(log =>
        m('div' +
          b.d('flex')
          .ff('Source Code Pro, monospace')
          .alignItems('center')
          .p(2, 10)
          .minHeight(22)
          .fs(12).borderBottom('1px solid #dedede')
          .c('#555')
          .whiteSpace('pre-wrap')
          .alignItems('center')
        , {
          onclick: () => log.expand = !log.expand,
          title: log.date,
          style: b
            .c(log.type === 'error' && 'red')
            .style
        }, [
          m('div' + b.flexGrow(1), log.content),
          log.stack && m('div' + b.ta('right').flexShrink(0).overflow('hidden'), {
            style: b.maxHeight(!log.expand && log.type !== 'error' && 18).style
          }, log.stack.map(s =>
            m('div', [
              (s.function || '') + ' at ',
              m('a' + (s.file ? b.textDecoration('underline').cursor('pointer') : ''), {
                onclick: e => {
                  e.stopPropagation()
                  s.select && actions.select(s.select, s)
                }
              }, (s.file || 0) + ':' + (s.line || 0) + ':' + (s.column || 0))
            ])
          ))
        ])
      )
    ),
    input(model, actions)
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
      .transition('all 0.5s')
  , {
    style: b.o(count > 0 && 1).style
  },
    count
  )
}
