import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentContactlist,
  getContactsForCurrentContactlist
} from '@core/contactlists'

import Contactlist from './contactlist'

const mapStateToProps = createSelector(
  getCurrentContactlist,
  getContactsForCurrentContactlist,
  (contactlist, contacts) => ({
    displayLoadingIndicator: contactlist.isPending,
    contacts
  })
)

export default connect(mapStateToProps, null)(Contactlist)
