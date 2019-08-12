import React from 'react'

import PageLayout from '@layouts/page'
import Button from '@components/button'

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
          <input type='area' name='privateKey' placeholder='Existing account secret key' />
        </label>
        <Button type='submit' isLoading={this.props.app.isPending}>Load</Button>
      </form>
    )

    return (
      <PageLayout title='Load Existing Account' body={body} />
    )
  }
}
