import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getImporterProgress } from '@core/importer'

import ImporterProgress from './importer-progress'

const mapStateToProps = createSelector(
  getImporterProgress,
  (progress) => ({ progress })
)

export default connect(
  mapStateToProps
)(ImporterProgress)
