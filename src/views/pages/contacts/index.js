import React from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'

import { contactlistActions } from '@core/contactlists'
import { profileActions } from '@core/profiles'

import render from './contacts'

class ContactsPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  componentDidUpdate (prevProps) {
    const { logId } = this.props.match.params
    if (prevProps.match.params.logId !== logId) {
      this._load()
    }
  }

  _load () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadContacts(`/${logId}`)
    this.props.loadProfile(`/${logId}`)
  }

  render () {
    return render.call(this)
  }
}

const mapDispatchToProps = {
  loadContacts: contactlistActions.loadContacts,
  loadProfile: profileActions.loadProfile
}

export default connect(
  null,
  mapDispatchToProps
)(ContactsPage)
