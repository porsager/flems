import m from 'mithril'

export default {
  listen: (model, actions) => {
    window.addEventListener('message', ({ data }) => {
      if (data.flems !== model.id || !(data.name in handlers))
        return

      if (data.name === 'loaded')
        actions.loaded()
      else if (data.name === 'console')
        actions.consoleOutput(data.content)
      else if (data.name === 'resize')
        actions.resizing()

      m.redraw()
    })
  }
}
