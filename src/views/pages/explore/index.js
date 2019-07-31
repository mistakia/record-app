import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  contactlistActions,
  getAllContactlist
} from '@core/contactlists'

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
  (contacts, allContactlist) => ({ contacts, allContactlist })
)

const mapDispatchToProps = {
  loadAllContacts: contactlistActions.loadAllContacts,
  loadPeerContacts: contactlistActions.loadPeerContacts
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExplorePage)
