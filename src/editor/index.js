import editor from './editor'
import tabs from './tabs'
import collapsed from '../components/collapsed'
import editIcon from '../icons/edit.svg'
import handle from './handle'

export default (model, actions) =>
  [
    (model.vertical() && model.editor
      ? model.editor.offsetHeight <= model.toolbar()
      : model.state.middle < 3
    ) && collapsed(editIcon, actions.resetSize),
    model.state.toolbar && tabs(model, actions),
    editor(model, actions),
    model.state.resizeable && handle(model, actions)
  ]
