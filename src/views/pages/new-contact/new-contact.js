import React from 'react'
import { connect } from 'react-redux'

import { parseQueryString } from '@core/utils'
import { contactlistActions } from '@core/contactlists'
import PageLayout from '@layouts/page'
import Button from '@components/button'

import './new-contact.styl'

export class NewContactPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit (event) {
    // TODO: validation
    const data = {
      alias: event.target.alias.value,
      address: event.target.address.value
    }
    const { app } = this.props

    if (data.address && data.alias) {
      this.props.addContact(app.address, data)
    }

    event.preventDefault()
  }

  render () {
    const { logId } = this.props.match.params
    const { alias, haveContact } = parseQueryString(this.props.location.search)

    const body = (
      <form id='new-contact' onSubmit={this.handleSubmit}>
        <label>
          Alias
          <input type='text' name='alias' defaultValue={alias} placeholder='Contact Nickname' />
        </label>
        <label>
          Address
          <input type='text' name='address' defaultValue={logId} placeholder='/orbitdb/Qm.../record' disabled={!!haveContact} />
        </label>
        <Button type='submit' isLoading={this.props.isUpdating}>{haveContact ? 'Save' : 'Connect'}</Button>
      </form>
    )

    return (
      <PageLayout title={haveContact ? 'Edit Contact' : 'New Contact'} body={body} />
    )
  }
}

const mapDispatchToProps = {
  addContact: contactlistActions.addContact
}

export default connect(
  null,
  mapDispatchToProps
)(NewContactPage)
