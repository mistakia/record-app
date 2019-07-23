import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getReplicationProgress } from '@core/contacts'

import render from './replication-progress'

const ReplicationProgress = ({ replicationProgress }) => {
  const { progress, total } = replicationProgress
  const progressPercent = Math.floor(progress / total * 100)
  if (!progressPercent || progressPercent === 100) {
    return null
  }

  return render({ progressPercent })
}

const mapStateToProps = createSelector(
  getReplicationProgress,
  (replicationProgress) => ({ replicationProgress })
)

export default connect(
  mapStateToProps
)(ReplicationProgress)
