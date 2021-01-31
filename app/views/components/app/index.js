import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { appActions, getApp } from '@core/app'
import { getPlayerTrack } from '@core/player'

import App from './app'

App.propTypes = {
  children: PropTypes.element
}

const mapStateToProps = createSelector(
  getApp,
  getPlayerTrack,
  (app, track) => ({
    app,
    playerOpen: !!track
  })
)

const mapDispatchToProps = dispatch => ({
  init: message => dispatch(appActions.initApp(message)),
  dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App)
