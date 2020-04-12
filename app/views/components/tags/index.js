import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { contextMenuActions } from '@core/context-menu'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tags from './tags'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

const mapDispatchToProps = {
  removeTag: taglistActions.removeTag,
  showContext: contextMenuActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(Tags)
