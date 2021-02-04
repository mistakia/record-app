import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { appActions, getApp } from '@core/app'
import { getPlayer } from '@core/player'

import App from './app'

App.propTypes = {
  children: PropTypes.element
}

const mapStateToProps = createSelector(
  getApp,
  getPlayer,
  (app, player) => ({
    app,
    playerOpen: player.trackId || player.queue.size
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
