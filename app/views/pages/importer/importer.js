import React from 'react'
import Button from '@material-ui/core/Button'

import PageLayout from '@layouts/page'

import './importer.styl'

const { dialog } = require('electron').remote

export class ImporterPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  async showDialog () {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Add Track(s)',
      properties: ['openFile', 'openDirectory', 'multiSelections'],
      message: 'Select a file or folder'
    })
    if (!filePaths || !filePaths.length) return

    const files = filePaths
    if (files) {
      this.props.importerAdd(this.props.address, { files })
    }
  }

  async showPrompt () {
    this.props.showContext({ id: 'url' })
  }

  handleSubmit (event) {
    const url = event.target.url.value

    if (url) {
      this.props.addTrack(this.props.address, { url })
    }

    event.preventDefault()
  }

  render () {
    const { files } = this.props

    const items = files.map((i, index) => (
      <article key={index}>
        <div>{i.file}</div>
        { i.error && <small>{i.error.message}</small> }
      </article>
    ))

    const body = (
      <div id='importer'>
        <div className='importer-files'>
          <div className='list'>
            <div className='list__body'>
              { items.length
                ? items
                : <div className='list__body-empty'>Select files to import</div>
              }
            </div>
          </div>
        </div>
        <div className='importer-actions'>
          <Button onClick={this.showDialog.bind(this)}>Select Files</Button>
          <Button onClick={this.showPrompt.bind(this)}>Paste url</Button>
        </div>
      </div>
    )

    return (
      <PageLayout body={body} />
    )
  }
}

export default ImporterPage
