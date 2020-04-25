import React from 'react'
import { connect } from 'react-redux'

import { listensActions } from '@core/listens'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'

export class ListensPage extends React.Component {
  constructor (props) {
    super(props)
    this.props.loadListens()
  }

  render () {
    const { loadNextListens } = this.props
    const body = <Tracklist hideTaglist hideSearch loadNext={loadNextListens} />
    return (
      <PageLayout
        title='Listening History'
        body={body}
        scroll />
    )
  }
}

const mapDispatchToProps = {
  loadNextListens: listensActions.loadNextListens,
  loadListens: listensActions.loadListens
}

export default connect(
  null,
  mapDispatchToProps
)(ListensPage)
