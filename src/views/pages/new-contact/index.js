import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { contactlistActions } from '@core/contactlists'

import NewContactPage from './new-contact'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({app})
)

const mapDispatchToProps = {
  addContact: contactlistActions.addContact
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewContactPage)
