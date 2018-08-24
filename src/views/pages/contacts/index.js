import React from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'

import { getApp } from '@core/app'
import { contactlistActions } from '@core/contactlists'
import { profileActions } from '@core/profiles'
import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'
import Profile from '@components/profile'

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
    const { logId } = this.props.match.params
    this.props.loadContacts(logId)
    this.props.loadProfile(logId)
  }

  render () {
    const { logId } = this.props.match.params
    const { app } = this.props

    const head = <Profile />

    const showAdd = logId === app.address
    const body = <Contactlist showAdd={showAdd} />

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  (app) => ({app})
)

const mapDispatchToProps = {
  loadContacts: contactlistActions.loadContacts,
  loadProfile: profileActions.loadProfile
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContactsPage)
