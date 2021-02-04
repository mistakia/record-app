import React from 'react'
import Button from '@material-ui/core/Button'
import CircularProgress from '@material-ui/core/CircularProgress'

import PageLayout from '@layouts/page'

import './set-identity.styl'

export default class SetIdentityPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit (event) {
    event.preventDefault()

    const pk = event.target.privateKey.value

    if (pk) {
      this.props.setIdentity(pk)
    }
  }

  render () {
    const body = (
      <form id='set-identity' onSubmit={this.handleSubmit}>
        <label>
          Secret Key
          <input type='area' name='privateKey' placeholder='Existing account secret key' required />
        </label>
        <Button type='submit' disabled={this.props.app.isPending}>
          {this.props.app.isPending ? <CircularProgress size={24} /> : 'Load'}
        </Button>
      </form>
    )

    return (
      <PageLayout title='Load Existing Account' body={body} />
    )
  }
}
