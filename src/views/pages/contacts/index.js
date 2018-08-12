import React from 'react'
import { connect } from 'react-redux'

import { contactlistActions } from '@core/contactlists'

import render from './contacts'

class ContactsPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  componentDidUpdate () {
    this._load()
  }

  _load () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadContacts(`/${logId}`)
  }

  render () {
    return render.call(this)
  }
}

const mapDispatchToProps = {
  loadContacts: contactlistActions.loadContacts
}

export default connect(
  null,
  mapDispatchToProps
)(ContactsPage)
