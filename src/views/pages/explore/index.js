import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  contactlistActions,
  getPeerContactlist,
  getAllContactlist,
  getContactsForPeerContactlist,
  getContactsForAllContactlist
} from '@core/contactlists'

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
  getPeerContactlist,
  getAllContactlist,
  getContactsForPeerContactlist,
  getContactsForAllContactlist,
  (peerContactlist, allContactlist, peerContacts, allContacts) => ({
    peerContactlist,
    allContactlist,
    peerContacts,
    allContacts
  })
)

const mapDispatchToProps = {
  loadAllContacts: contactlistActions.loadAllContacts,
  loadPeerContacts: contactlistActions.loadPeerContacts
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExplorePage)
