import React from 'react'
import { connect } from 'react-redux'

import { tracklistActions } from '@core/tracklists'
import PageLayout from '@layouts/page'

export class NewTrackPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit (event) {
    const data = {
      url: event.target.url.value,
      title: event.target.title.value
    }

    if (data.url && data.title) {
      this.props.addTrack('me', data)
    }

    event.preventDefault()
  }

  render () {
    const head = (
      <h1>Add Track</h1>
    )

    const body = (
      <form onSubmit={this.handleSubmit}>
        <label>
          Title
          <input type='text' name='title' placeholder='Track title' />
        </label>
        <label>
          Url
          <input type='text' name='url' placeholder='Track url' />
        </label>
        <input className='button' type='submit' value='Submit' />
      </form>
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack
}

export default connect(
  null,
  mapDispatchToProps
)(NewTrackPage)
