import m from 'mithril'

export default {
  listen: (model, actions) => {
    window.addEventListener('message', ({ data }) => {
      if (data.name && data.flems !== model.id)
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
