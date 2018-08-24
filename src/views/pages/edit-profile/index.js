import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { profileActions, getContactForMyProfile } from '@core/profiles'

import EditProfilePage from './edit-profile'

const mapStateToProps = createSelector(
  getContactForMyProfile,
  getApp,
  (contact, app) => ({ contact, app })
)

const mapDispatchToProps = {
  loadProfile: profileActions.loadProfile,
  setProfile: profileActions.setProfile
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditProfilePage)
