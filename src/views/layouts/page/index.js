import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getPlayerTrack } from '@core/player'

import Page from './page'

const mapStateToProps = createSelector(
  getPlayerTrack,
  (track) => ({ playerOpen: !!track })
)

export default connect(
  mapStateToProps
)(Page)
