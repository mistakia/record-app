import React from 'react'

import Button from '@components/button'
import PageLayout from '@layouts/page'

import './edit-about.styl'

export default class EditAboutPage extends React.Component {
  constructor (props) {
    super(props)

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentWillMount () {
    const { app } = this.props
    this.props.loadContact(app.address)
  }

  handleSubmit (event) {
    const data = {
      name: event.target.name.value,
      location: event.target.location.value,
      bio: event.target.bio.value
    }

    this.props.setAbout(data)

    event.preventDefault()
  }

  render () {
    const { contact } = this.props

    if (!contact) return null

    const body = (
      <form id='edit-about' onSubmit={this.handleSubmit}>
        <label>
          Name
          <input
            type='text'
            name='name'
            defaultValue={contact.name}
            placeholder='Name' />
        </label>
        <label>
          Location
          <input
            type='text'
            name='location'
            defaultValue={contact.location}
            placeholder='Location' />
        </label>
        <label>
          Bio
          <textarea
            name='bio'
            defaultValue={contact.bio}
            placeholder='Bio' />
        </label>
        <Button type='submit' isLoading={this.props.isUpdating}>Save</Button>
      </form>
    )

    return (
      <PageLayout title='Edit Profile' body={body} />
    )
  }
}
