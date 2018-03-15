import React from 'react'
import { connect } from 'react-redux'

import { dbActions } from '@core/db'

class LoadDB extends React.Component {

  constructor(props) {
    super(props)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit(event) {
    event.preventDefault()
    const value = this.input.value.trim()
    console.log(value)
    this.input.blur()
    this.props.load(value)
  }

  render = () => (
    <form onSubmit={this.handleSubmit} noValidate>
      <input
	  autoComplete='off'
	  placeholder='/orbitdb/xxxx/'
	  ref={e => this.input = e}
	  tabIndex='0'
	  type='text'
      />
    </form>
  )
}

const mapDispatchToProps = {
  load: dbActions.load
}

export default connect(
  null,
  mapDispatchToProps
)(LoadDB)
