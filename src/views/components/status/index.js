import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getAllPeers } from '@core/logs'

import Status from './status'

const mapStateToProps = createSelector(
  getAllPeers,
  (peers) => ({ peers })
)

export default connect(
  mapStateToProps
)(Status)
