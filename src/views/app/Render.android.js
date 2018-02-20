import Render from './Render.native'

export default function () {
  return Render.call(this, this.props, this.state)
}
