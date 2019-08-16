import React from 'react'
import { connect } from 'react-redux'
import hashicon from 'hashicon'

import { parseQueryString } from '@core/utils'
import { contactlistActions } from '@core/contactlists'
import PageLayout from '@layouts/page'
import Button from '@components/button'
import CopyText from '@components/copy-text'

import './new-contact.styl'

export class NewContactPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit (event) {
    const data = {
      alias: event.target.alias.value,
      address: this.props.match.params.logId
    }
    const { app } = this.props

    if (!data.address && event.target.address) {
      data.address = event.target.address.value
    }

    if (data.address) {
      this.props.addContact(app.address, data)
    }

    event.preventDefault()
  }

  render () {
    const { logId } = this.props.match.params
    const { alias, haveContact } = parseQueryString(this.props.location.search)

    const addressIcon = logId ? hashicon(logId, 40) : null

    const body = (
      <form id='new-contact' onSubmit={this.handleSubmit}>
        <label>
          Alias
          <input type='text' name='alias' defaultValue={alias} placeholder='Contact Nickname' />
        </label>
        { logId
          ? <CopyText text={logId}>
            <label>Library Address</label>
            <img src={addressIcon && addressIcon.toDataURL()} />
            <small>{logId}</small>
          </CopyText>
          : <label>
            Address
            <input type='text' name='address' defaultValue={logId} placeholder='/orbitdb/Qm.../record' disabled={!!haveContact} required />
          </label>
        }
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
