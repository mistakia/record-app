import React from 'react'
import hashicon from 'hashicon'
import queryString from 'query-string'
import Button from '@material-ui/core/Button'

import PageLayout from '@layouts/page'
import CopyText from '@components/copy-text'

import './link-log.styl'

export default class LinkLogPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit (event) {
    const data = {
      alias: event.target.alias.value,
      linkAddress: this.props.match.params.address
    }
    const { app } = this.props

    if (!data.linkAddress && event.target.address) {
      data.linkAddress = event.target.address.value
    }

    if (data.linkAddress) {
      this.props.linkLog(app.address, data)
    }

    event.preventDefault()
  }

  render () {
    const { address } = this.props.match.params
    const { alias, isLinked } = queryString.parse(this.props.location.search)

    const addressIcon = address ? hashicon(address, 40) : null

    const body = (
      <form id='link-log' onSubmit={this.handleSubmit}>
        <label>
          Alias
          <input type='text' name='alias' defaultValue={alias} placeholder='Library Nickname' />
        </label>
        { address
          ? <CopyText text={address}>
            <label>Library Address</label>
            <img src={addressIcon && addressIcon.toDataURL()} />
            <small>{address}</small>
          </CopyText>
          : <label>
            Address
            <input type='text' name='address' defaultValue={address} placeholder='/orbitdb/Qm.../record' disabled={!!isLinked} required />
          </label>
        }
        <Button type='submit' variant='outlined'>{isLinked ? 'Save' : 'Link'}</Button>
        {<label>Note: linking a library adds it to your library, connects to it and saves the data.</label>}
      </form>
    )

    return (
      <PageLayout title={isLinked ? 'Edit Library' : 'Link Library'} body={body} />
    )
  }
}
