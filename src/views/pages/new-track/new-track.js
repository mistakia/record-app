import React from 'react'
import { connect } from 'react-redux'

import Button from '@components/button'
import { tracklistActions } from '@core/tracklists'
import PageLayout from '@layouts/page'
import Heading from '@components/heading'

import './new-track.styl'

const { dialog } = window.require('electron').remote

export class NewTrackPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  showDialog (event) {
    dialog.showOpenDialog({
      title: 'Add Track(s)',
      properties: ['openFile', 'openDirectory'],
      message: 'Select a file or folder'
    }, (filepaths) => {
      if (!filepaths || !filepaths.length) return

      const file = filepaths[0]
      if (file) {
        this.props.addTrack({ file })
      }
    })
  }

  handleSubmit (event) {
    const url = event.target.url.value

    if (url) {
      this.props.addTrack({ url })
    }

    event.preventDefault()
  }

  render () {
    const head = (
      <h1>Add Track</h1>
    )

    const body = (
      <div id='new-track'>
        <Button onClick={this.showDialog.bind(this)} className='add-track-file'>Select From Computer</Button>
        <Heading title='or' center />
        <form onSubmit={this.handleSubmit.bind(this)}>
          <label>
            <input type='text' name='url' placeholder='Paste URL' />
          </label>
          <input className='button' type='submit' value='Submit' />
        </form>
      </div>
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
