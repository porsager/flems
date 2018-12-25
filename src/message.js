import m from 'mithril'

export default {
  listen: (model, actions) => {
    const handlers = {
      loaded: actions.loaded,
      console: actions.consoleOutput,
      resize: actions.resizing,
      scroll: actions.scroll
    }

    window.addEventListener('message', ({ data }) => {
      if (data.flems !== model.id || !(data.name in handlers))
        return

      handlers[data.name](data.content)
      m.redraw()
    })
  }
}
