import { Component } from 'react'
import PropTypes from 'prop-types'

import Render from './Render'

export default class App extends Component {
  render() {
    return Render.call(this, this.props, this.state)
  }
}

App.propTypes = {
  children: PropTypes.element
}
