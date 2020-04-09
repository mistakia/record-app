import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { aboutActions, getAboutIsUpdating } from '@core/about'
import { contactActions, getContactMe } from '@core/contacts'

import EditAboutPage from './edit-about'

const mapStateToProps = createSelector(
  getContactMe,
  getApp,
  getAboutIsUpdating,
  (contact, app, isUpdating) => ({ contact, app, isUpdating })
)

const mapDispatchToProps = {
  loadContact: contactActions.loadContact,
  setAbout: aboutActions.setAbout
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditAboutPage)
