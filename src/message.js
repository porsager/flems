import m from 'mithril'

export default {
  listen: (model, actions) => {
    window.flemsMessage = e => {
      if (e.data.name && e.data.flems !== model.id)
        return

      if (e.data.name === 'error')
        actions.error(e.data.content)
      else if (e.data.name === 'loaded')
        actions.loaded()
      else if (e.data.name === 'resize')
        actions.resizing()
      else if (e.data.name === 'console')
        actions.consoleOutput(e.data.content)

      m.redraw()
    }
  }
}
