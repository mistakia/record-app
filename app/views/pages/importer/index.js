import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { importerActions, getImporterFiles } from '@core/importer'
import { contextMenuActions } from '@core/context-menu'
import { tracklistActions } from '@core/tracklists'

import ImporterPage from './importer'

const mapStateToProps = createSelector(
  getApp,
  getImporterFiles,
  (app, files) => ({ app, files })
)

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack,
  importerAdd: importerActions.add,
  showContext: contextMenuActions.show
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ImporterPage)
