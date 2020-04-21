import React from 'react'
import { connect } from 'react-redux'
import hashicon from 'hashicon'
import queryString from 'query-string'

import { loglistActions } from '@core/loglists'
import PageLayout from '@layouts/page'
import Button from '@components/button'
import CopyText from '@components/copy-text'

import './link-log.styl'

export class LinkLogPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit (event) {
    const data = {
      alias: event.target.alias.value,
      linkAddress: this.props.match.params.logAddress
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
    const { logAddress } = this.props.match.params
    const { alias, isLinked } = queryString.parse(this.props.location.search)

    const addressIcon = logAddress ? hashicon(logAddress, 40) : null

    const body = (
      <form id='link-log' onSubmit={this.handleSubmit}>
        <label>
          Alias
          <input type='text' name='alias' defaultValue={alias} placeholder='Library Nickname' />
        </label>
        { logAddress
          ? <CopyText text={logAddress}>
            <label>Library Address</label>
            <img src={addressIcon && addressIcon.toDataURL()} />
            <small>{logAddress}</small>
          </CopyText>
          : <label>
            Address
            <input type='text' name='address' defaultValue={logAddress} placeholder='/orbitdb/Qm.../record' disabled={!!isLinked} required />
          </label>
        }
        <Button type='submit' isLoading={this.props.isUpdating}>{isLinked ? 'Save' : 'Link'}</Button>
        {<label>Note: linking a library adds it to your library, synchronizes with it and saves the data.</label>}
      </form>
    )

    return (
      <PageLayout title={isLinked ? 'Edit Library' : 'Link Library'} body={body} />
    )
  }
}

const mapDispatchToProps = {
  linkLog: loglistActions.linkLog
}

export default connect(
  null,
  mapDispatchToProps
)(LinkLogPage)
