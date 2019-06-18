import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { contactActions, getContactMe } from '@core/contacts'
import { aboutActions } from '@core/about'

import EditAboutPage from './edit-about'

const mapStateToProps = createSelector(
  getContactMe,
  getApp,
  (contact, app) => ({ contact, app })
)

const mapDispatchToProps = {
  loadContact: contactActions.loadContact,
  setAbout: aboutActions.setAbout
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditAboutPage)
