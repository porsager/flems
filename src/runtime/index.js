import iframe from './iframe'
import size from './size'
import collapsed from '../components/collapsed'
import browserIcon from '../icons/browser.svg'
import toolbar from './toolbar'
import loading from './loading'

export default (model, actions) =>
  [
    model.state.toolbar && toolbar(model, actions),
    iframe(model, actions),
    model.state.middle > 97 && collapsed(browserIcon, actions.resetSize),
    loading(model),
    model.resizing && model.state.middle <= 98 && size(model, actions)
  ]
