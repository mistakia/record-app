import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  contactlistActions,
  getPeerContactlist,
  getSuggestedContactlist,
  getContactsForPeerContactlist,
  getContactsForSuggestedContactlist
} from '@core/contactlists'

import render from './explore'

class ExplorePage extends React.Component {
  componentWillMount () {
    this._load()
  }

  _load () {
    this.props.loadPeers()
    this.props.loadSuggested()
  }

  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getPeerContactlist,
  getSuggestedContactlist,
  getContactsForPeerContactlist,
  getContactsForSuggestedContactlist,
  (peerContactlist, suggestedContactlist, peerContacts, suggestedContacts) => ({
    peerContactlist,
    suggestedContactlist,
    peerContacts,
    suggestedContacts
  })
)

const mapDispatchToProps = {
  loadSuggested: contactlistActions.loadSuggested,
  loadPeers: contactlistActions.loadPeers
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExplorePage)
