import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  contactlistActions,
  getAllContactlist
} from '@core/contactlists'
import { getHelp, helpActions } from '@core/help'
import { getAllContacts } from '@core/contacts'

import render from './explore'

class ExplorePage extends React.Component {
  componentWillMount () {
    this._load()
  }

  _load () {
    this.props.loadPeerContacts()
    this.props.loadAllContacts()
  }

  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getAllContacts,
  getAllContactlist,
  getHelp,
  (contacts, allContactlist, help) => ({
    contacts,
    allContactlist,
    isHomeHelpVisible: help.isHomeHelpVisible
  })
)

const mapDispatchToProps = {
  loadAllContacts: contactlistActions.loadAllContacts,
  loadPeerContacts: contactlistActions.loadPeerContacts,
  toggleHomeHelp: helpActions.toggleHomeHelp
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExplorePage)
